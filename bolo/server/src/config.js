import crypto from 'node:crypto';

const env = process.env;
const isTest = env.NODE_ENV === 'test';

function required(name, fallback) {
  const value = env[name] ?? fallback;
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const config = {
  env: env.NODE_ENV || 'development',
  port: Number(env.PORT || 5000),
  clientUrl: env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: required('DATABASE_URL', isTest ? 'postgresql://bolo:bolo@localhost:5432/bolo_test' : 'postgresql://bolo:bolo@localhost:5432/bolo'),
  jwtSecret: required('JWT_SECRET', env.NODE_ENV === 'production' ? undefined : 'dev-only-secret-change-me'),
  jwtTtl: env.JWT_TTL || '8h',
  // 32-byte key, base64. In development a key derived from the JWT secret is used.
  cvKey: env.CV_ENCRYPTION_KEY
    ? Buffer.from(env.CV_ENCRYPTION_KEY, 'base64')
    : crypto.createHash('sha256').update('cv:' + (env.JWT_SECRET || 'dev-only-secret-change-me')).digest(),
  storageDir: env.STORAGE_DIR || new URL('../storage/', import.meta.url).pathname,
  cvMaxBytes: Number(env.CV_MAX_BYTES || 5 * 1024 * 1024),
  cvLinkTtlSeconds: Number(env.CV_LINK_TTL_SECONDS || 300),
  rejectionDelayHours: Number(env.REJECTION_DELAY_HOURS || 48),
  applyLimitPerHour: Number(env.APPLY_LIMIT_PER_HOUR || 20),
  clamavHost: env.CLAMAV_HOST || null,
  clamavPort: Number(env.CLAMAV_PORT || 3310),
};

if (config.cvKey.length !== 32) throw new Error('CV_ENCRYPTION_KEY must be 32 bytes (base64)');
