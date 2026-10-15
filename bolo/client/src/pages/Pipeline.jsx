import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { MapPin, CalendarClock, Users, Clock, Settings2, ExternalLink, Lock } from 'lucide-react';
import { api, fmtDate, years } from '../api.js';
import { useApi, useToast } from '../hooks.js';
import { useSession } from '../session.jsx';
import { Avatar, Dots, Lang, SourceIcon, Toast } from '../components/ui.jsx';

export default function Pipeline() {
  const { id } = useParams();
  const nav = useNavigate();
  const { session } = useSession();
  const { data, reload, setData } = useApi(`/jobs/${id}/pipeline`);
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [reject, setReject] = useState(null);
  const [closing, setClosing] = useState(false);
  const [toast, show] = useToast();
  if (!data) return <div className="page" />;
  const { job, stages, cards } = data;

  const doMove = async (card, stage, reason) => {
    const prev = data;
    setData({ ...data, cards: cards.map((c) => (c.id === card.id ? { ...c, stage_id: stage.id, days_in_stage: 0 } : c)) });
    try {
      await api(`/applications/${card.id}/move`, { method: 'POST', body: { stage_id: stage.id, reason } });
      const note = stage.kind === 'rejected' ? 'réponse envoyée dans 48 h' : stage.email_key ? 'message envoyé au candidat' : 'historique mis à jour';
      show(`${card.full_name} → ${stage.name} · ${note}`);
    } catch (err) { setData(prev); show(err.message); }
  };
  const onDrop = (stage) => {
    setOver(null);
    const card = cards.find((c) => c.id === drag);
    if (!card || card.stage_id === stage.id) return;
    if (stage.kind === 'rejected') setReject({ card, stage, reason: '' }); else doMove(card, stage);
  };
  const close = async () => { const r = await api(`/jobs/${id}/close`, { method: 'POST', body: { answer_remaining: true } }); setClosing(false); show(`Offre clôturée · ${r.answered} candidat(s) informé(s)`); reload(); };
  const active = cards.filter((c) => stages.find((s) => s.id === c.stage_id)?.kind === 'active').length;
  return (
    <div className="page">
      <div className="page-head" style={{ marginBottom: 10 }}>
        <div><p className="small" style={{ margin: 0 }}><Link to="/offres" className="muted">Offres d’emploi</Link> / Pipeline</p><h1>{job.title}</h1></div>
        <div className="actions">
          {job.status === 'open' && <a className="btn" target="_blank" rel="noreferrer" href={`/carrieres/${session.company.slug}`}><ExternalLink />Page publique</a>}
          <Link className="btn" to={`/offres/${id}/modifier`}><Settings2 />Étapes et offre</Link>
          {job.status === 'open' && <button className="btn" onClick={() => setClosing(true)}><Lock />Clôturer</button>}
        </div>
      </div>
      <div className="board-head">
        <div className="meta">
          <span><MapPin />{job.location}</span><span>{job.contract_type}</span>
          {job.deadline && <span><CalendarClock />jusqu’au {fmtDate(job.deadline, { day: 'numeric', month: 'long' })}</span>}
          <span><Users />{cards.length} candidatures · {active} en cours</span>
        </div>
      </div>
      <div className="board">
        {stages.map((s) => {
          const list = cards.filter((c) => c.stage_id === s.id);
          return (
            <div key={s.id} className={`col ${s.kind} ${over === s.id ? 'drop' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOver(s.id); }} onDragLeave={() => setOver(null)} onDrop={() => onDrop(s)}>
              <div className="col-h"><b>{s.name}</b><span className="n">{list.length}</span>{s.sla_days && <span className="sla" title="Délai maximal dans l’étape"><Clock />{s.sla_days} j</span>}</div>
              {list.map((c) => {
                const late = s.kind === 'active' && s.sla_days && c.days_in_stage > s.sla_days;
                return (
                  <div key={c.id} className={`kcard ${drag === c.id ? 'dragging' : ''}`} draggable onDragStart={() => setDrag(c.id)} onDragEnd={() => setDrag(null)}
                    onClick={() => nav(`/candidatures/${c.id}`)}>
                    <div className="top"><Avatar name={c.full_name} /><div style={{ minWidth: 0 }}><div className="nm">{c.full_name}</div></div></div>
                    <div className="hl">{c.headline || `${years(c.experience_years)} d’expérience`}</div>
                    <div className="ft"><SourceIcon source={c.source} /><Lang lang={c.language} />{c.rating ? <Dots value={c.rating} /> : null}
                      {s.kind === 'active' && <span className={`age ${late ? 'late' : ''}`}><Clock />{c.days_in_stage} j</span>}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {reject && (
        <div className="modal-bg"><div className="modal">
          <h3>Ne pas retenir {reject.card.full_name}</h3>
          <p className="muted" style={{ marginTop: 0 }}>Le motif reste interne. Le candidat reçoit une réponse courtoise dans {reject.card.language === 'en' ? 'sa langue (anglais)' : 'sa langue (français)'} dans 48 h ; vous pouvez annuler d’ici là.</p>
          <label className="lbl">Motif (obligatoire)</label>
          <select className="field" value={reject.reason} onChange={(e) => setReject({ ...reject, reason: e.target.value })}>
            <option value="">Choisir…</option>{['Expérience insuffisante', 'Compétences ne correspondant pas', 'Prétentions salariales', 'Candidat injoignable', 'Autre candidat retenu'].map((r) => <option key={r}>{r}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="btn" onClick={() => setReject(null)}>Annuler</button>
            <button className="btn primary" disabled={!reject.reason} onClick={() => { doMove(reject.card, reject.stage, reject.reason); setReject(null); }}>Confirmer</button>
          </div>
        </div></div>
      )}
      {closing && (
        <div className="modal-bg"><div className="modal">
          <h3>Clôturer l’offre</h3>
          <p className="muted" style={{ marginTop: 0 }}>{active} candidat(s) sont encore en cours. Bolo leur enverra une réponse dans leur langue : aucun candidat ne reste sans nouvelles.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}><button className="btn" onClick={() => setClosing(false)}>Annuler</button><button className="btn primary" onClick={close}>Clôturer et répondre</button></div>
        </div></div>
      )}
      <Toast msg={toast} />
    </div>
  );
}
