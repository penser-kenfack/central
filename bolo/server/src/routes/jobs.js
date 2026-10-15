import { Router } from 'express';
import { z } from 'zod';
import { one, query, tx } from '../db/index.js';
import { ah, HttpError, notFound } from '../middleware/errors.js';
import { requireRole } from '../middleware/auth.js';
import { assertCanManageJob, closeJob } from '../services/pipeline.js';
import { audit } from '../services/audit.js';

const r = Router();

const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 150);

const JobBody = z.object({
  title: z.string().trim().min(3).max(160),
  department: z.string().trim().max(80).optional().nullable(),
  location: z.string().trim().min(2).max(80),
  contract_type: z.enum(['CDI', 'CDD', 'Stage', 'Freelance']),
  description: z.string().trim().min(20).max(8000),
  requirements: z.string().trim().max(8000).optional().nullable(),
  skills: z.array(z.string().trim().min(1).max(40)).max(15).default([]),
  openings: z.number().int().min(1).max(50).default(1),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  recruiter_ids: z.array(z.string().uuid()).max(10).optional(),
});

// list visible to the user, with counts per job
r.get('/', ah(async (req, res) => {
  const { rows } = await query(
    `SELECT j.id, j.title, j.department, j.location, j.contract_type, j.status, j.deadline, j.openings, j.published_at, j.slug,
            count(a.id)::int AS applications,
            count(a.id) FILTER (WHERE a.created_at > now() - interval '7 days')::int AS new_this_week,
            count(a.id) FILTER (WHERE s.kind = 'active' AND s.sla_days IS NOT NULL AND a.stage_entered_at < now() - make_interval(days => s.sla_days))::int AS overdue,
            count(a.id) FILTER (WHERE s.kind = 'hired')::int AS hired
       FROM jobs j LEFT JOIN applications a ON a.job_id = j.id LEFT JOIN stages s ON s.id = a.stage_id
      WHERE j.company_id = $1 AND ($2 IN ('admin','hr') OR EXISTS (SELECT 1 FROM job_recruiters jr WHERE jr.job_id = j.id AND jr.user_id = $3))
      GROUP BY j.id ORDER BY (j.status = 'open') DESC, j.created_at DESC`,
    [req.user.company_id, req.user.role, req.user.id]);
  res.json(rows);
}));

