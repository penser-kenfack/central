import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { api, resetDb, close, login, createOpenJob, apply, makePdf } from './helpers.js';
import { query } from '../src/db/index.js';
import { config } from '../src/config.js';
import { signLink } from '../src/services/cvVault.js';

let ids, hr, cvId, job;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

before(async () => {
  ids = await resetDb();
  hr = await login('hr@wouri.cm');
  job = await createOpenJob(hr);
  await apply(job.slug, {}, makePdf('Curriculum vitae comptable Sage OHADA'));
  await apply(job.slug, { full_name: 'Fokou Diane', phone: '690000001', skills: 'Excel' }, makePdf('Experience Douala rapprochements bancaires CEMAC'));
  cvId = (await query('SELECT id FROM cv_documents ORDER BY uploaded_at LIMIT 1')).rows[0].id;
});
after(close);

test('a signed link gives the original PDF and the view is logged', async () => {
  const { body } = await api().post(`/api/cv/${cvId}/link`).set(auth(hr));
  assert.ok(new Date(body.expiresAt) - Date.now() <= config.cvLinkTtlSeconds * 1000);
  const res = await api().get(body.url).buffer(true);
  assert.equal(res.status, 200);
  assert.equal(res.headers['content-type'], 'application/pdf');
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.ok(res.body.subarray(0, 5).toString() === '%PDF-');
  const { rows } = await query("SELECT * FROM audit_logs WHERE action = 'cv.view'");
  assert.equal(rows.length, 1);
});

test('a modified or expired link is refused (403)', async () => {
  const { body } = await api().post(`/api/cv/${cvId}/link`).set(auth(hr));
  assert.equal((await api().get(body.url.replace(/.$/, 'x'))).status, 403);
  const expired = signLink(cvId, ids.hr_wouri, -1);
  assert.equal((await api().get(`/api/cv/${cvId}/file?token=${encodeURIComponent(expired.token)}`)).status, 403);
});

test('another company cannot obtain a link', async () => {
  const otherHr = await login('hr@other.cm');
  assert.equal((await api().post(`/api/cv/${cvId}/link`).set(auth(otherHr))).status, 404);
});

test('a recruiter not assigned to the job cannot open the CV', async () => {
  const rec = await login('recruiter@wouri.cm');
  assert.equal((await api().post(`/api/cv/${cvId}/link`).set(auth(rec))).status, 404);
});

test('search finds words of the profile and words found only in the CV text', async () => {
  const bySkill = await api().get('/api/candidates?q=sage').set(auth(hr));
  assert.deepEqual(bySkill.body.results.map((r) => r.full_name), ['Ngono Ariane']);
  const byCvText = await api().get('/api/candidates?q=rapprochement').set(auth(hr));
  assert.deepEqual(byCvText.body.results.map((r) => r.full_name), ['Fokou Diane']);
});

test('filters combine and malicious input is treated as text', async () => {
  const res = await api().get('/api/candidates?min_exp=3&language=fr&source=career_page').set(auth(hr));
  assert.equal(res.body.total, 2);
  const inj = await api().get(`/api/candidates?q=${encodeURIComponent("'); DROP TABLE candidates; --")}`).set(auth(hr));
  assert.equal(inj.status, 200);
  assert.equal((await query('SELECT count(*)::int AS n FROM candidates')).rows[0].n, 2);
});

test('the right to erasure removes personal data and CV files', async () => {
  const { rows: [c] } = await query("SELECT c.id, d.storage_key FROM candidates c JOIN cv_documents d ON d.candidate_id = c.id WHERE c.full_name = 'Fokou Diane'");
  assert.equal((await api().delete(`/api/candidates/${c.id}`).set(auth(hr))).status, 204);
  assert.equal(fs.existsSync(`${config.storageDir}/${c.storage_key}`), false);
  const { rows: [after] } = await query('SELECT full_name, email, anonymized_at FROM candidates WHERE id = $1', [c.id]);
  assert.equal(after.full_name, 'Candidat anonymisé');
  assert.equal(after.email, null);
  const { rows: [{ n }] } = await query('SELECT count(*)::int AS n FROM applications a WHERE a.candidate_id = $1', [c.id]);
  assert.equal(n, 1, 'the application is kept for the statistics');
});
