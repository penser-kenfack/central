// Performance measurements used in the report. Runs against the test database.
// Usage: NODE_ENV=test STORAGE_DIR=/tmp/bolo-bench node scripts/bench.js
import { performance } from 'node:perf_hooks';
import { api, resetDb, login, createOpenJob, apply, makePdf, close } from '../test/helpers.js';
import { query } from '../src/db/index.js';

const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { n: s.length, mean: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(1), p50: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), max: +s.at(-1).toFixed(1) };
};
const time = async (fn) => { const t = performance.now(); await fn(); return performance.now() - t; };

await resetDb();
const hr = await login('hr@wouri.cm');
const auth = { Authorization: `Bearer ${hr}` };
const job = await createOpenJob(hr);
const { body: { stages } } = await api().get(`/api/jobs/${job.id}`).set(auth);

// 1. online application with a 1 MB PDF (validation, scan, encryption, text extraction, insert)
const big = Buffer.concat([makePdf('Curriculum vitae comptable Sage OHADA Douala'), Buffer.alloc(1024 * 1024 - 600, 0x20)]);
const upload = [];
for (let i = 0; i < 30; i++) upload.push(await time(async () => { const r = await apply(job.slug, { phone: `65${String(1000000 + i)}` }, big); if (r.status !== 201) throw new Error(r.text); }));

// 2. 10,000 candidates with a CV text for the search
const words = ['comptable', 'sage', 'syscohada', 'excel', 'douala', 'commercial', 'permis', 'chauffeur', 'react', 'node', 'paie', 'cnps', 'logistique', 'inventaire', 'fiscalite', 'audit', 'tresorerie', 'vente', 'magasinier', 'anglais'];
await query(`INSERT INTO candidates (company_id, full_name, phone, city, headline, experience_years, skills, consent_at)
  SELECT j.company_id, 'Candidat ' || g, '+2376' || lpad(g::text, 8, '0'), 'Douala', 'Profil ' || g, g % 12,
         ARRAY[(ARRAY[${words.map((w) => `'${w}'`).join(',')}])[1 + g % 20], (ARRAY[${words.map((w) => `'${w}'`).join(',')}])[1 + (g * 7) % 20]], now()
    FROM generate_series(1, 10000) g, jobs j WHERE j.id = $1`, [job.id]);
await query(`INSERT INTO applications (job_id, candidate_id, stage_id, source, tracking_token)
  SELECT $1, c.id, $2, 'career_page', md5(c.id::text) FROM candidates c WHERE c.full_name LIKE 'Candidat %'`, [job.id, stages[0].id]);
await query(`INSERT INTO cv_documents (candidate_id, storage_key, original_name, mime, size_bytes, sha256, text_search)
  SELECT c.id, 'x', 'cv.pdf', 'application/pdf', 1000, repeat('0', 64),
         to_tsvector('simple', 'experience ' || (ARRAY[${words.map((w) => `'${w}'`).join(',')}])[1 + (row_number() OVER ())::int % 20] || ' rapprochements bancaires ' || md5(c.id::text))
    FROM candidates c WHERE c.full_name LIKE 'Candidat %'`);
await query('ANALYZE');
const searches = {};
for (const qs of ['q=sage', 'q=comptable%20douala', 'q=rapprochement', 'min_exp=5&language=fr', 'q=react&min_exp=3']) {
  const xs = [];
  for (let i = 0; i < 20; i++) xs.push(await time(() => api().get(`/api/candidates?${qs}`).set(auth)));
  const { body } = await api().get(`/api/candidates?${qs}`).set(auth);
  searches[qs] = { ...stats(xs), results: body.total, sqlMs: body.ms };
}

// 3. moving a candidate (transaction, history, message)
const { rows: apps } = await query("SELECT a.id FROM applications a JOIN candidates c ON c.id = a.candidate_id WHERE c.full_name LIKE 'Candidat %' LIMIT 200");
const moves = [];
for (const [i, a] of apps.entries()) moves.push(await time(() => api().post(`/api/applications/${a.id}/move`).set(auth).send({ stage_id: stages[1 + (i % 3)].id })));

// 4. dashboard and pipeline with 10,000 applications
const dash = []; const pipe = [];
for (let i = 0; i < 15; i++) { dash.push(await time(() => api().get('/api/dashboard').set(auth))); pipe.push(await time(() => api().get(`/api/jobs/${job.id}/pipeline`).set(auth))); }

console.log(JSON.stringify({ upload1MB: stats(upload), search10k: searches, move: stats(moves), dashboard10k: stats(dash), pipeline10k: stats(pipe) }, null, 1));
await close();
