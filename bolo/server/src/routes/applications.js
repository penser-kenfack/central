import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { one, query, tx } from '../db/index.js';
import { ah, notFound } from '../middleware/errors.js';
import { config } from '../config.js';
import { assertCanManageJob, moveApplication } from '../services/pipeline.js';
import { storeCv, deleteCv } from '../services/cvVault.js';
import { ApplyBody, createApplication } from './public.js';
import { audit } from '../services/audit.js';
import { notifyTeam } from '../services/messages.js';

const r = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.cvMaxBytes, files: 1 } });

// Manual capture of an application received by WhatsApp, e-mail, on paper (walk-in) or by referral.
const CaptureBody = ApplyBody.extend({
  job_id: z.string().uuid(),
  source: z.enum(['whatsapp', 'email', 'walk_in', 'referral', 'linkedin']),
});

r.post('/', upload.single('cv'), ah(async (req, res) => {
  const data = CaptureBody.parse(req.body);
  await assertCanManageJob({ query }, req.user, data.job_id);
  const cv = await storeCv(req.file);
  try {
    const out = await tx(async (c) => {
      const result = await createApplication(c, { companyId: req.user.company_id, jobId: data.job_id, data, cv, source: data.source });
      await audit(req, 'application.capture', 'application', result.id, `source: ${data.source}`, c);
      return result;
    });
    res.status(out.duplicate ? 200 : 201).json(out);
  } catch (err) { await deleteCv(cv.storageKey); throw err; }
}));

async function loadApplication(req) {
  const a = await one(
    `SELECT a.*, j.title AS job_title, j.company_id, s.name AS stage_name, s.kind AS stage_kind,
            c.full_name, c.email, c.phone, c.city, c.headline, c.experience_years, c.skills, c.language, c.consent_at, c.anonymized_at
       FROM applications a JOIN jobs j ON j.id = a.job_id JOIN stages s ON s.id = a.stage_id JOIN candidates c ON c.id = a.candidate_id
      WHERE a.id = $1 AND j.company_id = $2`, [req.params.id, req.user.company_id]);
  if (!a) throw notFound('Application');
  await assertCanManageJob({ query }, req.user, a.job_id);
  return a;
}

r.get('/:id', ah(async (req, res) => {
  const a = await loadApplication(req);
  const [stages, history, evaluations, cvs, messages, others] = await Promise.all([
    query('SELECT id, name, position, kind FROM stages WHERE job_id = $1 ORDER BY position', [a.job_id]),
    query(`SELECT h.moved_at, h.reason, f.name AS from_stage, t.name AS to_stage, u.full_name AS by
             FROM stage_history h LEFT JOIN stages f ON f.id = h.from_stage_id LEFT JOIN stages t ON t.id = h.to_stage_id
             LEFT JOIN users u ON u.id = h.moved_by WHERE h.application_id = $1 ORDER BY h.moved_at`, [a.id]),
    query(`SELECT e.score, e.comment, e.created_at, u.full_name AS by FROM evaluations e JOIN users u ON u.id = e.user_id
            WHERE e.application_id = $1 ORDER BY e.created_at DESC`, [a.id]),
    query('SELECT id, original_name, mime, size_bytes, uploaded_at FROM cv_documents WHERE candidate_id = $1 ORDER BY uploaded_at DESC', [a.candidate_id]),
    query('SELECT channel, subject, status, send_after, sent_at, lang FROM outbox WHERE application_id = $1 ORDER BY created_at', [a.id]),
    query(`SELECT a2.id, j.title, s.name AS stage FROM applications a2 JOIN jobs j ON j.id = a2.job_id JOIN stages s ON s.id = a2.stage_id
            WHERE a2.candidate_id = $1 AND a2.id <> $2`, [a.candidate_id, a.id]),
  ]);
  res.json({ ...a, tracking_token: undefined, stages: stages.rows, history: history.rows, evaluations: evaluations.rows, cvs: cvs.rows, messages: messages.rows, otherApplications: others.rows });
}));

r.post('/:id/move', ah(async (req, res) => {
  const b = z.object({ stage_id: z.string().uuid(), reason: z.string().trim().max(300).optional() }).parse(req.body);
  const out = await tx(async (c) => {
    const updated = await moveApplication(c, req.user, { applicationId: req.params.id, toStageId: b.stage_id, reason: b.reason });
    const { rows: [s] } = await c.query('SELECT s.name, c.full_name FROM stages s, applications a JOIN candidates c ON c.id = a.candidate_id WHERE s.id = $1 AND a.id = $2', [b.stage_id, req.params.id]);
    await audit(req, 'application.move', 'application', req.params.id, `${s.full_name} → ${s.name}`, c);
    return updated;
  });
  res.json(out);
}));

r.post('/:id/evaluations', ah(async (req, res) => {
  const b = z.object({ score: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional() }).parse(req.body);
  const a = await loadApplication(req);
  await tx(async (c) => {
    await c.query('INSERT INTO evaluations (application_id, user_id, score, comment) VALUES ($1,$2,$3,$4)', [a.id, req.user.id, b.score, b.comment ?? null]);
    await c.query('UPDATE applications SET rating = (SELECT round(avg(score))::int FROM evaluations WHERE application_id = $1) WHERE id = $1', [a.id]);
    await notifyTeam(c, { companyId: a.company_id, jobId: a.job_id, type: 'evaluation', title: `${req.user.full_name} a évalué ${a.full_name} (${b.score}/5)`, link: `/candidatures/${a.id}`, exceptUserId: req.user.id });
  });
  res.status(201).json({ ok: true });
}));

export default r;
