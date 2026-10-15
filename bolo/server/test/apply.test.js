import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { api, resetDb, close, login, createOpenJob, apply, makePdf } from './helpers.js';
import { query } from '../src/db/index.js';
import { config } from '../src/config.js';
import { decrypt } from '../src/services/cvVault.js';

let hr, job;
before(async () => { await resetDb(); hr = await login('hr@wouri.cm'); job = await createOpenJob(hr); });
after(close);

test('the career page lists open offers only', async () => {
  await api().post('/api/jobs').set('Authorization', `Bearer ${hr}`).send({ title: 'Brouillon', location: 'Douala', contract_type: 'CDD', description: 'Offre non publiée pour vérifier le filtre.' });
  const res = await api().get('/api/public/wouri/jobs');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.jobs.map((j) => j.title), ['Comptable confirmé']);
});

test('an application with a PDF is accepted, encrypted and acknowledged', async () => {
  const pdf = makePdf('Curriculum vitae comptable Sage OHADA');
  const res = await apply(job.slug, {}, pdf);
  assert.equal(res.status, 201);
  assert.ok(res.body.trackingToken);
  const { rows: [doc] } = await query('SELECT * FROM cv_documents');
  const onDisk = fs.readFileSync(path.join(config.storageDir, doc.storage_key));
  assert.ok(!onDisk.includes('%PDF'), 'the stored file must not be readable');
  assert.ok(decrypt(onDisk).equals(pdf), 'decryption gives back the original file');
  const { rows: msgs } = await query("SELECT * FROM outbox WHERE subject LIKE 'Candidature reçue%'");
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].recipient, 'ariane@example.cm');
  const { rows: notes } = await query("SELECT * FROM notifications WHERE type = 'new_application'");
  assert.ok(notes.length >= 2, 'admin and HR are notified');
});

test('the same phone number for the same offer does not create a duplicate', async () => {
  const res = await apply(job.slug, { full_name: 'Ngono Ariane B.', phone: '+237 677 00 11 22' });
  assert.equal(res.status, 200);
  assert.equal(res.body.duplicate, true);
  const { rows } = await query('SELECT count(*)::int AS n FROM applications');
  assert.equal(rows[0].n, 1);
});

test('a candidate without e-mail is answered by SMS', async () => {
  await apply(job.slug, { full_name: 'Tabi Collins', phone: '699112233', email: '', language: 'en' });
  const { rows: [m] } = await query("SELECT * FROM outbox WHERE recipient = '+237699112233'");
  assert.equal(m.channel, 'sms');
  assert.equal(m.lang, 'en');
  assert.match(m.subject, /Application received/);
});

test('a photo of a paper CV (JPEG) is accepted', async () => {
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 1)]);
  const res = await apply(job.slug, { phone: '651000001' }, jpg);
  assert.equal(res.status, 201);
});

test('an executable renamed .pdf is refused (415)', async () => {
  const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(1000)]);
  const res = await apply(job.slug, { phone: '651000002' }, exe);
  assert.equal(res.status, 415);
});

test('the EICAR antivirus test file is refused (422)', async () => {
  const eicar = Buffer.from('%PDF-1.4\nX5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
  const res = await apply(job.slug, { phone: '651000003' }, eicar);
  assert.equal(res.status, 422);
});

test('a file above 5 MB is refused (413)', async () => {
  const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(5 * 1024 * 1024 + 10)]);
  const res = await apply(job.slug, { phone: '651000004' }, big);
  assert.equal(res.status, 413);
});

test('consent, a CV and a Cameroonian phone number are required', async () => {
  assert.equal((await apply(job.slug, { phone: '651000005', consent: 'false' })).status, 400);
  assert.equal((await apply(job.slug, { phone: '12345' })).status, 400);
  assert.equal((await apply(job.slug, { phone: '651000006' }, null)).status, 400);
});

test('no file is left on disk when an application is refused', async () => {
  const before = fs.readdirSync(config.storageDir).length;
  await apply('unknown-offer', { phone: '651000007' });
  assert.equal(fs.readdirSync(config.storageDir).length, before);
});

test('the candidate follows a simple public status, never the internal stage', async () => {
  const { rows: [a] } = await query('SELECT tracking_token FROM applications LIMIT 1');
  const res = await api().get(`/api/public/track/${a.tracking_token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.step, 'received');
  assert.equal(res.body.stage, undefined);
});
