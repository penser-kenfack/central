import { Router } from 'express';
import { one } from '../db/index.js';
import { ah, HttpError, notFound } from '../middleware/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { readCv, signLink, verifyLink } from '../services/cvVault.js';
import { audit } from '../services/audit.js';

const r = Router();

// Returns a link valid 5 minutes for this user only. Access rules are checked here.
r.post('/:id/link', requireAuth, ah(async (req, res) => {
  const cv = await one(
    `SELECT d.id FROM cv_documents d JOIN candidates c ON c.id = d.candidate_id
      WHERE d.id = $1 AND c.company_id = $2
        AND ($3 IN ('admin','hr') OR EXISTS (SELECT 1 FROM applications a JOIN job_recruiters jr ON jr.job_id = a.job_id
                                           WHERE a.candidate_id = c.id AND jr.user_id = $4))`,
    [req.params.id, req.user.company_id, req.user.role, req.user.id]);
  if (!cv) throw notFound('CV');
  const link = signLink(cv.id, req.user.id);
  res.json({ url: `/api/cv/${cv.id}/file?token=${encodeURIComponent(link.token)}`, expiresAt: link.expiresAt });
}));

// Opened by the browser (iframe / new tab): the signed token replaces the session.
r.get('/:id/file', ah(async (req, res) => {
  const userId = verifyLink(req.params.id, req.query.token);
  if (!userId) throw new HttpError(403, 'This link has expired', 'link_expired');
  const cv = await one(
    `SELECT d.*, c.company_id, c.full_name, u.full_name AS viewer, u.role, u.company_id AS viewer_company
       FROM cv_documents d JOIN candidates c ON c.id = d.candidate_id JOIN users u ON u.id = $2 WHERE d.id = $1`, [req.params.id, userId]);
  if (!cv || cv.company_id !== cv.viewer_company) throw notFound('CV');
  const data = await readCv(cv.storage_key);
  await audit({ user: { id: userId, company_id: cv.company_id }, ip: req.ip }, 'cv.view', 'cv', cv.id, cv.full_name);
  res.set({
    'Content-Type': cv.mime,
    'Content-Disposition': `inline; filename="${encodeURIComponent(cv.original_name)}"`,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'",
    'X-Frame-Options': 'SAMEORIGIN',
  }).send(data);
}));

export default r;
