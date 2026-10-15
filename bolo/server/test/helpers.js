import bcrypt from 'bcryptjs';
import request from 'supertest';
import { pool, query } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { createApp } from '../src/app.js';

export const app = createApp();
export const api = () => request(app);

// Minimal valid PDF whose text layer contains `text`.
export function makePdf(text) {
  const stream = `BT /F1 12 Tf 72 720 Td (${text.replace(/[()\\]/g, '')}) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

export const STAGES = [
  ['Nouvelle', 'active', null, null], ['Présélection', 'active', 3, null], ['Entretien', 'active', 5, 'interview'],
  ['Test pratique', 'active', 5, 'test'], ['Proposition', 'active', 3, 'offer'], ['Recruté', 'hired', null, 'hired'], ['Non retenu', 'rejected', null, 'rejected'],
];

// Fresh database with two companies, so that isolation between companies can be tested.
export async function resetDb() {
  await query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate();
  const hash = await bcrypt.hash('Secret#2026', 4);
  const ids = {};
  for (const [slug, name] of [['wouri', 'Wouri Distribution SARL'], ['other', 'Autre Société SA']]) {
    const { rows: [c] } = await query('INSERT INTO companies (name, slug, city) VALUES ($1,$2,$3) RETURNING id', [name, slug, 'Douala']);
    ids[slug] = c.id;
    for (const [i, [n, k, sla, mail]] of STAGES.entries()) {
      await query('INSERT INTO stage_templates (company_id, name, position, kind, sla_days, email_key) VALUES ($1,$2,$3,$4,$5,$6)', [c.id, n, i + 1, k, sla, mail]);
    }
    for (const role of ['admin', 'hr', 'recruiter', 'recruiter2']) {
      const { rows: [u] } = await query('INSERT INTO users (company_id, full_name, email, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [c.id, `${role} ${slug}`, `${role}@${slug}.cm`, hash, role.replace('2', '')]);
      ids[`${role}_${slug}`] = u.id;
    }
  }
  return ids;
}

export async function login(email) {
  const res = await api().post('/api/auth/login').send({ email, password: 'Secret#2026' });
  return res.body.token;
}

export const JOB = {
  title: 'Comptable confirmé', location: 'Douala – Akwa', contract_type: 'CDI', openings: 1,
  description: 'Tenue de la comptabilité générale, déclarations fiscales et sociales, rapprochements bancaires.', skills: ['Sage', 'OHADA'],
};

export async function createOpenJob(token, extra = {}) {
  const { body: job } = await api().post('/api/jobs').set('Authorization', `Bearer ${token}`).send({ ...JOB, ...extra });
  await api().post(`/api/jobs/${job.id}/publish`).set('Authorization', `Bearer ${token}`);
  return job;
}

export function apply(jobSlug, fields = {}, file = makePdf('Curriculum vitae comptable Sage OHADA'), company = 'wouri') {
  const req = api().post(`/api/public/${company}/jobs/${jobSlug}/apply`);
  const data = { full_name: 'Ngono Ariane', phone: '677001122', email: 'ariane@example.cm', language: 'fr', experience_years: '4', skills: 'Sage, Excel', consent: 'true', ...fields };
  for (const [k, v] of Object.entries(data)) if (v !== undefined) req.field(k, v);
  if (file) req.attach('cv', file, { filename: 'cv.pdf' });
  return req;
}

export const close = () => pool.end();
