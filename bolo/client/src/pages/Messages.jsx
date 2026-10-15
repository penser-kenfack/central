import { useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '../api.js';
import { useApi, useToast } from '../hooks.js';
import { Toast } from '../components/ui.jsx';

const LABELS = { received: 'Accusé de réception', interview: 'Invitation à un entretien', test: 'Test pratique', offer: 'Proposition', rejected: 'Réponse négative', hired: 'Bienvenue' };
const VARS = ['{{name}}', '{{job}}', '{{company}}', '{{phone}}', '{{trackingUrl}}'];

export default function Messages() {
  const { data, reload } = useApi('/templates');
  const [key, setKey] = useState('rejected');
  const [edit, setEdit] = useState({});
  const [toast, show] = useToast();
  if (!data) return <div className="page" />;
  const tpl = (lang) => edit[`${key}.${lang}`] ?? data.find((t) => t.key === key && t.lang === lang);
  const change = (lang, k, v) => setEdit({ ...edit, [`${key}.${lang}`]: { ...tpl(lang), [k]: v } });
  const save = async () => {
    for (const lang of ['fr', 'en']) { const t = tpl(lang); await api(`/templates/${key}/${lang}`, { method: 'PUT', body: { subject: t.subject, body: t.body, active: t.active } }); }
    show('Modèles enregistrés'); setEdit({}); reload();
  };
  return (
    <div className="page">
      <div className="page-head"><div><h1>Messages aux candidats</h1><p>Chaque candidat reçoit les messages dans sa langue, par e-mail ou par SMS s’il n’a pas d’e-mail.</p></div>
        <div className="actions"><button className="btn primary" onClick={save}><Save />Enregistrer</button></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 16, alignItems: 'start' }}>
        <div className="card" style={{ padding: 6 }}>{Object.entries(LABELS).map(([k, v]) => (
          <button key={k} className="navlink" style={{ width: '100%', border: 0, background: key === k ? 'var(--paper)' : 'none', cursor: 'pointer', fontWeight: key === k ? 700 : 500 }} onClick={() => setKey(k)}>{v}</button>))}</div>
        <div className="grid2">
          {['fr', 'en'].map((lang) => { const t = tpl(lang); return (
            <div key={lang} className="card card-b" style={{ paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><span className={`chip lang ${lang}`}>{lang.toUpperCase()}</span><b>{lang === 'fr' ? 'Français' : 'English'}</b></div>
              <div className="form-row"><label className="lbl">Objet</label><input className="field" value={t.subject} onChange={(e) => change(lang, 'subject', e.target.value)} /></div>
              <label className="lbl">Message</label><textarea className="field" rows="12" value={t.body} onChange={(e) => change(lang, 'body', e.target.value)} />
            </div>); })}
          <div className="muted small" style={{ gridColumn: '1 / 3' }}>Variables : {VARS.map((v) => <code key={v} className="chip" style={{ marginRight: 6 }}>{v}</code>)}{key === 'rejected' && ' · Les réponses négatives partent 48 h après la décision.'}</div>
        </div>
      </div>
      <Toast msg={toast} />
    </div>
  );
}
