import { Router } from 'express';
import { query } from '../db/index.js';
import { ah } from '../middleware/errors.js';

const r = Router();

r.get('/', ah(async (req, res) => {
  const cid = req.user.company_id;
  const [kpi, funnel, sources, weekly, overdue, stageTime] = await Promise.all([
    query(`SELECT
        (SELECT count(*) FROM jobs WHERE company_id = $1 AND status = 'open')::int AS open_jobs,
        count(*) FILTER (WHERE a.created_at > now() - interval '30 days')::int AS applications_30d,
        count(*) FILTER (WHERE a.created_at > now() - interval '7 days')::int AS applications_7d,
        count(*) FILTER (WHERE s.kind = 'active')::int AS in_progress,
        count(*) FILTER (WHERE j.status = 'open' AND s.kind = 'active' AND s.sla_days IS NOT NULL AND a.stage_entered_at < now() - make_interval(days => s.sla_days))::int AS overdue,
        count(*) FILTER (WHERE s.kind = 'hired')::int AS hired,
        count(*) FILTER (WHERE s.kind <> 'active')::int AS finished,
        count(*) FILTER (WHERE s.kind <> 'active' AND a.answered_at IS NOT NULL)::int AS answered,
        round(avg(EXTRACT(EPOCH FROM (h.moved_at - a.created_at)) / 86400) FILTER (WHERE s.kind = 'hired'))::int AS days_to_hire
      FROM applications a JOIN jobs j ON j.id = a.job_id JOIN stages s ON s.id = a.stage_id
      LEFT JOIN LATERAL (SELECT moved_at FROM stage_history WHERE application_id = a.id AND to_stage_id = a.stage_id ORDER BY moved_at DESC LIMIT 1) h ON true
      WHERE j.company_id = $1`, [cid]),
    // how many applications reached each step (by position in the pipeline), all open jobs together
    query(`WITH reached AS (
        SELECT a.id, max(st.position) FILTER (WHERE st.kind = 'active') AS max_pos, bool_or(st.kind = 'hired') AS hired
          FROM applications a JOIN jobs j ON j.id = a.job_id AND j.company_id = $1 AND j.status = 'open'
          JOIN stage_history h ON h.application_id = a.id JOIN stages st ON st.id = h.to_stage_id GROUP BY a.id)
      SELECT p.position, p.name, (SELECT count(*) FROM reached r WHERE r.max_pos >= p.position OR r.hired)::int AS n
        FROM (SELECT DISTINCT ON (position) position, name FROM stage_templates WHERE company_id = $1 AND kind = 'active' ORDER BY position) p
      UNION ALL SELECT 99, 'Recruté', (SELECT count(*) FROM reached WHERE hired)::int ORDER BY 1`, [cid]),
    query(`SELECT a.source, count(*)::int AS n FROM applications a JOIN jobs j ON j.id = a.job_id
            WHERE j.company_id = $1 GROUP BY a.source ORDER BY n DESC`, [cid]),
    query(`SELECT to_char(w, 'DD/MM') AS week, (SELECT count(*) FROM applications a JOIN jobs j ON j.id = a.job_id
              WHERE j.company_id = $1 AND a.created_at >= w AND a.created_at < w + interval '7 days')::int AS n
             FROM generate_series(date_trunc('week', now()) - interval '7 weeks', date_trunc('week', now()), interval '1 week') w`, [cid]),
    query(`SELECT a.id, c.full_name, j.title, s.name AS stage, EXTRACT(EPOCH FROM now() - a.stage_entered_at)::int / 86400 AS days, s.sla_days
             FROM applications a JOIN jobs j ON j.id = a.job_id JOIN stages s ON s.id = a.stage_id JOIN candidates c ON c.id = a.candidate_id
            WHERE j.company_id = $1 AND j.status = 'open' AND s.kind = 'active' AND s.sla_days IS NOT NULL
              AND a.stage_entered_at < now() - make_interval(days => s.sla_days)
            ORDER BY a.stage_entered_at LIMIT 6`, [cid]),
    query(`SELECT f.name, round(avg(EXTRACT(EPOCH FROM (h.moved_at - prev.moved_at)) / 86400)::numeric, 1)::float AS days
             FROM stage_history h JOIN stage_history prev ON prev.application_id = h.application_id AND prev.to_stage_id = h.from_stage_id
             JOIN stages f ON f.id = h.from_stage_id JOIN jobs j ON j.id = f.job_id
            WHERE j.company_id = $1 AND f.kind = 'active' GROUP BY f.name ORDER BY min(f.position) LIMIT 6`, [cid]),
  ]);
  res.json({ kpi: kpi.rows[0], funnel: funnel.rows, sources: sources.rows, weekly: weekly.rows, overdue: overdue.rows, stageTime: stageTime.rows });
}));

export default r;