r.post('/', requireRole('admin', 'hr'), ah(async (req, res) => {
  const b = JobBody.parse(req.body);
  const job = await tx(async (c) => {
    const base = slugify(b.title);
    const { rows: [{ n }] } = await c.query('SELECT count(*)::int AS n FROM jobs WHERE company_id = $1 AND slug LIKE $2', [req.user.company_id, base + '%']);
    const { rows: [j] } = await c.query(
      `INSERT INTO jobs (company_id, title, slug, department, location, contract_type, description, requirements, skills, openings, deadline, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.user.company_id, b.title, n ? `${base}-${n + 1}` : base, b.department ?? null, b.location, b.contract_type, b.description,
        b.requirements ?? null, b.skills, b.openings, b.deadline ?? null, req.user.id]);
    // the company's default stages are copied into the new job; they can then be changed for this job only
    await c.query(
      `INSERT INTO stages (job_id, name, position, kind, sla_days, email_key)
       SELECT $1, name, position, kind, sla_days, email_key FROM stage_templates WHERE company_id = $2 ORDER BY position`,
      [j.id, req.user.company_id]);
    for (const uid of b.recruiter_ids ?? []) await c.query(
      'INSERT INTO job_recruiters (job_id, user_id) SELECT $1, id FROM users WHERE id = $2 AND company_id = $3', [j.id, uid, req.user.company_id]);
    await audit(req, 'job.create', 'job', j.id, b.title, c);
    return j;
  });
  res.status(201).json(job);
}));

r.get('/:id', ah(async (req, res) => {
  await assertCanManageJob({ query }, req.user, req.params.id);
  const job = await one('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
  const { rows: stages } = await query('SELECT id, name, position, kind, sla_days, email_key FROM stages WHERE job_id = $1 ORDER BY position', [job.id]);
  const { rows: recruiters } = await query('SELECT u.id, u.full_name FROM job_recruiters jr JOIN users u ON u.id = jr.user_id WHERE jr.job_id = $1', [job.id]);
  res.json({ ...job, stages, recruiters });
}));

r.patch('/:id', requireRole('admin', 'hr'), ah(async (req, res) => {
  const b = JobBody.partial().parse(req.body);
  await assertCanManageJob({ query }, req.user, req.params.id);
  const cols = ['title', 'department', 'location', 'contract_type', 'description', 'requirements', 'skills', 'openings', 'deadline'].filter((k) => k in b);
  if (cols.length) {
    await query(`UPDATE jobs SET ${cols.map((k, i) => `${k} = $${i + 2}`).join(', ')} WHERE id = $1`, [req.params.id, ...cols.map((k) => b[k])]);
  }
  if (b.recruiter_ids) await tx(async (c) => {
    await c.query('DELETE FROM job_recruiters WHERE job_id = $1', [req.params.id]);
    for (const uid of b.recruiter_ids) await c.query(
      'INSERT INTO job_recruiters (job_id, user_id) SELECT $1, id FROM users WHERE id = $2 AND company_id = $3', [req.params.id, uid, req.user.company_id]);
  });
  res.json(await one('SELECT * FROM jobs WHERE id = $1', [req.params.id]));
}));

r.post('/:id/publish', requireRole('admin', 'hr'), ah(async (req, res) => {
  await assertCanManageJob({ query }, req.user, req.params.id);
  const job = await one("UPDATE jobs SET status = 'open', published_at = coalesce(published_at, now()), closed_at = NULL WHERE id = $1 RETURNING *", [req.params.id]);
  await audit(req, 'job.publish', 'job', job.id, job.title);
  res.json(job);
}));

r.post('/:id/close', requireRole('admin', 'hr'), ah(async (req, res) => {
  const { answer_remaining } = z.object({ answer_remaining: z.boolean().default(true) }).parse(req.body ?? {});
  const out = await tx((c) => closeJob(c, req.user, req.params.id, { answerRemaining: answer_remaining }));
  await audit(req, 'job.close', 'job', req.params.id, `${out.answered} candidate(s) answered`);
  res.json(out);
}));

// Replaces the stages of a job. Stages keep their id when sent back; a stage
// still holding applications cannot be removed (BR5).
const StagesBody = z.array(z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(60),
  kind: z.enum(['active', 'hired', 'rejected']).default('active'),
  sla_days: z.number().int().min(1).max(60).nullable().optional(),
  email_key: z.enum(['received', 'interview', 'test', 'offer', 'rejected', 'hired']).nullable().optional(),
})).min(3).max(12);

r.put('/:id/stages', requireRole('admin', 'hr'), ah(async (req, res) => {
  const list = StagesBody.parse(req.body);
  if (list[0].kind !== 'active') throw new HttpError(400, 'The first stage must be an active stage', 'bad_stages');
  for (const k of ['hired', 'rejected']) {
    if (list.filter((s) => s.kind === k).length !== 1) throw new HttpError(400, `Exactly one "${k}" stage is required`, 'bad_stages');
  }
  await assertCanManageJob({ query }, req.user, req.params.id);
  const stages = await tx(async (c) => {
    const { rows: current } = await c.query(
      'SELECT s.id, s.name, count(a.id)::int AS n FROM stages s LEFT JOIN applications a ON a.stage_id = s.id WHERE s.job_id = $1 GROUP BY s.id', [req.params.id]);
    const kept = new Set(list.filter((s) => s.id).map((s) => s.id));
    for (const s of current) {
      if (!kept.has(s.id) && s.n > 0) throw new HttpError(409, `The stage "${s.name}" still holds ${s.n} application(s); move them first`, 'stage_not_empty');
    }
    for (const s of current) if (!kept.has(s.id)) await c.query('DELETE FROM stages WHERE id = $1', [s.id]);
    for (const [i, s] of list.entries()) {
      if (s.id && current.some((x) => x.id === s.id)) {
        await c.query('UPDATE stages SET name=$2, position=$3, kind=$4, sla_days=$5, email_key=$6 WHERE id=$1', [s.id, s.name, i + 1, s.kind, s.sla_days ?? null, s.email_key ?? null]);
      } else {
        await c.query('INSERT INTO stages (job_id, name, position, kind, sla_days, email_key) VALUES ($1,$2,$3,$4,$5,$6)', [req.params.id, s.name, i + 1, s.kind, s.sla_days ?? null, s.email_key ?? null]);
      }
    }
    await audit(req, 'job.stages', 'job', req.params.id, list.map((s) => s.name).join(' › '), c);
    return (await c.query('SELECT id, name, position, kind, sla_days, email_key FROM stages WHERE job_id = $1 ORDER BY position', [req.params.id])).rows;
  });
  res.json(stages);
}));

// Kanban data: stages with their cards
r.get('/:id/pipeline', ah(async (req, res) => {
  await assertCanManageJob({ query }, req.user, req.params.id);
  const job = await one('SELECT id, title, status, openings, location, contract_type, deadline FROM jobs WHERE id = $1', [req.params.id]);
  const { rows: stages } = await query('SELECT id, name, position, kind, sla_days, email_key FROM stages WHERE job_id = $1 ORDER BY position', [job.id]);
  const { rows: cards } = await query(
    `SELECT a.id, a.stage_id, a.source, a.rating, a.created_at, a.stage_entered_at, a.answered_at,
            c.id AS candidate_id, c.full_name, c.city, c.language, c.experience_years, c.skills, c.headline,
            (SELECT count(*)::int FROM evaluations e WHERE e.application_id = a.id) AS evaluations,
            EXTRACT(EPOCH FROM now() - a.stage_entered_at)::int / 86400 AS days_in_stage
       FROM applications a JOIN candidates c ON c.id = a.candidate_id
      WHERE a.job_id = $1 ORDER BY a.rating DESC NULLS LAST, a.created_at`, [job.id]);
  res.json({ job, stages, cards });
}));

export default r;
