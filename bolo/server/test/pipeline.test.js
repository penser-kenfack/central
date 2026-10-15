import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { api, resetDb, close, login, createOpenJob, apply } from './helpers.js';
import { query } from '../src/db/index.js';

let ids, hr, rec, rec2, job, other, stages, appId;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const move = (t, id, stage, reason) => api().post(`/api/applications/${id}/move`).set(auth(t)).send({ stage_id: stage, reason });
const st = (name) => stages.find((s) => s.name === name).id;

before(async () => {
  ids = await resetDb();
  hr = await login('hr@wouri.cm'); rec = await login('recruiter@wouri.cm'); rec2 = await login('recruiter2@wouri.cm');
  job = await createOpenJob(hr, { recruiter_ids: [ids.recruiter_wouri] });
  other = await createOpenJob(hr, { title: 'Magasinier' });
  stages = (await api().get(`/api/jobs/${job.id}`).set(auth(hr))).body.stages;
  await apply(job.slug);
  await apply(job.slug, { full_name: 'Mbarga Yves', phone: '677223344', email: 'yves@example.cm' });
  appId = (await query("SELECT a.id FROM applications a JOIN candidates c ON c.id = a.candidate_id WHERE c.full_name = 'Ngono Ariane'")).rows[0].id;
});
after(close);

test('a new job receives a copy of the company stages', () => {
  assert.deepEqual(stages.map((s) => s.name), ['Nouvelle', 'Présélection', 'Entretien', 'Test pratique', 'Proposition', 'Recruté', 'Non retenu']);
});

test('a recruiter cannot create a job (403)', async () => {
  const res = await api().post('/api/jobs').set(auth(rec)).send({ title: 'X', location: 'Douala', contract_type: 'CDI', description: 'x'.repeat(30) });
  assert.equal(res.status, 403);
});

test('moving a candidate writes the history and queues the stage message (BR6)', async () => {
  const res = await move(hr, appId, st('Entretien'));
  assert.equal(res.status, 200);
  const { rows: h } = await query('SELECT * FROM stage_history WHERE application_id = $1 ORDER BY moved_at', [appId]);
  assert.equal(h.length, 2);
  assert.equal(h[1].to_stage_id, st('Entretien'));
  const { rows: m } = await query("SELECT * FROM outbox WHERE application_id = $1 AND subject LIKE 'Invitation%'", [appId]);
  assert.equal(m.length, 1);
});

test('a stage of another job is refused (BR1)', async () => {
  const otherStages = (await api().get(`/api/jobs/${other.id}`).set(auth(hr))).body.stages;
  assert.equal((await move(hr, appId, otherStages[1].id)).status, 400);
});

test('a rejection needs a reason and the answer is delayed by 48 h (BR3)', async () => {
  assert.equal((await move(hr, appId, st('Non retenu'))).status, 400);
  assert.equal((await move(hr, appId, st('Non retenu'), 'Profil trop junior')).status, 200);
  const { rows: [m] } = await query("SELECT EXTRACT(EPOCH FROM send_after - now())/3600 AS h FROM outbox WHERE application_id = $1 AND subject LIKE 'Votre candidature%'", [appId]);
  assert.ok(m.h > 47 && m.h <= 48);
});

test('moving back from "rejected" cancels the pending answer', async () => {
  await move(hr, appId, st('Entretien'));
  const { rows: [m] } = await query("SELECT status FROM outbox WHERE application_id = $1 AND subject LIKE 'Votre candidature%'", [appId]);
  assert.equal(m.status, 'cancelled');
  const { rows: [a] } = await query('SELECT answered_at FROM applications WHERE id = $1', [appId]);
  assert.equal(a.answered_at, null);
});

test('an assigned recruiter can move; another recruiter cannot see the job (BR2)', async () => {
  assert.equal((await move(rec, appId, st('Test pratique'))).status, 200);
  assert.equal((await move(rec2, appId, st('Proposition'))).status, 404);
  assert.equal((await api().get(`/api/jobs/${job.id}/pipeline`).set(auth(rec2))).status, 404);
});

test('a user of another company cannot reach the application', async () => {
  const otherHr = await login('hr@other.cm');
  assert.equal((await api().get(`/api/applications/${appId}`).set(auth(otherHr))).status, 404);
});

test('hiring the last opening notifies the team to close the offer (BR4)', async () => {
  await move(hr, appId, st('Recruté'));
  const { rows } = await query("SELECT * FROM notifications WHERE type = 'job_filled'");
  assert.ok(rows.length >= 1);
});

test('a stage holding applications cannot be removed (BR5)', async () => {
  const list = stages.filter((s) => s.name !== 'Nouvelle').map(({ id, name, kind }) => ({ id, name, kind }));
  const res = await api().put(`/api/jobs/${job.id}/stages`).set(auth(hr)).send(list);
  assert.equal(res.status, 409);
});

test('stages can be renamed, added and reordered for one job only', async () => {
  const list = stages.map(({ id, name, kind, sla_days, email_key }) => ({ id, name, kind, sla_days, email_key }));
  list.splice(2, 0, { name: 'Visite du dépôt', kind: 'active', sla_days: 2 });
  list[1].name = 'Tri des CV';
  const res = await api().put(`/api/jobs/${job.id}/stages`).set(auth(hr)).send(list);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.slice(0, 3).map((s) => s.name), ['Nouvelle', 'Tri des CV', 'Visite du dépôt']);
  const otherStages = (await api().get(`/api/jobs/${other.id}`).set(auth(hr))).body.stages;
  assert.equal(otherStages[1].name, 'Présélection');
});

test('a pipeline needs exactly one "hired" and one "rejected" stage', async () => {
  const res = await api().put(`/api/jobs/${job.id}/stages`).set(auth(hr)).send([
    { name: 'A', kind: 'active' }, { name: 'B', kind: 'active' }, { name: 'C', kind: 'hired' }]);
  assert.equal(res.status, 400);
});

test('evaluations update the rating of the application', async () => {
  const yves = (await query("SELECT a.id FROM applications a JOIN candidates c ON c.id = a.candidate_id WHERE c.full_name = 'Mbarga Yves'")).rows[0].id;
  await api().post(`/api/applications/${yves}/evaluations`).set(auth(hr)).send({ score: 4, comment: 'Bon échange' });
  await api().post(`/api/applications/${yves}/evaluations`).set(auth(rec)).send({ score: 5 });
  const { rows: [a] } = await query('SELECT rating FROM applications WHERE id = $1', [yves]);
  assert.equal(a.rating, 5);
});

test('closing an offer answers every candidate still in progress', async () => {
  const res = await api().post(`/api/jobs/${job.id}/close`).set(auth(hr)).send({ answer_remaining: true });
  assert.equal(res.status, 200);
  assert.equal(res.body.answered, 1);
  const { rows } = await query("SELECT count(*)::int AS n FROM applications a JOIN stages s ON s.id = a.stage_id WHERE a.job_id = $1 AND s.kind = 'active'", [job.id]);
  assert.equal(rows[0].n, 0);
  const { rows: [{ n }] } = await query('SELECT count(*)::int AS n FROM applications WHERE job_id = $1 AND answered_at IS NULL', [job.id]);
  assert.equal(n, 0);
});
