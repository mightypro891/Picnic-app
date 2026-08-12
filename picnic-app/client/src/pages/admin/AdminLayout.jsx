import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import './admin.css';

const NAV = [
  { to: '/admin', label: 'Overview', icon: '📊', end: true },
  { to: '/admin/registrations', label: 'Registrations', icon: '📋' },
  { to: '/admin/scanner', label: 'QR Scanner', icon: '📷' },
  { to: '/admin/attendees', label: 'Attendees', icon: '✅' },
  { to: '/admin/promo', label: 'Promo Graphic', icon: '🎨' },
  { to: '/admin/security-log', label: 'Security Log', icon: '🛡️' },
  { to: '/admin/backups', label: 'Backups', icon: '🗄️' },
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function onLogout() {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/admin/login');
    } catch (err) {
      console.error('Logout failed:', err);
      alert('Logout failed. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="admin">
      <aside className={`admin__sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="admin__brand">
          <span aria-hidden="true">🧺</span> Picnic Admin
        </div>
        <nav className="admin__nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin__nav-link ${isActive ? 'is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <span aria-hidden="true">{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin__account">
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{admin?.name}</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-ink-soft)' }}>{admin?.email}</p>
          <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 12 }} onClick={onLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      </aside>

      <div className="admin__main">
        <header className="admin__topbar">
          <button className="admin__menu-toggle" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
            ☰
          </button>
          <span style={{ fontWeight: 600 }}>Admin Dashboard</span>
        </header>
        <div className="admin__content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
