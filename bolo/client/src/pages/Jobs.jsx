import { Link, useNavigate } from 'react-router-dom';
import { Plus, MapPin, ExternalLink } from 'lucide-react';
import { useApi } from '../hooks.js';
import { fmtDate } from '../api.js';
import { useSession } from '../session.jsx';

const STATUS = { open: 'Publiée', draft: 'Brouillon', closed: 'Clôturée' };

export default function Jobs() {
  const { data } = useApi('/jobs');
  const { session } = useSession();
  const nav = useNavigate();
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Offres d’emploi</h1><p>{data ? `${data.filter((j) => j.status === 'open').length} offres publiées sur votre page carrière` : ' '}</p></div>
        <div className="actions">
          <a className="btn" href={`/carrieres/${session.company.slug}`} target="_blank" rel="noreferrer"><ExternalLink />Voir la page carrière</a>
          <Link to="/offres/nouvelle" className="btn primary"><Plus />Nouvelle offre</Link>
        </div>
      </div>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Poste</th><th>Statut</th><th style={{ textAlign: 'right' }}>Candidatures</th><th style={{ textAlign: 'right' }}>Cette semaine</th><th style={{ textAlign: 'right' }}>En retard</th><th>Recrutés</th><th>Date limite</th></tr></thead>
          <tbody>
            {data?.map((j) => (
              <tr key={j.id} className="click" onClick={() => nav(`/offres/${j.id}`)}>
                <td><b>{j.title}</b><div className="muted small" style={{ display: 'flex', gap: 10 }}><span><MapPin size={12} style={{ verticalAlign: -1 }} /> {j.location}</span><span>{j.contract_type}</span>{j.department && <span>{j.department}</span>}</div></td>
                <td><span className={`status ${j.status}`}>{STATUS[j.status]}</span></td>
                <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{j.applications}</td>
                <td className="num" style={{ textAlign: 'right' }}>{j.new_this_week ? `+${j.new_this_week}` : '–'}</td>
                <td className="num" style={{ textAlign: 'right', color: j.overdue ? 'var(--ochre)' : undefined, fontWeight: j.overdue ? 700 : 400 }}>{j.overdue || '–'}</td>
                <td className="num">{j.hired} / {j.openings}</td>
                <td>{j.deadline ? fmtDate(j.deadline, { day: '2-digit', month: 'short', year: 'numeric' }) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
