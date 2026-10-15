// Messages to candidates (bilingual templates, queued in the outbox) and in-app notifications.
import { config } from '../config.js';

export const DEFAULT_TEMPLATES = {
  received: {
    fr: ['Candidature reçue – {{job}}', 'Bonjour {{name}},\n\nNous avons bien reçu votre candidature au poste de {{job}} chez {{company}}. Vous pouvez suivre son avancement ici : {{trackingUrl}}\n\nCordialement,\nL’équipe RH'],
    en: ['Application received – {{job}}', 'Dear {{name}},\n\nWe have received your application for the position of {{job}} at {{company}}. You can follow its progress here: {{trackingUrl}}\n\nKind regards,\nThe HR team'],
  },
  interview: {
    fr: ['Invitation à un entretien – {{job}}', 'Bonjour {{name}},\n\nVotre profil a retenu notre attention pour le poste de {{job}}. Nous vous contacterons au {{phone}} pour fixer la date de l’entretien.\n\nCordialement,\nL’équipe RH'],
    en: ['Interview invitation – {{job}}', 'Dear {{name}},\n\nYour profile caught our attention for the position of {{job}}. We will call you on {{phone}} to set the interview date.\n\nKind regards,\nThe HR team'],
  },
  test: {
    fr: ['Test technique – {{job}}', 'Bonjour {{name}},\n\nVous êtes invité(e) à passer un test pour le poste de {{job}}. Les instructions vous seront envoyées par téléphone.\n\nCordialement,\nL’équipe RH'],
    en: ['Technical test – {{job}}', 'Dear {{name}},\n\nYou are invited to take a test for the position of {{job}}. The instructions will be sent to you by phone.\n\nKind regards,\nThe HR team'],
  },
  offer: {
    fr: ['Proposition – {{job}}', 'Bonjour {{name}},\n\nNous avons le plaisir de vous faire une proposition pour le poste de {{job}}. Nous vous appellerons pour en discuter.\n\nCordialement,\nL’équipe RH'],
    en: ['Offer – {{job}}', 'Dear {{name}},\n\nWe are pleased to make you an offer for the position of {{job}}. We will call you to discuss it.\n\nKind regards,\nThe HR team'],
  },
  rejected: {
    fr: ['Votre candidature – {{job}}', 'Bonjour {{name}},\n\nNous vous remercions pour l’intérêt porté au poste de {{job}}. Après étude de votre dossier, nous ne pouvons pas y donner une suite favorable cette fois-ci. Votre profil reste dans notre vivier pendant 24 mois, sauf avis contraire de votre part.\n\nNous vous souhaitons plein succès.\nL’équipe RH'],
    en: ['Your application – {{job}}', 'Dear {{name}},\n\nThank you for your interest in the position of {{job}}. After reviewing your application, we are unable to take it further this time. Your profile stays in our talent pool for 24 months unless you ask otherwise.\n\nWe wish you every success.\nThe HR team'],
  },
  hired: {
    fr: ['Bienvenue chez {{company}}', 'Bonjour {{name}},\n\nNous sommes heureux de vous confirmer votre recrutement au poste de {{job}}. Bienvenue dans l’équipe !\n\nL’équipe RH'],
    en: ['Welcome to {{company}}', 'Dear {{name}},\n\nWe are happy to confirm your recruitment as {{job}}. Welcome to the team!\n\nThe HR team'],
  },
};

export const render = (text, vars) => text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');

// Queues the message attached to a template key, in the candidate's language.
export async function queueCandidateMessage(client, { companyId, applicationId, key, delayHours = 0 }) {
  const { rows } = await client.query(
    `SELECT c.full_name, c.email, c.phone, c.language, j.title, co.name AS company, a.tracking_token,
            t.subject, t.body, t.active
       FROM applications a JOIN candidates c ON c.id = a.candidate_id JOIN jobs j ON j.id = a.job_id
       JOIN companies co ON co.id = j.company_id
       LEFT JOIN email_templates t ON t.company_id = co.id AND t.key = $2 AND t.lang = c.language
      WHERE a.id = $1`, [applicationId, key]);
  const r = rows[0];
  if (!r || r.active === false) return null;
  const [subject, body] = r.subject ? [r.subject, r.body] : DEFAULT_TEMPLATES[key][r.language];
  const vars = { name: r.full_name, job: r.title, company: r.company, phone: r.phone, trackingUrl: `${config.clientUrl}/suivi/${r.tracking_token}` };
  // e-mail when the candidate gave one, otherwise SMS to the phone number
  const channel = r.email ? 'email' : 'sms';
  const { rows: [msg] } = await client.query(
    `INSERT INTO outbox (company_id, application_id, channel, recipient, lang, subject, body, send_after)
     VALUES ($1,$2,$3,$4,$5,$6,$7, now() + make_interval(hours => $8)) RETURNING id, send_after`,
    [companyId, applicationId, channel, r.email || r.phone, r.language, render(subject, vars), render(body, vars), delayHours]);
  return msg;
}

// Notifies every HR user of the company and the recruiters assigned to the job.
export async function notifyTeam(client, { companyId, jobId, type, title, link, exceptUserId }) {
  await client.query(
    `INSERT INTO notifications (user_id, type, title, link)
     SELECT u.id, $3, $4, $5 FROM users u
      WHERE u.company_id = $1 AND u.id IS DISTINCT FROM $6
        AND (u.role IN ('admin', 'hr') OR EXISTS (SELECT 1 FROM job_recruiters jr WHERE jr.job_id = $2 AND jr.user_id = u.id))`,
    [companyId, jobId, type, title, link, exceptUserId ?? null]);
}
