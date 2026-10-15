import { Router } from 'express';
import { z } from 'zod';
import { query, tx } from '../db/index.js';
import { ah, notFound } from '../middleware/errors.js';
import { requireRole } from '../middleware/auth.js';
import { deleteCv } from '../services/cvVault.js';
import { audit } from '../services/audit.js';

const r = Router();

const Filters = z.object({
  q: z.string().trim().max(120).optional(),
  job: z.string().uuid().optional(),
  stage_kind: z.enum(['active', 'hired', 'rejected']).optional(),
  source: z.enum(['career_page', 'whatsapp', 'email', 'walk_in', 'referral', 'linkedin']).optional(),
  language: z.enum(['fr', 'en']).optional(),
  min_exp: z.coerce.number().int().min(0).optional(),
  max_exp: z.coerce.number().int().min(0).optional(),
  min_rating: z.coerce.number().int().min(1).max(5).optional(),
  city: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

// Full-text search on the profile AND on the text of the CVs, with filters.
r.get('/', ah(async (req, res) => {
  const f = Filters.parse(req.query);
  const where = ['c.company_id = $1', 'c.anonymized_at IS NULL'];
  const p = [req.user.company_id];
  const add = (sql, v) => { p.push(v); where.push(sql.replaceAll('?', `$${p.length}`)); };
  let rank = '0';
  if (f.q) {
    // every word must match, as a prefix ("compta" finds "comptabilité")
    const words = f.q.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9+#]+/).filter(Boolean).map((w) => w + ':*').join(' & ');
    if (words) {
      p.push(words);
      const tq = `to_tsquery('simple', $${p.length})`;
      where.push(`(c.search @@ ${tq} OR EXISTS (SELECT 1 FROM cv_documents d WHERE d.candidate_id = c.id AND d.text_search @@ ${tq}))`);
      rank = `ts_rank(c.search, ${tq}) + coalesce((SELECT max(ts_rank(d.text_search, ${tq})) FROM cv_documents d WHERE d.candidate_id = c.id), 0)`;
    }
  }
  if (f.job) add('a.job_id = ?', f.job);
  if (f.stage_kind) add('s.kind = ?', f.stage_kind);
  if (f.source) add('a.source = ?', f.source);
  if (f.language) add('c.language = ?', f.language);
  if (f.min_exp !== undefined) add('c.experience_years >= ?', f.min_exp);
  if (f.max_exp !== undefined) add('c.experience_years <= ?', f.max_exp);
  if (f.min_rating) add('a.rating >= ?', f.min_rating);
  if (f.city) add('c.city ILIKE ?', f.city);
  if (req.user.role === 'recruiter') add('EXISTS (SELECT 1 FROM job_recruiters jr WHERE jr.job_id = a.job_id AND jr.user_id = ?)', req.user.id);
  const sql = `
    SELECT a.id AS application_id, c.id, c.full_name, c.city, c.phone, c.email, c.language, c.experience_years, c.skills, c.headline,
           a.source, a.rating, a.created_at, j.title AS job_title, s.name AS stage, s.kind AS stage_kind, ${rank} AS rank,
           count(*) OVER()::int AS total
      FROM candidates c JOIN applications a ON a.candidate_id = c.id JOIN jobs j ON j.id = a.job_id JOIN stages s ON s.id = a.stage_id
     WHERE ${where.join(' AND ')}
     ORDER BY rank DESC, a.rating DESC NULLS LAST, a.created_at DESC
     LIMIT 25 OFFSET ${(f.page - 1) * 25}`;
  const t0 = process.hrtime.bigint();
  const { rows } = await query(sql, p);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  res.json({ total: rows[0]?.total ?? 0, ms: Math.round(ms * 10) / 10, results: rows.map(({ total, rank: _r, ...x }) => x) });
}));

// Right to erasure: personal data removed, CV files deleted, statistics kept.
r.delete('/:id', requireRole('admin', 'hr'), ah(async (req, res) => {
  const keys = await tx(async (c) => {
    const { rows: [cand] } = await c.query('SELECT id FROM candidates WHERE id = $1 AND company_id = $2 AND anonymized_at IS NULL', [req.params.id, req.user.company_id]);
    if (!cand) throw notFound('Candidate');
    const { rows: docs } = await c.query('DELETE FROM cv_documents WHERE candidate_id = $1 RETURNING storage_key', [cand.id]);
    await c.query(
      `UPDATE candidates SET full_name = 'Candidat anonymisé', email = NULL, phone = 'anon-' || substr(id::text, 1, 12),
              city = NULL, headline = NULL, skills = '{}', anonymized_at = now() WHERE id = $1`, [cand.id]);
    await c.query('UPDATE applications SET cover_note = NULL WHERE candidate_id = $1', [cand.id]);
    await c.query("UPDATE outbox SET status = 'cancelled' WHERE status = 'queued' AND application_id IN (SELECT id FROM applications WHERE candidate_id = $1)", [cand.id]);
    await audit(req, 'candidate.anonymize', 'candidate', cand.id, `${docs.length} CV file(s) deleted`, c);
    return docs.map((d) => d.storage_key);
  });
  await Promise.all(keys.map(deleteCv));
  res.status(204).end();
}));

export default r;
