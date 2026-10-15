import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Zap } from 'lucide-react';
import { api, SOURCES, fmtDate, years } from '../api.js';
import { useApi } from '../hooks.js';
import { Avatar, Dots, Lang, SourceIcon, StagePill } from '../components/ui.jsx';

const KINDS = { active: 'En cours', hired: 'Recrutés', rejected: 'Non retenus' };

function highlight(text, q) {
  if (!q || !text) return text;
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.split(re).map((p, i) => (re.test(p) && i % 2 ? <mark key={i}>{p}</mark> : p));
}

export default function Candidates() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [res, setRes] = useState(null);
  const nav = useNavigate();
  const { data: jobs } = useApi('/jobs');
  const f = Object.fromEntries(params.entries());
  useEffect(() => { api(`/candidates?${params.toString()}`).then(setRes); }, [params]);
  const setF = (k, v) => { const p = new URLSearchParams(params); if (v === undefined || v === '' || p.get(k) === String(v)) p.delete(k); else p.set(k, v); setParams(p); };
  return (
    <div className="page">
      <div className="page-head"><div><h1>Candidats</h1><p>La recherche porte sur le profil <b>et sur le texte des CV</b>.</p></div></div>
      <div className="search-layout">
        <div className="card filters">
          <div className="grp"><h4>Offre</h4><select className="field" value={f.job ?? ''} onChange={(e) => setF('job', e.target.value)}><option value="">Toutes les offres</option>{jobs?.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select></div>
          <div className="grp"><h4>Avancement</h4>{Object.entries(KINDS).map(([k, v]) => (
            <label key={k} className="check"><input type="radio" name="kind" checked={f.stage_kind === k} onChange={() => setF('stage_kind', k)} onClick={() => f.stage_kind === k && setF('stage_kind')} />{v}</label>))}</div>
          <div className="grp"><h4>Expérience minimale</h4><div style={{ display: 'flex', gap: 6 }}>{[0, 2, 5, 8].map((n) => (
            <button key={n} className="btn sm" style={f.min_exp === String(n) ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' } : {}} onClick={() => setF('min_exp', n)}>{n === 0 ? 'Tous' : `${n}+ ans`}</button>))}</div></div>
          <div className="grp"><h4>Source</h4>{Object.entries(SOURCES).map(([k, v]) => (
            <label key={k} className="check"><input type="checkbox" checked={f.source === k} onChange={() => setF('source', k)} />{v}</label>))}</div>
          <div className="grp"><h4>Langue du candidat</h4><div style={{ display: 'flex', gap: 6 }}>{['fr', 'en'].map((l) => (
            <button key={l} className="btn sm" style={f.language === l ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' } : {}} onClick={() => setF('language', l)}>{l === 'fr' ? 'Français' : 'English'}</button>))}</div></div>
          <div className="grp"><h4>Note minimale</h4><div style={{ display: 'flex', gap: 6 }}>{[3, 4, 5].map((n) => (
            <button key={n} className="btn sm" style={f.min_rating === String(n) ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' } : {}} onClick={() => setF('min_rating', n)}>{n}+</button>))}</div></div>
        </div>
        <div>
          <form className="card big-search" onSubmit={(e) => { e.preventDefault(); setF('q', q); }}>
            <Search size={20} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex. comptable sage, permis C, react node…" />
            {res && <span className="muted small" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Zap size={13} />{res.total} résultat(s) en {res.ms} ms</span>}
          </form>
          <div className="card" style={{ marginTop: 12 }}>
            <table className="tbl hit">
              <thead><tr><th>Candidat</th><th>Compétences</th><th>Exp.</th><th>Offre · étape</th><th>Note</th><th>Reçu le</th></tr></thead>
              <tbody>{res?.results.map((r) => (
                <tr key={r.application_id} className="click" onClick={() => nav(`/candidatures/${r.application_id}`)}>
                  <td><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Avatar name={r.full_name} /><div><b>{highlight(r.full_name, f.q)}</b>
                    <div className="muted small" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{r.city}<Lang lang={r.language} /><SourceIcon source={r.source} /></div></div></div></td>
                  <td style={{ maxWidth: 230 }}>{r.skills.slice(0, 4).map((s) => <span key={s} className="chip" style={{ margin: '0 4px 4px 0' }}>{highlight(s, f.q)}</span>)}</td>
                  <td className="num">{years(r.experience_years)}</td>
                  <td><div style={{ fontWeight: 500 }}>{r.job_title}</div><StagePill name={r.stage} kind={r.stage_kind} /></td>
                  <td><Dots value={r.rating} /></td>
                  <td className="muted">{fmtDate(r.created_at)}</td>
                </tr>))}</tbody>
            </table>
            {res?.total === 0 && <div className="empty">Aucun candidat ne correspond à ces critères.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
