import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { one, query } from '../db/index.js';
import { ah, HttpError } from '../middleware/errors.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { config } from '../config.js';

const r = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const LoginBody = z.object({ email: z.string().email(), password: z.string().min(1).max(200) });

r.post('/login', loginLimiter, ah(async (req, res) => {
  const { email, password } = LoginBody.parse(req.body);
  // the lock is evaluated by the database, so that a single clock is used
  const user = await one('SELECT *, coalesce(locked_until > now(), false) AS locked FROM users WHERE lower(email) = lower($1)', [email]);
  if (user?.locked)
    throw new HttpError(423, 'Account locked for 15 minutes after 5 failed attempts', 'locked');
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) {
    if (user) await query(
      `UPDATE users SET failed_logins = failed_logins + 1,
              locked_until = CASE WHEN failed_logins + 1 >= 5 THEN now() + interval '15 minutes' END WHERE id = $1`, [user.id]);
    throw new HttpError(401, 'Wrong e-mail or password', 'bad_credentials');
  }
  await query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1', [user.id]);
  const token = signToken(user);
  res.cookie('bolo_token', token, { httpOnly: true, sameSite: 'strict', secure: config.env === 'production', maxAge: 8 * 3600 * 1000 });
  res.json({ token, user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role } });
}));

r.post('/logout', (req, res) => { res.clearCookie('bolo_token'); res.status(204).end(); });

r.get('/me', requireAuth, ah(async (req, res) => {
  const company = await one('SELECT id, name, slug, city FROM companies WHERE id = $1', [req.user.company_id]);
  res.json({ user: { id: req.user.id, fullName: req.user.full_name, email: req.user.email, role: req.user.role }, company });
}));

export default r;
