// Small fetch wrapper. The session is an httpOnly cookie: no token is kept in JavaScript.
export class ApiError extends Error {
  constructor(status, body) { super(body?.error || `HTTP ${status}`); this.status = status; this.body = body; }
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth') && !path.startsWith('/public')) window.location.assign('/connexion');
    throw new ApiError(res.status, data);
  }
  return data;
}

export const SOURCES = {
  career_page: 'Page carrière', whatsapp: 'WhatsApp', email: 'E-mail', walk_in: 'Dépôt physique', referral: 'Recommandation', linkedin: 'LinkedIn',
};

export const fmtDate = (d, opts = { day: '2-digit', month: 'short' }) => new Date(d).toLocaleDateString('fr-FR', opts);
export const fmtDateTime = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export function ago(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 3600) return `il y a ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  const days = Math.round(s / 86400);
  return days === 1 ? 'hier' : `il y a ${days} j`;
}
export const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const years = (n) => `${n} an${n > 1 ? 's' : ''}`;
export const fmtPhone = (p) => (/^\+2376\d{8}$/.test(p) ? `+237 ${p.slice(4, 5)} ${p.slice(5, 7)} ${p.slice(7, 9)} ${p.slice(9, 11)} ${p.slice(11)}` : p);
