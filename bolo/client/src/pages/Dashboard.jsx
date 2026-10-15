import { Link } from 'react-router-dom';
import { Briefcase, Inbox, Timer, MessageSquareReply, AlertTriangle } from 'lucide-react';
import { useApi } from '../hooks.js';
import { useSession } from '../session.jsx';
import { SOURCES } from '../api.js';
import { SourceGlyph } from '../components/ui.jsx';

function Ring({ value }) {
  const r = 46, c = 2 * Math.PI * r;
  return (
    <div className="ring">
      <svg width="108" height="108"><circle cx="54" cy="54" r={r} fill="none" stroke="var(--paper-2)" strokeWidth="10" />
        <circle cx="54" cy="54" r={r} fill="none" stroke="var(--moss)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 54 54)" /></svg>
      <b>{value}%</b>
    </div>
  );
}

export default function Dashboard() {
  const { data } = useApi('/dashboard');
  const { session } = useSession();
  if (!data) return <div className="page" />;
  const { kpi, funnel, sources, weekly, overdue, stageTime } = data;
  const answerRate = kpi.finished ? Math.round((kpi.answered / kpi.finished) * 100) : 100;
  const top = Math.max(1, ...funnel.map((f) => f.n));
  const wmax = Math.max(1, ...weekly.map((w) => w.n));
  const stotal = sources.reduce((a, s) => a + s.n, 0) || 1;
  const d = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const today = d[0].toUpperCase() + d.slice(1);
  return (
    <div className="page">
      <div className="page-head">
        <div><p className="small" style={{ margin: 0 }}>{today}</p><h1>Bonjour {session.user.fullName.split(' ').slice(-1)[0]}</h1></div>
        <div className="actions"><Link to="/offres/nouvelle" className="btn primary"><Briefcase />Publier une offre</Link></div>
      </div>
      <div className="kpis">
        <div className="card kpi"><div className="l"><Briefcase />Offres ouvertes</div><div className="v">{kpi.open_jobs}</div><div className="d">{kpi.in_progress} candidatures en cours</div></div>
        <div className="card kpi"><div className="l"><Inbox />Candidatures (30 j)</div><div className="v num">{kpi.applications_30d}</div>
          <div className="d"><b className="up">+{kpi.applications_7d}</b> ces 7 derniers jours</div></div>
        <div className="card kpi"><div className="l"><Timer />Délai moyen de recrutement</div><div className="v">{kpi.days_to_hire ?? '–'}<small>jours</small></div><div className="d">{kpi.hired} recrutement(s) conclu(s)</div></div>
        <div className="card kpi"><div className="l"><AlertTriangle />En retard sur le délai</div><div className="v" style={{ color: kpi.overdue ? 'var(--ochre)' : undefined }}>{kpi.overdue}</div><div className="d">candidats qui attendent trop longtemps</div></div>
      </div>
      <div className="dash">
        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <div className="card">
            <div className="card-h"><h3>Entonnoir de recrutement</h3><span className="muted small">offres ouvertes · nombre de candidats ayant atteint chaque étape</span></div>
            <div className="card-b">
              {funnel.map((f) => (
                <div key={f.position} className={`funnel-row ${f.position === 99 ? 'hired' : ''}`}>
                  <span>{f.name}</span><span className="bar"><i style={{ width: `${(f.n / top) * 100}%` }} /></span>
                  <b className="num" style={{ textAlign: 'right' }}>{f.n}</b><span className="pct">{Math.round((f.n / top) * 100)} %</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
            <div className="card"><div className="card-h"><h3>Candidatures par semaine</h3></div>
              <div className="card-b"><div className="weekly">{weekly.map((w) => (
                <div key={w.week}><b className="num">{w.n || ''}</b><i style={{ height: `${(w.n / wmax) * 80}%` }} /><span>{w.week}</span></div>))}</div></div></div>
            <div className="card"><div className="card-h"><h3>Temps moyen par étape</h3></div>
              <div className="card-b">{stageTime.map((s) => (
                <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--line)' }}><span>{s.name}</span><b className="num">{s.days} j</b></div>))}</div></div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <div className="card"><div className="card-h"><MessageSquareReply size={17} /><h3>Réponse garantie</h3></div>
            <div className="card-b" style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
              <Ring value={answerRate} />
              <div><p style={{ margin: 0 }}><b>{kpi.answered}</b> candidats sur <b>{kpi.finished}</b> dont le dossier est clos ont reçu une réponse.</p>
                <p className="muted small" style={{ marginBottom: 0 }}>Les refus partent 48 h après la décision, dans la langue du candidat.</p></div>
            </div></div>
          <div className="card"><div className="card-h"><h3>À traiter en priorité</h3><Link to="/candidats" className="link">Tout voir</Link></div>
            <div className="card-b" style={{ paddingTop: 6 }}>
              {overdue.map((o) => (
                <Link to={`/candidatures/${o.id}`} key={o.id} className="late-row">
                  <div><b>{o.full_name}</b><div className="muted small">{o.title} · {o.stage}</div></div>
                  <span className="days">{o.days} j / {o.sla_days} j</span>
                </Link>))}
              {overdue.length === 0 && <p className="muted">Aucun candidat en attente au-delà du délai.</p>}
            </div></div>
          <div className="card"><div className="card-h"><h3>D’où viennent les candidatures</h3></div>
            <div className="card-b">{sources.map((s) => (
              <div key={s.source} className="src-row"><SourceGlyph source={s.source} /><span>{SOURCES[s.source]}</span><b className="num">{Math.round((s.n / stotal) * 100)} %</b>
                <span className="src-bar"><i style={{ width: `${(s.n / stotal) * 100}%` }} /></span></div>))}</div></div>
        </div>
      </div>
    </div>
  );
}
