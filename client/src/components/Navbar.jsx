import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import './Navbar.css';

const LINKS = [
  { to: '/#about', label: 'About' },
  { to: '/#details', label: 'Event Details' },
  { to: '/#how-it-works', label: 'How It Works' },
  { to: '/#faq', label: 'FAQ' },
  { to: '/#contact', label: 'Contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="nav">
      <div className="container nav__bar">
        <Link to="/" className="nav__brand" onClick={() => setOpen(false)}>
          <span className="nav__brand-mark" aria-hidden="true">🧺</span>
          <span>ANB Picnic</span>
        </Link>

        <nav className="nav__links" aria-label="Primary">
          {LINKS.map((link) => (
            <a key={link.to} href={link.to}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="nav__actions">
          <Link to="/register" className="btn btn-primary btn-sm">
            Register
          </Link>
        </div>

        <button
          className="nav__toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`nav__toggle-bar ${open ? 'is-open' : ''}`} />
        </button>
      </div>

      <div id="mobile-menu" className={`nav__mobile ${open ? 'is-open' : ''}`}>
        <nav aria-label="Mobile">
          {LINKS.map((link) => (
            <a key={link.to} href={link.to} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <Link to="/register" className="btn btn-primary btn-block" onClick={() => setOpen(false)}>
            Register Now
          </Link>
          <Link to="/admin/login" className="nav__admin-link" onClick={() => setOpen(false)}>
            Organizer login
          </Link>
        </nav>
      </div>
    </header>
  );
}
