import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { api, resetDb, close } from './helpers.js';

before(resetDb);
after(close);

test('logs in with the right password and returns a token', async () => {
  const res = await api().post('/api/auth/login').send({ email: 'hr@wouri.cm', password: 'Secret#2026' });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.role, 'hr');
  assert.equal(res.body.user.password_hash, undefined);
  assert.match(res.headers['set-cookie'][0], /HttpOnly/);
});

test('rejects a wrong password with 401', async () => {
  const res = await api().post('/api/auth/login').send({ email: 'hr@wouri.cm', password: 'wrong' });
  assert.equal(res.status, 401);
});

test('locks the account after 5 failures (NFR-06)', async () => {
  for (let i = 0; i < 5; i++) await api().post('/api/auth/login').send({ email: 'admin@other.cm', password: 'bad' });
  const res = await api().post('/api/auth/login').send({ email: 'admin@other.cm', password: 'Secret#2026' });
  assert.equal(res.status, 423);
});

test('protected routes need a valid token', async () => {
  assert.equal((await api().get('/api/jobs')).status, 401);
  assert.equal((await api().get('/api/jobs').set('Authorization', 'Bearer abc.def.ghi')).status, 401);
});

test('validates the login body', async () => {
  const res = await api().post('/api/auth/login').send({ email: 'not-an-email' });
  assert.equal(res.status, 400);
});
