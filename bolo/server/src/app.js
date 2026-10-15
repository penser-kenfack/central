import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errors.js';
import auth from './routes/auth.js';
import publicRoutes from './routes/public.js';
import jobs from './routes/jobs.js';
import applications from './routes/applications.js';
import candidates from './routes/candidates.js';
import cv from './routes/cv.js';
import dashboard from './routes/dashboard.js';
import { notifications, templates, auditLog, users } from './routes/misc.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-origin' } }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', auth);
  app.use('/api/public', publicRoutes);
  app.use('/api/cv', cv);
  app.use('/api/jobs', requireAuth, jobs);
  app.use('/api/applications', requireAuth, applications);
  app.use('/api/candidates', requireAuth, candidates);
  app.use('/api/dashboard', requireAuth, dashboard);
  app.use('/api/notifications', requireAuth, notifications);
  app.use('/api/templates', requireAuth, templates);
  app.use('/api/audit', requireAuth, auditLog);
  app.use('/api/users', requireAuth, users);
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found', code: 'not_found' }));
  app.use(errorHandler);
  return app;
}
