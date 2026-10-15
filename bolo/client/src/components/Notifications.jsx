import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, UserPlus, Star, Flag, Bell } from 'lucide-react';
import { api, ago } from '../api.js';
import { useApi } from '../hooks.js';

const ICON = { new_application: UserPlus, evaluation: Star, job_filled: Flag };

export default function Notifications({ onClose }) {
  const { data } = useApi('/notifications');
  useEffect(() => () => { api('/notifications/read-all', { method: 'POST' }).catch(() => {}); }, []);
  return (
    <div className="modal-bg" onClick={onClose} style={{ placeItems: 'stretch end' }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: 400, borderRadius: 0, overflow: 'auto' }}>
        <div className="card-h" style={{ paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
          <h3 className="display" style={{ fontSize: 20 }}>Notifications</h3>
          <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={onClose}><X /></button>
        </div>
        {data?.items.map((n) => {
          const I = ICON[n.type] ?? Bell;
          return (
            <Link key={n.id} to={n.link || '#'} onClick={onClose} style={{ display: 'flex', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', background: n.read_at ? 'none' : '#fbf6ef' }}>
              <span className="src-ico" style={{ width: 30, height: 30, color: n.type === 'job_filled' ? 'var(--moss)' : 'var(--laterite)' }}><I /></span>
              <span><span style={{ display: 'block', fontWeight: n.read_at ? 400 : 600 }}>{n.title}</span><span className="muted small">{ago(n.created_at)}</span></span>
            </Link>
          );
        })}
        {data?.items.length === 0 && <div className="empty">Aucune notification</div>}
      </div>
    </div>
  );
}
