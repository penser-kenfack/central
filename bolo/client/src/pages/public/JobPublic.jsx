import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, FileText, CalendarClock, Upload, FileCheck2, CheckCircle2, MessageCircle, ArrowLeft } from 'lucide-react';
import { useLang, PubTop, Footer } from './i18n.jsx';

// Pictures of paper CVs are resized in the browser before upload to save the candidate's data.
async function shrinkImage(file) {
  if (!file.type.startsWith('image/')) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.75));
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}

export default function JobPublic() {
  const { company, job: slug } = useParams();
  const [lang, setLang, t] = useLang();
  const [job, setJob] = useState(null);
  const [f, setF] = useState({ full_name: '', phone: '', email: '', city: '', experience_years: '', cover_note: '' });
  const [file, setFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState({ busy: false, error: null, done: null });
  const formRef = useRef(null);
  useEffect(() => { fetch(`/api/public/${company}/jobs/${slug}`).then((r) => r.json()).then(setJob); }, [company, slug]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setState({ busy: true, error: null, done: null });
    const form = new FormData();
    Object.entries({ ...f, language: lang, consent: String(consent) }).forEach(([k, v]) => v !== '' && form.append(k, v));
    form.append('cv', file);
    const res = await fetch(`/api/public/${company}/jobs/${slug}/apply`, { method: 'POST', body: form });
    const body = await res.json().catch(() => ({}));
    if (res.ok) setState({ busy: false, error: null, done: body });
    else setState({ busy: false, error: body.fields?.map((x) => x.message).join(' · ') || body.error, done: null });
  };
  if (!job) return <div className="pub" />;
  const co = { name: job.company, city: job.city };
  if (state.done) {
    const link = state.done.trackingToken ? `${window.location.origin}/suivi/${state.done.trackingToken}` : null;
    return (
      <div className="pub"><PubTop company={co} lang={lang} setLang={setLang} />
        <div className="pub-body" style={{ textAlign: 'center', paddingTop: 50 }}>
          <CheckCircle2 size={52} color="var(--moss)" />
          <h1>{t.thanks}</h1>
          <p className="muted">{state.done.duplicate ? t.dup : t.thanksText}</p>
          {link && <Link className="btn primary" to={`/suivi/${state.done.trackingToken}?lang=${lang}`}>{t.follow}</Link>}
        </div><Footer t={t} /></div>
    );
  }
  const share = `https://wa.me/?text=${encodeURIComponent(`${job.title} – ${job.company}\n${window.location.href}`)}`;
  return (
    <div className="pub">
      <PubTop company={co} lang={lang} setLang={setLang} />
      <div className="pub-body">
        <Link to={`/carrieres/${company}?lang=${lang}`} className="muted small" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><ArrowLeft size={14} />{t.back}</Link>
        <h1>{job.title}</h1>
        <div className="job-li" style={{ padding: 0, border: 0, background: 'none' }}><div className="meta"><span><MapPin />{job.location}</span><span><FileText />{job.contract_type}</span>
          {job.deadline && <span><CalendarClock />{t.until} {new Date(job.deadline).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long' })}</span>}</div></div>
        <div className="sec">{t.missions}</div><div className="txt">{job.description}</div>
        {job.requirements && <><div className="sec">{t.profile}</div><div className="txt">{job.requirements}</div></>}
        {job.skills.length > 0 && <><div className="sec">{t.skills}</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{job.skills.map((s) => <span key={s} className="chip">{s}</span>)}</div></>}
        <a className="btn" href={share} style={{ marginTop: 16 }}><MessageCircle />{t.share}</a>

        <form ref={formRef} onSubmit={submit} style={{ marginTop: 26 }}>
          <h1 style={{ fontSize: 22 }}>{t.form}</h1>
          {state.error && <div className="alert" style={{ marginBottom: 12 }}>{state.error}</div>}
          <div className="form-row"><label className="lbl">{t.name}</label><input className="field" value={f.full_name} onChange={set('full_name')} required autoComplete="name" /></div>
          <div className="grid2">
            <div className="form-row"><label className="lbl">{t.phone}</label><input className="field" value={f.phone} onChange={set('phone')} required inputMode="tel" placeholder="6XX XX XX XX" /></div>
            <div className="form-row"><label className="lbl">{t.exp}</label><input className="field" value={f.experience_years} onChange={set('experience_years')} inputMode="numeric" /></div>
          </div>
          <div className="form-row"><label className="lbl">{t.email}</label><input className="field" type="email" value={f.email} onChange={set('email')} autoComplete="email" /></div>
          <label className={`drop ${file ? 'ok' : ''}`}>
            <input type="file" accept=".pdf,.docx,image/*" hidden onChange={async (e) => e.target.files[0] && setFile(await shrinkImage(e.target.files[0]))} />
            {file ? <><FileCheck2 /><span><b>{file.name}</b><br /><span className="small">{Math.round(file.size / 1024)} Ko</span></span></>
              : <><Upload /><div><b>{t.cv}</b></div><div className="small muted">{t.cvHint}</div></>}
          </label>
          <label className="consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />{t.consent}</label>
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center', padding: 13 }} disabled={!consent || !file || state.busy}>{state.busy ? t.sending : t.send}</button>
        </form>
      </div>
      <Footer t={t} />
    </div>
  );
}
