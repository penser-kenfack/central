// Background jobs: sending queued messages and applying the retention period.
import { query } from '../db/index.js';
import { deleteCv } from './cvVault.js';

// In this version messages are "sent" by the console transport; plugging an SMTP
// server or an SMS aggregator only changes deliver().
async function deliver(msg) {
  if (process.env.NODE_ENV !== 'test') console.log(`[${msg.channel}] → ${msg.recipient}: ${msg.subject ?? msg.body.slice(0, 60)}`);
}

export async function processOutbox() {
  const { rows } = await query(
    `UPDATE outbox SET status = 'sent', sent_at = now()
      WHERE id IN (SELECT id FROM outbox WHERE status = 'queued' AND send_after <= now() ORDER BY id LIMIT 50 FOR UPDATE SKIP LOCKED)
      RETURNING *`);
  for (const m of rows) await deliver(m);
  return rows.length;
}

// Candidates whose last application is older than the retention period are anonymised.
export async function applyRetention() {
  const { rows } = await query(
    `SELECT c.id FROM candidates c JOIN companies co ON co.id = c.company_id
      WHERE c.anonymized_at IS NULL
        AND (SELECT max(created_at) FROM applications a WHERE a.candidate_id = c.id) < now() - make_interval(months => co.retention_months)`);
  for (const { id } of rows) {
    const { rows: docs } = await query('DELETE FROM cv_documents WHERE candidate_id = $1 RETURNING storage_key', [id]);
    await query(`UPDATE candidates SET full_name = 'Candidat anonymisé', email = NULL, phone = 'anon-' || substr(id::text, 1, 12),
                 city = NULL, headline = NULL, skills = '{}', anonymized_at = now() WHERE id = $1`, [id]);
    await Promise.all(docs.map((d) => deleteCv(d.storage_key)));
  }
  return rows.length;
}
