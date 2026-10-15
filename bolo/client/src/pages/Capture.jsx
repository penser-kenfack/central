import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileCheck2, Camera } from 'lucide-react';
import { api, SOURCES } from '../api.js';
import { useApi } from '../hooks.js';
import { SourceGlyph } from '../components/ui.jsx';

// HR enters an application received outside the career page: WhatsApp, e-mail, paper CV, referral.
export default function Capture() {
  const { data: jobs } = useApi('/jobs');
  const nav = useNavigate();
  const [f, setF] = useState({ job_id: '', source: 'whatsapp', full_name: '', phone: '', email: '', city: 'Douala', language: 'fr', experience_years: 0, skills: '', consent: false });
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setError(null);
    const form = new FormData();
    Object.entries(f).forEach(([k, v]) => form.append(k, String(v)));
    if (file) form.append('cv', file);
    try { const r = await api('/applications', { method: 'POST', form }); nav(`/candidatures/${r.id}`); }
    catch (err) { setError(err.body?.fields?.map((x) => x.message).join(' · ') || err.message); }
  };
  return (
    <div className="page">
      <div className="page-head"><div><h1>Saisir un CV reçu</h1><p>Pour un CV arrivé par WhatsApp, par e-mail ou déposé au bureau : il rejoint le même pipeline que les candidatures en ligne.</p></div></div>
      <form className="card card-b" style={{ maxWidth: 820, paddingTop: 20 }} onSubmit={submit}>
        {error && <div className="alert" style={{ marginBottom: 14 }}>{error}</div>}
        <label className="lbl">Comment ce CV est-il arrivé ?</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {['whatsapp', 'email', 'walk_in', 'referral', 'linkedin'].map((s) => (
            <button type="button" key={s} className="btn" onClick={() => setF({ ...f, source: s })} style={f.source === s ? { borderColor: 'var(--laterite)', background: 'var(--laterite-tint)', color: 'var(--laterite-dark)' } : {}}><SourceGlyph source={s} />{SOURCES[s]}</button>))}
        </div>
        <div className="grid2">
          <div className="form-row"><label className="lbl">Offre</label><select className="field" value={f.job_id} onChange={set('job_id')} required><option value="">Choisir une offre…</option>{jobs?.filter((j) => j.status === 'open').map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select></div>
          <div className="form-row"><label className="lbl">Nom complet</label><input className="field" value={f.full_name} onChange={set('full_name')} required /></div>
          <div className="form-row"><label className="lbl">Téléphone (identifiant du candidat)</label><input className="field" value={f.phone} onChange={set('phone')} placeholder="6XX XX XX XX" required /></div>
          <div className="form-row"><label className="lbl">E-mail (facultatif)</label><input className="field" value={f.email} onChange={set('email')} /></div>
          <div className="form-row"><label className="lbl">Langue du candidat</label><select className="field" value={f.language} onChange={set('language')}><option value="fr">Français</option><option value="en">English</option></select></div>
          <div className="form-row"><label className="lbl">Années d’expérience</label><input className="field" type="number" min="0" value={f.experience_years} onChange={set('experience_years')} /></div>
        </div>
        <div className="form-row"><label className="lbl">Compétences (séparées par des virgules)</label><input className="field" value={f.skills} onChange={set('skills')} /></div>
        <label className={`drop ${file ? 'ok' : ''}`}>
          <input type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" hidden onChange={(e) => setFile(e.target.files[0])} />
          {file ? <><FileCheck2 /><span><b>{file.name}</b><br /><span className="small">{Math.round(file.size / 1024)} Ko · sera analysé puis chiffré</span></span></>
            : <><Upload /><div><b>Joindre le CV</b></div><div className="small muted">PDF, Word ou <Camera size={12} style={{ verticalAlign: -2 }} /> photo d’un CV papier · 5 Mo maximum</div></>}
        </label>
        <label className="consent"><input type="checkbox" checked={f.consent} onChange={set('consent')} />Le candidat a accepté que ses données soient utilisées pour ce recrutement (consentement recueilli par téléphone, e-mail ou sur place).</label>
        <button className="btn primary" disabled={!f.consent || !file}>Ajouter au pipeline</button>
      </form>
    </div>
  );
}
