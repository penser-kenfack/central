import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { one } from '../db/index.js';
import { HttpError } from './errors.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, cid: user.company_id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtTtl });
}

// Accepts "Authorization: Bearer <jwt>" or the httpOnly "bolo_token" cookie.
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : req.cookies?.bolo_token;
    if (!token) throw new HttpError(401, 'Authentication required', 'unauthenticated');
    let payload;
    try { payload = jwt.verify(token, config.jwtSecret); } catch { throw new HttpError(401, 'Invalid or expired session', 'unauthenticated'); }
    const user = await one('SELECT id, company_id, full_name, email, role FROM users WHERE id = $1', [payload.sub]);
    if (!user) throw new HttpError(401, 'Account not found', 'unauthenticated');
    req.user = user;
    next();
  } catch (err) { next(err); }
}

export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(new HttpError(403, 'Not allowed for your role', 'forbidden'));
