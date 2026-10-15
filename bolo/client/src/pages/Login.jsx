import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { api } from '../api.js';
import { useSession } from '../session.jsx';

// geometric motif inspired by the ndop cloth of the Grassfields
const Pattern = () => (
  <svg className="pattern" width="100%" height="100%">
    <defs>
      <pattern id="ndop" width="56" height="56" patternUnits="userSpaceOnUse">
        <path d="M28 4 L52 28 L28 52 L4 28 Z" fill="none" stroke="#fff" strokeWidth="2" />
        <path d="M28 16 L40 28 L28 40 L16 28 Z" fill="none" stroke="#fff" strokeWidth="2" />
        <circle cx="28" cy="28" r="3" fill="#fff" /><circle cx="0" cy="0" r="3" fill="#fff" /><circle cx="56" cy="0" r="3" fill="#fff" />
        <circle cx="0" cy="56" r="3" fill="#fff" /><circle cx="56" cy="56" r="3" fill="#fff" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#ndop)" />
  </svg>
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const { refresh } = useSession();
  const nav = useNavigate();
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await api('/auth/login', { method: 'POST', body: { email, password } }); await refresh(); nav('/'); }
    catch (err) { setError(err.status === 423 ? 'Compte bloqué 15 minutes après 5 tentatives.' : 'E-mail ou mot de passe incorrect.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="login">
      <div className="art">
        <Pattern />
        <div className="brand" style={{ position: 'relative' }}><img src="/bolo-mark-light.svg" alt="" /><b>bolo<i style={{ color: '#f4c76b' }}>.</i></b></div>
        <h2>Tous vos CV au même endroit. Chaque candidat a une réponse.</h2>
        <p>WhatsApp, e-mail, dépôt au bureau ou page carrière : Bolo rassemble les candidatures, suit chaque étape de votre processus et protège les données de vos candidats.</p>
        <div className="quote">
          <div><b>1 seul</b><span>endroit pour tous les CV</span></div>
          <div><b>AES-256</b><span>CV chiffrés au repos</span></div>
          <div><b>FR · EN</b><span>messages dans la langue du candidat</span></div>
        </div>
      </div>
      <div className="form">
        <form onSubmit={submit}>
          <img src="/bolo-mark.svg" alt="" width="44" />
          <h1>Connexion à l’espace RH</h1>
          <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>Utilisez le compte créé par l’administrateur de votre entreprise.</p>
          {error && <div className="alert" style={{ marginBottom: 14 }}>{error}</div>}
          <div className="form-row"><label className="lbl">Adresse e-mail professionnelle</label><input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@entreprise.cm" required /></div>
          <div className="form-row"><label className="lbl">Mot de passe</label><input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center', padding: 11, marginTop: 6 }} disabled={busy}>Se connecter</button>
          <p className="muted small" style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 18 }}><Lock size={13} />Connexion chiffrée · session expirée après 8 h d’inactivité</p>
        </form>
      </div>
    </div>
  );
}
