import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const notFound = (what = 'Resource') => new HttpError(404, `${what} not found`, 'not_found');

// wraps async route handlers so that rejected promises reach the error handler
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Invalid data', code: 'validation', fields: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
  }
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large', code: 'file_too_large' });
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, code: err.code });
  if (err.code === '23505') return res.status(409).json({ error: 'Already exists', code: 'duplicate' });
  console.error(err);
  res.status(500).json({ error: 'Internal error', code: 'internal' });
}
