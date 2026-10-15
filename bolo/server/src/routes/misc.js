// Notifications, e-mail templates, audit log and users.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/index.js';
import { ah } from '../middleware/errors.js';
import { requireRole } from '../middleware/auth.js';
import { DEFAULT_TEMPLATES } from '../services/messages.js';
import { audit } from '../services/audit.js';

export const notifications = Router();
notifications.get('/', ah(async (req, res) => {
  const { rows } = await query('SELECT id, type, title, link, read_at, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 40', [req.user.id]);
  res.json({ unread: rows.filter((n) => !n.read_at).length, items: rows });
}));
notifications.post('/read-all', ah(async (req, res) => {
  await query('UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL', [req.user.id]);
  res.status(204).end();
}));

export const templates = Router();
templates.get('/', ah(async (req, res) => {
  const { rows } = await query('SELECT key, lang, subject, body, active FROM email_templates WHERE company_id = $1', [req.user.company_id]);
  const out = [];
  for (const key of Object.keys(DEFAULT_TEMPLATES)) for (const lang of ['fr', 'en']) {
    const t = rows.find((x) => x.key === key && x.lang === lang);
    const [subject, body] = DEFAULT_TEMPLATES[key][lang];
    out.push(t ?? { key, lang, subject, body, active: true });
  }
  res.json(out);
}));
templates.put('/:key/:lang', requireRole('admin', 'hr'), ah(async (req, res) => {
  const key = z.enum(Object.keys(DEFAULT_TEMPLATES)).parse(req.params.key);
  const lang = z.enum(['fr', 'en']).parse(req.params.lang);
  const b = z.object({ subject: z.string().trim().min(3).max(200), body: z.string().trim().min(10).max(4000), active: z.boolean().default(true) }).parse(req.body);
  await query(`INSERT INTO email_templates (company_id, key, lang, subject, body, active) VALUES ($1,$2,$3,$4,$5,$6)
               ON CONFLICT (company_id, key, lang) DO UPDATE SET subject = $4, body = $5, active = $6`,
  [req.user.company_id, key, lang, b.subject, b.body, b.active]);
  res.json({ key, lang, ...b });
}));

export const auditLog = Router();
auditLog.get('/', requireRole('admin', 'hr'), ah(async (req, res) => {
  const action = z.string().max(40).optional().parse(req.query.action);
  const { rows } = await query(
    `SELECT l.created_at, l.action, l.entity, l.detail, l.ip, u.full_name AS by FROM audit_logs l LEFT JOIN users u ON u.id = l.user_id
      WHERE l.company_id = $1 AND ($2::text IS NULL OR l.action LIKE $2 || '%') ORDER BY l.created_at DESC LIMIT 100`,
    [req.user.company_id, action ?? null]);
  res.json(rows);
}));

export const users = Router();
users.get('/', ah(async (req, res) => {
  const { rows } = await query('SELECT id, full_name, email, role FROM users WHERE company_id = $1 ORDER BY full_name', [req.user.company_id]);
  res.json(rows);
}));
users.post('/', requireRole('admin'), ah(async (req, res) => {
  const b = z.object({ full_name: z.string().trim().min(3).max(120), email: z.string().email(), role: z.enum(['admin', 'hr', 'recruiter']),
    password: z.string().min(10, 'At least 10 characters').max(200) }).parse(req.body);
  const { rows: [u] } = await query('INSERT INTO users (company_id, full_name, email, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, full_name, email, role',
    [req.user.company_id, b.full_name, b.email, await bcrypt.hash(b.password, 12), b.role]);
  await audit(req, 'user.create', 'user', u.id, `${u.email} (${u.role})`);
  res.status(201).json(u);
}));
