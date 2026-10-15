// Public career page and online application. No authentication; rate limited.
import { Router } from 'express';
import crypto from 'node:crypto';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { one, query, tx } from '../db/index.js';
import { ah, HttpError, notFound } from '../middleware/errors.js';
import { config } from '../config.js';
import { storeCv, deleteCv } from '../services/cvVault.js';
import { queueCandidateMessage, notifyTeam } from '../services/messages.js';

const r = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.cvMaxBytes, files: 1, fields: 20 } });
const applyLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: config.applyLimitPerHour, standardHeaders: true, legacyHeaders: false });

r.get('/:company/jobs', ah(async (req, res) => {
  const company = await one('SELECT id, name, slug, city, sector FROM companies WHERE slug = $1', [req.params.company]);
  if (!company) throw notFound('Company');
  const { rows } = await query(
    `SELECT slug, title, department, location, contract_type, deadline, published_at FROM jobs
      WHERE company_id = $1 AND status = 'open' AND (deadline IS NULL OR deadline >= current_date)
      ORDER BY published_at DESC`, [company.id]);
  res.set('Cache-Control', 'public, max-age=60').json({ company, jobs: rows });
}));

r.get('/:company/jobs/:job', ah(async (req, res) => {
  const job = await one(
    `SELECT j.slug, j.title, j.department, j.location, j.contract_type, j.description, j.requirements, j.skills, j.deadline,
            j.published_at, c.name AS company, c.slug AS company_slug, c.city
       FROM jobs j JOIN companies c ON c.id = j.company_id
      WHERE c.slug = $1 AND j.slug = $2 AND j.status = 'open'`, [req.params.company, req.params.job]);
  if (!job) throw notFound('Job offer');
  res.set('Cache-Control', 'public, max-age=60').json(job);
}));

const phone = z.string().trim().transform((s) => s.replace(/[\s.-]/g, '')).pipe(z.string().regex(/^(\+?237)?6\d{8}$/, 'Numéro camerounais attendu (6XXXXXXXX)'))
  .transform((s) => '+237' + s.slice(-9));
export const ApplyBody = z.object({
  full_name: z.string().trim().min(3).max(120),
  phone,
  email: z.string().trim().email().max(160).optional().or(z.literal('').transform(() => undefined)),
  city: z.string().trim().max(80).optional(),
  language: z.enum(['fr', 'en']).default('fr'),
  experience_years: z.coerce.number().int().min(0).max(50).default(0),
  skills: z.string().max(400).optional().transform((s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 15) : [])),
  cover_note: z.string().trim().max(1500).optional(),
  headline: z.string().trim().max(160).optional(),
  consent: z.literal('true', { errorMap: () => ({ message: 'Le consentement est obligatoire' }) }),
});

// Creates or updates the candidate and the application. Shared with the manual capture by HR.
export async function createApplication(client, { companyId, jobId, data, cv, source }) {
  const { rows: [cand] } = await client.query(
    `INSERT INTO candidates (company_id, full_name, email, phone, city, headline, experience_years, skills, language, consent_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
     ON CONFLICT (company_id, phone) DO UPDATE SET full_name = EXCLUDED.full_name, email = coalesce(EXCLUDED.email, candidates.email),
        city = coalesce(EXCLUDED.city, candidates.city), headline = coalesce(EXCLUDED.headline, candidates.headline),
        experience_years = EXCLUDED.experience_years, skills = EXCLUDED.skills, language = EXCLUDED.language, consent_at = now(), anonymized_at = NULL
     RETURNING id`,
    [companyId, data.full_name, data.email ?? null, data.phone, data.city ?? null, data.headline ?? null, data.experience_years, data.skills, data.language]);
  if (cv) {
    await client.query(
      `INSERT INTO cv_documents (candidate_id, storage_key, original_name, mime, size_bytes, sha256, text_search)
       VALUES ($1,$2,$3,$4,$5,$6, to_tsvector('simple', $7))`,
      [cand.id, cv.storageKey, cv.originalName, cv.mime, cv.size, cv.sha256, cv.text.slice(0, 200000)]);
  }
  const existing = await client.query('SELECT id FROM applications WHERE job_id = $1 AND candidate_id = $2', [jobId, cand.id]);
  if (existing.rows[0]) return { id: existing.rows[0].id, duplicate: true, candidateId: cand.id };
  const { rows: [first] } = await client.query("SELECT id FROM stages WHERE job_id = $1 AND kind = 'active' ORDER BY position LIMIT 1", [jobId]);
  const token = crypto.randomBytes(18).toString('base64url');
  const { rows: [app] } = await client.query(
    `INSERT INTO applications (job_id, candidate_id, stage_id, source, cover_note, tracking_token)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, tracking_token`, [jobId, cand.id, first.id, source, data.cover_note ?? null, token]);
  await client.query('INSERT INTO stage_history (application_id, to_stage_id) VALUES ($1,$2)', [app.id, first.id]);
  await queueCandidateMessage(client, { companyId, applicationId: app.id, key: 'received' });
  return { id: app.id, trackingToken: app.tracking_token, duplicate: false, candidateId: cand.id };
}

r.post('/:company/jobs/:job/apply', applyLimiter, upload.single('cv'), ah(async (req, res) => {
  const data = ApplyBody.parse(req.body);
  const job = await one(
    `SELECT j.id, j.title, j.company_id FROM jobs j JOIN companies c ON c.id = j.company_id
      WHERE c.slug = $1 AND j.slug = $2 AND j.status = 'open' AND (j.deadline IS NULL OR j.deadline >= current_date)`,
    [req.params.company, req.params.job]);
  if (!job) throw notFound('Job offer');
  const cv = await storeCv(req.file);
  try {
    const result = await tx(async (client) => {
      const out = await createApplication(client, { companyId: job.company_id, jobId: job.id, data, cv, source: 'career_page' });
      if (!out.duplicate) await notifyTeam(client, { companyId: job.company_id, jobId: job.id, type: 'new_application', title: `Nouvelle candidature : ${data.full_name} – ${job.title}`, link: `/candidatures/${out.id}` });
      return out;
    });
    res.status(result.duplicate ? 200 : 201).json({ duplicate: result.duplicate, trackingToken: result.trackingToken ?? null });
  } catch (err) {
    await deleteCv(cv.storageKey);
    throw err;
  }
}));

// What the candidate sees: a simple public status, never the internal stage names or comments.
r.get('/track/:token', ah(async (req, res) => {
  const a = await one(
    `SELECT a.created_at, a.stage_entered_at, s.kind, s.position, j.title, co.name AS company, c.full_name, c.language,
            (SELECT min(position) FROM stages WHERE job_id = j.id) AS first_pos,
            (SELECT count(*) FROM outbox o WHERE o.application_id = a.id AND o.status = 'queued' AND o.send_after > now()) AS pending_answer
       FROM applications a JOIN stages s ON s.id = a.stage_id JOIN jobs j ON j.id = a.job_id
       JOIN companies co ON co.id = j.company_id JOIN candidates c ON c.id = a.candidate_id
      WHERE a.tracking_token = $1`, [req.params.token]);
  if (!a) throw notFound('Application');
  let step = a.position === a.first_pos ? 'received' : 'in_review';
  if (a.kind === 'hired') step = 'hired';
  if (a.kind === 'rejected') step = Number(a.pending_answer) > 0 ? 'in_review' : 'closed';
  res.json({ job: a.title, company: a.company, name: a.full_name, language: a.language, appliedAt: a.created_at, step });
}));

export default r;
