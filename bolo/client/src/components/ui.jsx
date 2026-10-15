import { Globe, MessageCircle, Mail, Building2, Handshake, AtSign, CheckCircle2 } from 'lucide-react';
import { SOURCES, initials } from '../api.js';

const ICONS = { career_page: Globe, whatsapp: MessageCircle, email: Mail, walk_in: Building2, referral: Handshake, linkedin: AtSign };

export function SourceIcon({ source, withLabel }) {
  const I = ICONS[source] ?? Globe;
  if (withLabel) return <span className="chip"><I />{SOURCES[source]}</span>;
  return <span className="src-ico" title={SOURCES[source]}><I /></span>;
}
export const SourceGlyph = ({ source }) => { const I = ICONS[source] ?? Globe; return <I />; };

export const Lang = ({ lang }) => <span className={`chip lang ${lang}`}>{lang.toUpperCase()}</span>;

export function Dots({ value, max = 5 }) {
  return <span className="dots" title={value ? `${value}/5` : 'Non évalué'}>{Array.from({ length: max }, (_, i) => <i key={i} className={i < (value || 0) ? 'on' : ''} />)}</span>;
}

// soft colour per person, stable from the name
const TINTS = ['#f2dfd5', '#dde6ef', '#e2ece4', '#f3e8cf', '#e9e0ef', '#efe0e0'];
export function Avatar({ name, size }) {
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return <span className={`avatar ${size || ''}`} style={{ background: TINTS[h % TINTS.length] }}>{initials(name)}</span>;
}

export const Toast = ({ msg }) => (msg ? <div className="toast"><CheckCircle2 />{msg}</div> : null);

export const StagePill = ({ name, kind }) => <span className={`stage-pill ${kind}`}>{name}</span>;
