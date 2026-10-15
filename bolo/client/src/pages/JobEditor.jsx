import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GripVertical, Trash2, Plus, ArrowUp } from 'lucide-react';
import { api } from '../api.js';

const KIND = { active: 'Étape', hired: 'Recruté', rejected: 'Non retenu' };
const MAILS = { '': 'Aucun message', interview: 'Invitation entretien', test: 'Test', offer: 'Proposition', hired: 'Bienvenue', rejected: 'Réponse négative' };
const EMPTY = { title: '', department: '', location: 'Douala', contract_type: 'CDI', openings: 1, deadline: '', description: '', requirements: '', skills: [] };

export default function JobEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [job, setJob] = useState(EMPTY);
  const [stages, setStages] = useState([]);
  const [tag, setTag] = useState('');
  const [error, setError] = useState(null);
  useEffect(() => { if (id) api(`/jobs/${id}`).then((j) => { setJob({ ...j, deadline: j.deadline ?? '' }); setStages(j.stages); }); }, [id]);
  const set = (k) => (e) => setJob({ ...job, [k]: e.target.value });
  const moveStage = (i, d) => { const s = [...stages]; [s[i], s[i + d]] = [s[i + d], s[i]]; setStages(s); };
  const save = async (publish) => {
    setError(null);
    const body = { ...job, openings: Number(job.openings), deadline: job.deadline || null, department: job.department || null };
    for (const k of ['id', 'company_id', 'slug', 'status', 'created_by', 'published_at', 'closed_at', 'created_at', 'stages', 'recruiters']) delete body[k];
    try {
      const saved = id ? await api(`/jobs/${id}`, { method: 'PATCH', body }) : await api('/jobs', { method: 'POST', body });
      if (id) await api(`/jobs/${id}/stages`, { method: 'PUT', body: stages.map(({ id: sid, name, kind, sla_days, email_key }) => ({ id: sid, name, kind, sla_days: sla_days ? Number(sla_days) : null, email_key: email_key || null })) });
      if (publish) await api(`/jobs/${saved.id}/publish`, { method: 'POST' });
      nav(`/offres/${saved.id}`);
    } catch (err) { setError(err.body?.fields?.map((f) => `${f.path} : ${f.message}`).join(' · ') || err.message); }
  };
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>{id ? 'Modifier l’offre' : 'Nouvelle offre'}</h1><p>Les étapes du processus sont propres à cette offre.</p></div>
        <div className="actions"><button className="btn" onClick={() => save(false)}>Enregistrer</button><button className="btn primary" onClick={() => save(true)}>Enregistrer et publier</button></div>
      </div>
      {error && <div className="alert" style={{ marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 16, alignItems: 'start' }}>
        <div className="card card-b" style={{ paddingTop: 18 }}>
          <div className="form-row"><label className="lbl">Intitulé du poste</label><input className="field" value={job.title} onChange={set('title')} placeholder="Ex. Comptable confirmé(e)" /></div>
          <div className="grid3">
            <div className="form-row"><label className="lbl">Lieu</label><input className="field" value={job.location} onChange={set('location')} /></div>
            <div className="form-row"><label className="lbl">Contrat</label><select className="field" value={job.contract_type} onChange={set('contract_type')}>{['CDI', 'CDD', 'Stage', 'Freelance'].map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="form-row"><label className="lbl">Date limite</label><input className="field" type="date" value={job.deadline} onChange={set('deadline')} /></div>
          </div>
          <div className="grid2">
            <div className="form-row"><label className="lbl">Service</label><input className="field" value={job.department ?? ''} onChange={set('department')} /></div>
            <div className="form-row"><label className="lbl">Nombre de postes</label><input className="field" type="number" min="1" value={job.openings} onChange={set('openings')} /></div>
          </div>
          <div className="form-row"><label className="lbl">Description et missions</label><textarea className="field" rows="6" value={job.description} onChange={set('description')} /></div>
          <div className="form-row"><label className="lbl">Profil recherché</label><textarea className="field" rows="4" value={job.requirements ?? ''} onChange={set('requirements')} /></div>
          <div className="form-row"><label className="lbl">Compétences clés (servent à la recherche)</label>
            <div className="tags">{job.skills.map((s) => <span key={s} className="chip">{s}<button onClick={() => setJob({ ...job, skills: job.skills.filter((x) => x !== s) })} style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0 }}>×</button></span>)}
              <input value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && tag.trim()) { e.preventDefault(); setJob({ ...job, skills: [...job.skills, tag.trim()] }); setTag(''); } }} placeholder="Ajouter puis Entrée" /></div></div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Étapes du recrutement</h3><span className="muted small" style={{ marginLeft: 'auto' }}>délai max · message envoyé</span></div>
          <div className="card-b">
            {!id && <p className="muted">Les étapes par défaut de l’entreprise seront copiées à la création ; vous pourrez ensuite les adapter.</p>}
            {stages.map((s, i) => (
              <div key={s.id ?? i} className="stage-ed">
                <span className="handle"><GripVertical size={16} /></span>
                <div><input className="field" value={s.name} onChange={(e) => setStages(stages.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <span className="kind" style={{ color: s.kind === 'hired' ? 'var(--moss)' : s.kind === 'rejected' ? 'var(--error)' : 'var(--ink-3)' }}>{KIND[s.kind]}</span></div>
                <input className="field" type="number" min="1" placeholder="—" value={s.sla_days ?? ''} onChange={(e) => setStages(stages.map((x, j) => (j === i ? { ...x, sla_days: e.target.value } : x)))} title="Délai maximal (jours)" />
                <select className="field" value={s.email_key ?? ''} onChange={(e) => setStages(stages.map((x, j) => (j === i ? { ...x, email_key: e.target.value } : x)))}>{Object.entries(MAILS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <span style={{ display: 'flex', gap: 0 }}>
                  {s.kind === 'active' && i > 0 && <>
                    <button className="btn ghost sm" style={{ padding: 2 }} title="Monter" disabled={i < 2} onClick={() => moveStage(i, -1)}><ArrowUp size={13} /></button>
                    <button className="btn ghost sm" style={{ padding: 2 }} title="Supprimer" onClick={() => setStages(stages.filter((_, j) => j !== i))}><Trash2 size={13} /></button></>}
                </span>
              </div>
            ))}
            {id && <button className="btn sm" style={{ marginTop: 12 }} onClick={() => { const at = stages.findIndex((s) => s.kind !== 'active'); const s = [...stages]; s.splice(at, 0, { name: 'Nouvelle étape', kind: 'active', sla_days: 3 }); setStages(s); }}><Plus />Ajouter une étape</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
