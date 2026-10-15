import { query } from '../db/index.js';

export function audit(req, action, entity, entityId, detail, client = { query }) {
  return client.query(
    'INSERT INTO audit_logs (company_id, user_id, action, entity, entity_id, detail, ip) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [req.user.company_id, req.user.id, action, entity, entityId ?? null, detail ?? null, req.ip],
  );
}
