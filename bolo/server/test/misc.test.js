import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { api, resetDb, close, login, createOpenJob, apply } from './helpers.js';
import { query } from '../src/db/index.js';
import { processOutbox, applyRetention } from '../src/services/jobs.js';

let hr, rec, admin, job, stages;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const appOf = async (name) => (await query('SELECT a.id, a.tracking_token FROM applications a JOIN candidates c ON c.id = a.candidate_id WHERE c.full_name = $1', [name])).rows[0];

before(async () => {
  await resetDb();
  hr = await login('hr@wouri.cm'); rec = await login('recruiter@wouri.cm'); admin = await login('admin@wouri.cm');
  job = await createOpenJob(hr);
  stages = (await api().get(`/api/jobs/${job.id}`).set(auth(hr))).body.stages;
  await apply(job.slug);
  await apply(job.slug, { full_name: 'Bih Precious', phone: '650001122', language: 'en', email: 'precious@example.cm' });
});
after(close);

test('the worker sends due messages and keeps delayed rejections for later', async () => {
  const a = await appOf('Bih Precious');
  await api().post(`/api/applications/${a.id}/move`).set(auth(hr)).send({ stage_id: stages.at(-1).id, reason: 'Profil trop junior' });
  const sent = await processOutbox();
  assert.equal(sent, 2, 'the two acknowledgements');
  const { rows } = await query("SELECT status FROM outbox WHERE subject LIKE 'Your application%'");
  assert.equal(rows[0].status, 'queued');
});

test('the candidate sees "in review" until the rejection is actually sent', async () => {
  const a = await appOf('Bih Precious');
  assert.equal((await api().get(`/api/public/track/${a.tracking_token}`)).body.step, 'in_review');
  await query("UPDATE outbox SET send_after = now() - interval '1 minute' WHERE subject LIKE 'Your application%'");
  await processOutbox();
  assert.equal((await api().get(`/api/public/track/${a.tracking_token}`)).body.step, 'closed');
});

test('a customised template is used, and a disabled one sends nothing', async () => {
  await api().put('/api/templates/interview/fr').set(auth(hr)).send({ subject: 'Entretien chez {{company}}', body: 'Bonjour {{name}}, à bientôt pour le poste de {{job}}.' });
  const a = await appOf('Ngono Ariane');
  await api().post(`/api/applications/${a.id}/move`).set(auth(hr)).send({ stage_id: stages[2].id });
  const { rows: [m] } = await query("SELECT * FROM outbox WHERE application_id = $1 AND subject LIKE 'Entretien chez%'", [a.id]);
  assert.match(m.body, /Bonjour Ngono Ariane, à bientôt pour le poste de Comptable confirmé/);
  await api().put('/api/templates/test/fr').set(auth(hr)).send({ subject: 'Test', body: 'Message désactivé pour ce test.', active: false });
  await api().post(`/api/applications/${a.id}/move`).set(auth(hr)).send({ stage_id: stages[3].id });
  const { rows } = await query("SELECT * FROM outbox WHERE application_id = $1 AND subject = 'Test'", [a.id]);
  assert.equal(rows.length, 0);
});

test('the dashboard counts match the data', async () => {
  const { body } = await api().get('/api/dashboard').set(auth(hr));
  assert.equal(body.kpi.open_jobs, 1);
  assert.equal(body.kpi.applications_30d, 2);
  assert.equal(body.kpi.finished, 1);
  assert.equal(body.kpi.answered, 1);
  assert.deepEqual(body.sources, [{ source: 'career_page', n: 2 }]);
});

test('only admins and HR read the audit log; only admins create accounts', async () => {
  assert.equal((await api().get('/api/audit').set(auth(rec))).status, 403);
  assert.equal((await api().get('/api/audit').set(auth(hr))).status, 200);
  const body = { full_name: 'Nouvel utilisateur', email: 'new@wouri.cm', role: 'recruiter', password: 'short' };
  assert.equal((await api().post('/api/users').set(auth(hr)).send(body)).status, 403);
  assert.equal((await api().post('/api/users').set(auth(admin)).send(body)).status, 400);
  assert.equal((await api().post('/api/users').set(auth(admin)).send({ ...body, password: 'LongEnough#2026' })).status, 201);
});

test('the retention job anonymises candidates older than the retention period', async () => {
  await query("UPDATE applications SET created_at = now() - interval '25 months' FROM candidates c WHERE c.id = applications.candidate_id AND c.full_name = 'Ngono Ariane'");
  assert.equal(await applyRetention(), 1);
  const { rows } = await query("SELECT count(*)::int AS n FROM candidates WHERE anonymized_at IS NOT NULL");
  assert.equal(rows[0].n, 1);
});
