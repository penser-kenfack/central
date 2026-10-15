import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, Bell, Mail, ShieldCheck, Search, LogOut, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSession } from '../session.jsx';
import { api } from '../api.js';
import { Avatar } from './ui.jsx';
import Notifications from './Notifications.jsx';

export default function Layout() {
  const { session } = useSession();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const nav = useNavigate();
  useEffect(() => { if (session) api('/notifications').then((n) => setUnread(n.unread)).catch(() => {}); }, [session, open]);
  if (session === undefined) return null;
  if (session === null) return <Navigate to="/connexion" replace />;
  const { user, company } = session;
  const logout = async () => { await api('/auth/logout', { method: 'POST' }); window.location.assign('/connexion'); };
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><img src="/bolo-mark.svg" alt="" /><b>bolo<i>.</i></b></div>
        <div className="company"><strong>{company.name}</strong><span>{company.city} · espace RH</span></div>
        <NavLink end to="/" className="navlink"><LayoutDashboard />Tableau de bord</NavLink>
        <NavLink to="/offres" className="navlink"><Briefcase />Offres d’emploi</NavLink>
        <NavLink to="/candidats" className="navlink"><Users />Candidats</NavLink>
        <button className="navlink" style={{ border: 0, background: 'none', cursor: 'pointer', textAlign: 'left' }} onClick={() => setOpen(true)}>
          <Bell />Notifications{unread > 0 && <span className="count">{unread}</span>}
        </button>
        <div className="section">Paramètres</div>
        <NavLink to="/messages" className="navlink"><Mail />Messages candidats</NavLink>
        <NavLink to="/journal" className="navlink"><ShieldCheck />Journal d’accès</NavLink>
        <div className="me">
          <Avatar name={user.fullName} />
          <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{user.fullName}</div><div className="muted small">{{ admin: 'Administrateur', hr: 'Responsable RH', recruiter: 'Recruteur' }[user.role]}</div></div>
          <button className="btn ghost sm" title="Se déconnecter" onClick={logout} style={{ marginLeft: 'auto', padding: 4 }}><LogOut /></button>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <form className="search-box" onSubmit={(e) => { e.preventDefault(); nav(`/candidats?q=${encodeURIComponent(q)}`); }}>
            <Search size={16} /><input placeholder="Rechercher un candidat, une compétence, un mot du CV" value={q} onChange={(e) => setQ(e.target.value)} /><kbd>↵</kbd>
          </form>
          <NavLink to="/candidatures/nouvelle" className="btn"><Plus />Saisir un CV reçu</NavLink>
        </div>
        <Outlet />
      </div>
      {open && <Notifications onClose={() => setOpen(false)} />}
    </div>
  );
}
