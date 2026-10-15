import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Phone, Mail, MapPin, Briefcase, Lock, ShieldCheck, FileText, Send, ChevronRight, Trash2 } from 'lucide-react';
import { api, fmtDateTime, fmtDate, SOURCES, years, fmtPhone } from '../api.js';
import { useApi, useToast } from '../hooks.js';
import { useSession } from '../session.jsx';
import { Avatar, Dots, Lang, SourceIcon, StagePill, Toast } from '../components/ui.jsx';

// The CV is rendered page by page inside the application (pdf.js), with a watermark:
// no download button, nothing left in the browser cache (no-store).
function CvPages({ url, mime }) {
  const [state, setState] = useState({ pages: [], html: null, error: null });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const buf = await (await fetch(url, { credentials: 'same-origin' })).arrayBuffer();
      if (mime === 'application/pdf') {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        const doc = await pdfjs.getDocument({ data: buf }).promise;
        const pages = [];
        for (let i = 1; i <= Math.min(doc.numPages, 6); i++) {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 1.6 });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width; canvas.height = vp.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
          pages.push(canvas.toDataURL('image/png'));
        }
        if (!cancelled) setState({ pages, html: null });
      } else if (mime.startsWith('image/')) {
        if (!cancelled) setState({ pages: [URL.createObjectURL(new Blob([buf], { type: mime }))], html: null });
      } else {
        const mammoth = await import('mammoth');
        const { value } = await mammoth.convertToHtml({ arrayBuffer: buf });
        if (!cancelled) setState({ pages: [], html: value });
      }
    })().catch((error) => !cancelled && setState({ pages: [], html: null, error }));
    return () => { cancelled = true; };
  }, [url, mime]);
  if (state.error) return <div style={{ color: '#fff', padding: 30 }}>Impossible d’afficher ce fichier.</div>;
  return (
    <div className="pages">
      {state.pages.map((src, i) => <img key={i} src={src} alt={`Page ${i + 1}`} />)}
      {state.html && <div className="docx" dangerouslySetInnerHTML={{ __html: state.html }} />}
    </div>
  );
}

