// Business rules of the recruitment process (configurable state machine).
import { HttpError, notFound } from '../middleware/errors.js';
import { config } from '../config.js';
import { queueCandidateMessage, notifyTeam } from './messages.js';

// BR2 – admins and HR manage every job; a recruiter only the jobs assigned to them.
export async function assertCanManageJob(client, user, jobId) {
  const { rows } = await client.query(
    `SELECT j.id FROM jobs j WHERE j.id = $1 AND j.company_id = $2
       AND ($3 IN ('admin','hr') OR EXISTS (SELECT 1 FROM job_recruiters jr WHERE jr.job_id = j.id AND jr.user_id = $4))`,
    [jobId, user.company_id, user.role, user.id]);
  if (!rows[0]) throw notFound('Job');
}

export async function moveApplication(client, user, { applicationId, toStageId, reason }) {
  const { rows: [app] } = await client.query(
    `SELECT a.*, s.kind AS from_kind, j.company_id, j.title, j.openings, c.full_name
       FROM applications a JOIN stages s ON s.id = a.stage_id JOIN jobs j ON j.id = a.job_id
       JOIN candidates c ON c.id = a.candidate_id
      WHERE a.id = $1 AND j.company_id = $2 FOR UPDATE OF a`, [applicationId, user.company_id]);
  if (!app) throw notFound('Application');
  await assertCanManageJob(client, user, app.job_id);
  // BR1 – the target stage must belong to the same job
  const { rows: [target] } = await client.query('SELECT * FROM stages WHERE id = $1 AND job_id = $2', [toStageId, app.job_id]);
  if (!target) throw new HttpError(400, 'This stage does not belong to the job', 'bad_stage');
  if (target.id === app.stage_id) return app;
  // BR3 – a rejection needs a reason
  if (target.kind === 'rejected' && !reason?.trim()) throw new HttpError(400, 'A reason is required to reject a candidate', 'reason_required');

  const final = target.kind !== 'active';
  const { rows: [updated] } = await client.query(
    `UPDATE applications SET stage_id = $2, stage_entered_at = now(),
            answered_at = CASE WHEN $3 THEN coalesce(answered_at, now()) ELSE answered_at END
      WHERE id = $1 RETURNING *`, [applicationId, target.id, final]);
  // BR6 – history in the same transaction
  await client.query('INSERT INTO stage_history (application_id, from_stage_id, to_stage_id, moved_by, reason) VALUES ($1,$2,$3,$4,$5)',
    [applicationId, app.stage_id, target.id, user.id, reason || null]);
  // a candidate moved back from a final stage gets their pending answer cancelled
  if (app.from_kind !== 'active') {
    await client.query("UPDATE outbox SET status = 'cancelled' WHERE application_id = $1 AND status = 'queued'", [applicationId]);
    if (!final) await client.query('UPDATE applications SET answered_at = NULL WHERE id = $1', [applicationId]);
  }
  if (target.email_key) {
    await queueCandidateMessage(client, {
      companyId: app.company_id, applicationId, key: target.email_key,
      delayHours: target.kind === 'rejected' ? config.rejectionDelayHours : 0, // BR3 – no abrupt rejection
    });
  }
  // BR4 – when all openings are filled, the team is told to close the offer
  if (target.kind === 'hired') {
    const { rows: [{ n }] } = await client.query(
      "SELECT count(*)::int AS n FROM applications a JOIN stages s ON s.id = a.stage_id WHERE a.job_id = $1 AND s.kind = 'hired'", [app.job_id]);
    if (n >= app.openings) {
      await notifyTeam(client, { companyId: app.company_id, jobId: app.job_id, type: 'job_filled', title: `Poste pourvu : ${app.title} – pensez à clôturer l’offre`, link: `/offres/${app.job_id}` });
    }
  }
  return updated;
}

// "No candidate left without an answer": closing a job answers everybody still in progress.
export async function closeJob(client, user, jobId, { answerRemaining }) {
  await assertCanManageJob(client, user, jobId);
  const { rows: [rejected] } = await client.query("SELECT id FROM stages WHERE job_id = $1 AND kind = 'rejected' ORDER BY position LIMIT 1", [jobId]);
  let answered = 0;
  if (answerRemaining && rejected) {
    const { rows } = await client.query(
      "SELECT a.id FROM applications a JOIN stages s ON s.id = a.stage_id WHERE a.job_id = $1 AND s.kind = 'active'", [jobId]);
    for (const r of rows) {
      await moveApplication(client, user, { applicationId: r.id, toStageId: rejected.id, reason: 'Offre clôturée' });
      answered++;
    }
  }
  await client.query("UPDATE jobs SET status = 'closed', closed_at = now() WHERE id = $1", [jobId]);
  return { answered };
}
