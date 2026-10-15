import { useState } from 'react';
import { Eye, ArrowRightLeft, Briefcase, UserX, UserPlus, Inbox } from 'lucide-react';
import { useApi } from '../hooks.js';
import { fmtDateTime } from '../api.js';

const ACTIONS = { 'cv.view': ['Consultation de CV', Eye], 'application.move': ['Changement d’étape', ArrowRightLeft], 'application.capture': ['Saisie d’un CV reçu', Inbox],
  'job.create': ['Création d’offre', Briefcase], 'job.publish': ['Publication', Briefcase], 'job.close': ['Clôture d’offre', Briefcase], 'job.stages': ['Étapes modifiées', Briefcase],
  'candidate.anonymize': ['Droit à l’effacement', UserX], 'user.create': ['Création de compte', UserPlus] };

export default function AuditLog() {
  const [filter, setFilter] = useState('');
  const { data } = useApi(`/audit${filter ? `?action=${filter}` : ''}`);
  return (
    <div className="page">
      <div className="page-head"><div><h1>Journal d’accès</h1><p>Qui a consulté quel CV, et quand. Le journal ne peut pas être modifié depuis l’application.</p></div>
        <div className="actions"><select className="field" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 230 }}>
          <option value="">Toutes les actions</option><option value="cv.view">Consultations de CV</option><option value="application">Candidatures</option><option value="job">Offres</option><option value="candidate">Effacements</option></select></div></div>
      <div className="card"><table className="tbl">
        <thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Détail</th><th>Adresse IP</th></tr></thead>
        <tbody>{data?.map((l, i) => { const [label, I] = ACTIONS[l.action] ?? [l.action, Eye]; return (
          <tr key={i}><td className="num muted">{fmtDateTime(l.created_at)}</td><td><b>{l.by}</b></td>
            <td><span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}><I size={15} color={l.action === 'cv.view' ? 'var(--laterite)' : 'var(--ink-3)'} />{label}</span></td>
            <td>{l.detail}</td><td className="muted num">{l.ip?.replace('::ffff:', '')}</td></tr>); })}</tbody>
      </table></div>
    </div>
  );
}