function CvViewer({ cv, viewer }) {
  const [link, setLink] = useState(null);
  const [left, setLeft] = useState(0);
  const open = () => api(`/cv/${cv.id}/link`, { method: 'POST' }).then((l) => { setLink(l); setLeft(Math.round((new Date(l.expiresAt) - Date.now()) / 1000)); });
  useEffect(() => { if (cv) open(); }, [cv?.id]);
  useEffect(() => {
    if (!link) return undefined;
    const t = setInterval(() => setLeft(Math.max(0, Math.round((new Date(link.expiresAt) - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [link]);
  if (!cv) return <div className="card empty">Aucun CV</div>;
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="vbar"><FileText size={16} /><b style={{ fontSize: 13 }}>{cv.original_name}</b><span className="muted small">{Math.round(cv.size_bytes / 1024)} Ko</span>
        <span className="lock" style={{ marginLeft: 'auto' }}><Lock />Chiffré · lien valable {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span></div>
      <div className="viewer">
        {link && <CvPages url={link.url} mime={cv.mime} />}
        <div className="wm"><span>CONFIDENTIEL · {viewer} · {new Date().toLocaleDateString('fr-FR')}</span></div>
      </div>
    </div>
  );
}

export default function Application() {
  const { id } = useParams();
  const { session } = useSession();
  const { data: a, reload } = useApi(`/applications/${id}`);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [toast, show] = useToast();
  if (!a) return <div className="page" />;
  const stageIdx = a.stages.findIndex((s) => s.id === a.stage_id);
  const activeStages = a.stages.filter((s) => s.kind === 'active');
  const next = a.stage_kind === 'active' ? a.stages[stageIdx + 1] : null;
  const move = async (s) => { await api(`/applications/${id}/move`, { method: 'POST', body: { stage_id: s.id } }); show(`Déplacé vers ${s.name}`); reload(); };
  const evaluate = async () => { await api(`/applications/${id}/evaluations`, { method: 'POST', body: { score, comment } }); setScore(0); setComment(''); show('Évaluation enregistrée'); reload(); };
  const events = [
    ...a.history.map((h) => ({ at: h.moved_at, kind: 'move', text: h.from_stage ? <>Déplacé de <b>{h.from_stage}</b> vers <b>{h.to_stage}</b>{h.by ? ` par ${h.by}` : ''}{h.reason ? ` · motif : ${h.reason}` : ''}</> : <>Candidature reçue via <b>{SOURCES[a.source]}</b></> })),
    ...a.messages.map((m) => ({ at: m.sent_at || m.send_after, kind: 'msg', text: <>{m.channel === 'sms' ? 'SMS' : 'E-mail'} {m.status === 'sent' ? 'envoyé' : m.status === 'cancelled' ? 'annulé' : 'programmé'} ({m.lang.toUpperCase()}) : « {m.subject} »</> })),
  ].sort((x, y) => new Date(y.at) - new Date(x.at));
  return (
    <div className="page">
      <p className="small" style={{ margin: '0 0 12px' }}><Link to={`/offres/${a.job_id}`} className="muted">{a.job_title}</Link> <ChevronRight size={12} style={{ verticalAlign: -2 }} /> {a.full_name}</p>
      <div className="profile">
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="card card-b" style={{ paddingTop: 18 }}>
            <div className="pf-head"><Avatar name={a.full_name} size="lg" /><div><h1>{a.full_name}</h1><div className="muted">{a.headline}</div></div></div>
            <div className="kv" style={{ marginTop: 16 }}>
              <Phone /><span>{fmtPhone(a.phone)}</span>{a.email && <><Mail /><span>{a.email}</span></>}<MapPin /><span>{a.city}</span>
              <Briefcase /><span>{years(a.experience_years)} d’expérience</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>{a.skills.map((s) => <span key={s} className="chip">{s}</span>)}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}><SourceIcon source={a.source} withLabel /><Lang lang={a.language} /><span className="muted small">Consentement le {fmtDate(a.consent_at)}</span></div>
          </div>
          <div className="card card-b" style={{ paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><b>Étape</b><StagePill name={a.stage_name} kind={a.stage_kind} /></div>
            <div className="stepper">{activeStages.map((s) => <i key={s.id} className={a.stage_kind === 'hired' ? 'hired' : s.position <= (a.stages[stageIdx]?.position ?? 0) && a.stage_kind === 'active' ? 'done' : ''} />)}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {next && <button className="btn primary sm" onClick={() => move(next)}>Passer à « {next.name} »</button>}
              <select className="field" style={{ padding: '5px 8px', width: 'auto' }} value="" onChange={(e) => { const s = a.stages.find((x) => x.id === e.target.value); if (s?.kind !== 'rejected') move(s); }}>
                <option value="">Autre étape…</option>{a.stages.filter((s) => s.id !== a.stage_id && s.kind !== 'rejected').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="card"><div className="card-h"><h3>Évaluations</h3><span style={{ marginLeft: 'auto' }}><Dots value={a.rating} /></span></div>
            <div className="card-b">
              {a.evaluations.map((e, i) => <div key={i} className="eval"><div style={{ display: 'flex', gap: 8 }}><b>{e.by}</b><Dots value={e.score} /><span className="muted small" style={{ marginLeft: 'auto' }}>{fmtDate(e.created_at)}</span></div>{e.comment && <div style={{ color: 'var(--ink-2)' }}>{e.comment}</div>}</div>)}
              <div style={{ display: 'flex', gap: 4, margin: '10px 0 8px' }}>{[1, 2, 3, 4, 5].map((n) => <button key={n} className="btn sm" style={score >= n ? { background: 'var(--ochre)', borderColor: 'var(--ochre)', color: '#fff' } : {}} onClick={() => setScore(n)}>{n}</button>)}</div>
              <textarea className="field" rows="2" placeholder="Votre avis (visible par l’équipe uniquement)" value={comment} onChange={(e) => setComment(e.target.value)} />
              <button className="btn sm" style={{ marginTop: 8 }} disabled={!score} onClick={evaluate}><Send />Enregistrer</button>
            </div></div>
          <div className="card"><div className="card-h"><h3>Historique</h3></div>
            <div className="card-b"><div className="timeline">{events.map((e, i) => <div key={i} className={`tl ${e.kind}`}><time>{fmtDateTime(e.at)}</time>{e.text}</div>)}</div></div></div>
          {session.user.role !== 'recruiter' && <button className="btn ghost danger sm" style={{ justifySelf: 'start' }} onClick={async () => { if (confirm('Anonymiser ce candidat et supprimer ses CV ? Cette action est définitive.')) { await api(`/candidates/${a.candidate_id}`, { method: 'DELETE' }); reload(); } }}><Trash2 />Droit à l’effacement</button>}
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          <CvViewer cv={a.cvs[0]} viewer={session.user.fullName} />
          <p className="muted small" style={{ display: 'flex', gap: 6, alignItems: 'center', margin: 0 }}><ShieldCheck size={14} />Chaque ouverture de ce CV est enregistrée dans le journal d’accès.</p>
          {a.otherApplications.length > 0 && <div className="card card-b"><b>Autres candidatures de cette personne</b>{a.otherApplications.map((o) => <div key={o.id}><Link to={`/candidatures/${o.id}`} style={{ color: 'var(--laterite)' }}>{o.title}</Link> · {o.stage}</div>)}</div>}
        </div>
      </div>
      <Toast msg={toast} />
    </div>
  );
}
