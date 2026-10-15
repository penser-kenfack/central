// Demo data: a fictitious Douala SME, its HR team, job offers and ~170 applications
// that went through the real services (CV encryption, history, messages).
// Usage: node src/db/seed.js [directory of CV PDFs named <phone>.pdf]
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { pool, query, tx } from './index.js';
import { migrate } from './migrate.js';
import { storeCv } from '../services/cvVault.js';
import { createApplication } from '../routes/public.js';
import { moveApplication } from '../services/pipeline.js';
import { DATA } from './seed-data.js';

const cvDir = process.argv[2];
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const DAY = 86400000;

// Plain text PDF used when no designed CV is provided.
function textPdf(lines) {
  const esc = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[()\\]/g, '');
  const stream = 'BT /F1 11 Tf 60 760 Td 15 TL ' + lines.map((l) => `(${esc(l)}) '`).join(' ') + ' ET';
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n'; const off = [];
  objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${off.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

async function main() {
  await query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate();
  const now = Date.now();
  const { rows: [co] } = await query("INSERT INTO companies (name, slug, city, sector) VALUES ('Wouri Distribution SARL', 'wouri-distribution', 'Douala', 'Distribution de produits de grande consommation') RETURNING *");
  for (const [i, [name, kind, sla, mail]] of DATA.stages.entries()) {
    await query('INSERT INTO stage_templates (company_id, name, position, kind, sla_days, email_key) VALUES ($1,$2,$3,$4,$5,$6)', [co.id, name, i + 1, kind, sla, mail]);
  }
  const users = {};
  for (const u of DATA.users) {
    const { rows: [row] } = await query('INSERT INTO users (company_id, full_name, email, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [co.id, u.name, u.email, await bcrypt.hash('Bolo#2026', 12), u.role]);
    users[u.key] = { ...row };
  }
  const hr = users.hr;

  let phoneN = 0;
  for (const j of DATA.jobs) {
    const created = new Date(now - j.ageDays * DAY);
    const { rows: [job] } = await query(
      `INSERT INTO jobs (company_id, title, slug, department, location, contract_type, description, requirements, skills, openings, status, deadline, created_by, published_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [co.id, j.title, j.slug, j.department, j.location, j.contract, j.description, j.requirements, j.skills, j.openings, j.status === 'closed' ? 'open' : j.status,
        new Date(now + j.deadlineDays * DAY).toISOString().slice(0, 10), hr.id, j.status === 'draft' ? null : created, created]);
    await query('INSERT INTO stages (job_id, name, position, kind, sla_days, email_key) SELECT $1, name, position, kind, sla_days, email_key FROM stage_templates WHERE company_id = $2', [job.id, co.id]);
    if (j.custom) {
      await query("UPDATE stages SET position = position + 1 WHERE job_id = $1 AND position >= 3", [job.id]);
      await query('INSERT INTO stages (job_id, name, position, kind, sla_days, email_key) VALUES ($1,$2,3,\'active\',$3,NULL)', [job.id, j.custom, 3]);
    }
    for (const r of j.recruiters ?? []) await query('INSERT INTO job_recruiters VALUES ($1,$2)', [job.id, users[r].id]);
    const { rows: stages } = await query('SELECT * FROM stages WHERE job_id = $1 ORDER BY position', [job.id]);
    const active = stages.filter((s) => s.kind === 'active');

    for (let k = 0; k < j.count; k++) {
      const featured = j.featured?.[k];
      const person = featured ?? DATA.person(rnd, pick, j);
      const phone = featured?.phone ?? `+2376${String(70000000 + (phoneN++ * 7919) % 29999999).padStart(8, '0')}`;
      const isHire = j.hire && k === j.hire;
      const appliedAt = new Date(now - (featured?.daysAgo ?? (isHire ? Math.min(j.ageDays - 2, 27) : Math.pow(rnd(), 1.4) * Math.min(j.ageDays - 1, 55))) * DAY - rnd() * 8 * 3600000);
      const file = cvDir && fs.existsSync(path.join(cvDir, `${phone.slice(4)}.pdf`)) ? fs.readFileSync(path.join(cvDir, `${phone.slice(4)}.pdf`)) : textPdf(person.cvLines ?? [person.name.toUpperCase(), person.headline, person.city, '', ...person.skills]);
      const cv = await storeCv({ buffer: file, size: file.length, originalname: `CV_${person.name.split(' ')[0]}_${person.name.split(' ').slice(-1)[0]}.pdf` });
      const source = featured?.source ?? pick(DATA.sources);
      await tx(async (c) => {
        const app = await createApplication(c, {
          companyId: co.id, jobId: job.id, source,
          data: { full_name: person.name, phone, email: person.email, city: person.city, headline: person.headline, experience_years: person.exp, skills: person.skills, language: person.lang, cover_note: null },
          cv,
        });
        // progress through the pipeline with the real business rules
        const age = (now - appliedAt) / DAY;
        let target = isHire ? active.length - 1 : featured?.stage ?? (j.status === 'closed' ? 2 + Math.floor(rnd() * 3) : Math.min(active.length - 1, Math.floor(Math.pow(rnd(), 1.6) * Math.min(active.length, 1 + age / 4))));
        // old applications are not left untouched: HR has screened most of them
        if (!featured && j.status !== 'closed' && target === 0 && age > 3 && rnd() < 0.95) target = 1;
        const rejectNow = !featured && !isHire && j.status !== 'closed' && target >= 1 && rnd() < (age > 8 ? 0.45 : 0.2);
        const steps = [];
        for (let s = 1; s <= target && s < active.length; s++) steps.push(active[s]);
        if (featured?.final === 'hired' || (j.hire && k === j.hire)) steps.push(stages.find((s) => s.kind === 'hired'));
        if (rejectNow || featured?.final === 'rejected') steps.push(stages.find((s) => s.kind === 'rejected'));
        const actor = j.recruiters?.length && rnd() < 0.4 ? users[j.recruiters[0]] : hr;
        for (const st of steps) {
          await moveApplication(c, actor, { applicationId: app.id, toStageId: st.id, reason: st.kind === 'rejected' ? pick(DATA.reasons) : undefined });
        }
        // spread the events over time: the history must look like a real process
        const span = Math.max(0.2, age - (isHire ? 3 : featured?.lastMoveDaysAgo ?? rnd() * Math.min(age, 4)));
        await c.query('UPDATE applications SET created_at = $2 WHERE id = $1', [app.id, appliedAt]);
        const { rows: hist } = await c.query('SELECT id FROM stage_history WHERE application_id = $1 ORDER BY id', [app.id]);
        let t = appliedAt.getTime();
        for (const [i, h] of hist.entries()) {
          if (i > 0) t += (span / (hist.length - 1)) * DAY * (0.6 + rnd() * 0.4);
          await c.query('UPDATE stage_history SET moved_at = $2 WHERE id = $1', [h.id, new Date(Math.min(t, now - 3600000))]);
        }
        await c.query(`UPDATE applications a SET stage_entered_at = h.moved_at,
                         answered_at = CASE WHEN a.answered_at IS NOT NULL THEN h.moved_at END
                         FROM (SELECT moved_at FROM stage_history WHERE application_id = $1 ORDER BY moved_at DESC LIMIT 1) h WHERE a.id = $1`, [app.id]);
        await c.query(`UPDATE outbox o SET created_at = a.stage_entered_at, send_after = a.stage_entered_at + (o.send_after - o.created_at)
                         FROM applications a WHERE a.id = o.application_id AND o.application_id = $1`, [app.id]);
        await c.query("UPDATE outbox SET created_at = (SELECT created_at FROM applications WHERE id = $1), send_after = (SELECT created_at FROM applications WHERE id = $1) WHERE application_id = $1 AND subject ILIKE ANY (ARRAY['Candidature reçue%', 'Application received%'])", [app.id]);
        if (person.rating) {
          await c.query('INSERT INTO evaluations (application_id, user_id, score, comment, created_at) VALUES ($1,$2,$3,$4,$5)',
            [app.id, (featured?.evaluator && users[featured.evaluator].id) || actor.id, person.rating, person.comment ?? null, new Date(Math.min(t, now - 7200000))]);
          await c.query('UPDATE applications SET rating = $2 WHERE id = $1', [app.id, person.rating]);
        }
        // CV views of the featured candidates appear in the audit log
        for (const v of featured?.views ?? []) {
          const { rows: [d] } = await c.query('SELECT id FROM cv_documents WHERE candidate_id = $1 LIMIT 1', [app.candidateId]);
          await c.query("INSERT INTO audit_logs (company_id, user_id, action, entity, entity_id, detail, ip, created_at) VALUES ($1,$2,'cv.view','cv',$3,$4,$5,$6)",
            [co.id, users[v.by].id, d.id, person.name, v.ip, new Date(now - v.hoursAgo * 3600000)]);
        }
      });
    }
    if (j.status === 'closed') {
      await tx(async (c) => {
        const { closeJob } = await import('../services/pipeline.js');
        await closeJob(c, hr, job.id, { answerRemaining: true });
        await c.query("UPDATE jobs SET closed_at = $2 WHERE id = $1", [job.id, new Date(now - 9 * DAY)]);
        await c.query("UPDATE stage_history SET moved_at = $2 WHERE moved_at > $2 AND application_id IN (SELECT id FROM applications WHERE job_id = $1)", [job.id, new Date(now - 9 * DAY)]);
        await c.query("UPDATE applications SET stage_entered_at = $2, answered_at = $2 WHERE job_id = $1 AND stage_entered_at > $2", [job.id, new Date(now - 9 * DAY)]);
      });
    }
  }
  // in-app notifications for the recent activity
  await query(`INSERT INTO notifications (user_id, type, title, link, created_at)
    SELECT $1, 'new_application', 'Nouvelle candidature : ' || c.full_name || ' – ' || j.title, '/candidatures/' || a.id, a.created_at
      FROM applications a JOIN candidates c ON c.id = a.candidate_id JOIN jobs j ON j.id = a.job_id WHERE a.created_at > now() - interval '3 days'`, [hr.id]);
  await query(`INSERT INTO notifications (user_id, type, title, link, created_at)
    SELECT $1, 'evaluation', u.full_name || ' a évalué ' || c.full_name || ' (' || e.score || '/5)', '/candidatures/' || a.id, e.created_at
      FROM evaluations e JOIN users u ON u.id = e.user_id JOIN applications a ON a.id = e.application_id JOIN candidates c ON c.id = a.candidate_id
     WHERE e.user_id <> $1 AND e.created_at > now() - interval '5 days'`, [hr.id]);
  // messages whose time has come are sent
  await query("UPDATE outbox SET status = 'sent', sent_at = send_after WHERE status = 'queued' AND send_after <= now()");
  await query("DELETE FROM notifications WHERE user_id <> $1 OR type = 'new_application' AND created_at < now() - interval '3 days'", [hr.id]);
  await query("UPDATE notifications SET read_at = created_at + interval '2 hours' WHERE created_at < now() - interval '20 hours'");
  // a realistic audit trail
  const { rows: hist } = await query(`SELECT h.moved_by, h.moved_at, c.full_name, t.name, h.application_id FROM stage_history h JOIN stages t ON t.id = h.to_stage_id
    JOIN applications a ON a.id = h.application_id JOIN candidates c ON c.id = a.candidate_id WHERE h.moved_by IS NOT NULL ORDER BY h.moved_at DESC LIMIT 60`);
  for (const h of hist) {
    await query("INSERT INTO audit_logs (company_id, user_id, action, entity, entity_id, detail, ip, created_at) VALUES ($1,$2,'application.move','application',$3,$4,'41.202.219.' || (10 + floor(random()*40))::int, $5)",
      [co.id, h.moved_by, h.application_id, `${h.full_name} → ${h.name}`, h.moved_at]);
  }
  const { rows: [n] } = await query('SELECT (SELECT count(*) FROM applications) AS apps, (SELECT count(*) FROM candidates) AS cands, (SELECT count(*) FROM cv_documents) AS cvs');
  console.log(`Seeded: ${n.apps} applications, ${n.cands} candidates, ${n.cvs} encrypted CVs`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
