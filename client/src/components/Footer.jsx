import { Link } from 'react-router-dom';

export default function Footer({ event }) {
  return (
    <footer style={{ background: 'var(--color-primary-dark)', color: '#DCEBE2', padding: '48px 0 28px' }}>
      <div className="container" style={{ display: 'grid', gap: '32px', gridTemplateColumns: '1.3fr 1fr 1fr' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: '#fff', marginBottom: 10 }}>
            🧺 {event?.name || 'ANB Picnic'}
          </div>
          <p style={{ color: '#B9D3C4', maxWidth: 320, marginBottom: 0 }}>
            A day of food, games, and connection for ANB Class 29. Organized by the class executive
            council.
          </p>
        </div>
        <div>
          <p style={{ color: '#fff', fontWeight: 700, marginBottom: 10 }}>Event</p>
          <p style={{ color: '#B9D3C4', marginBottom: 6 }}>{event?.date}</p>
          <p style={{ color: '#B9D3C4', marginBottom: 6 }}>{event?.venue}</p>
          <p style={{ color: '#B9D3C4', marginBottom: 0 }}>{event?.time}</p>
        </div>
        <div>
          <p style={{ color: '#fff', fontWeight: 700, marginBottom: 10 }}>Quick links</p>
          <p style={{ marginBottom: 6 }}>
            <Link to="/register" style={{ color: '#B9D3C4' }}>Register</Link>
          </p>
          <p style={{ marginBottom: 6 }}>
            <a href="/#faq" style={{ color: '#B9D3C4' }}>FAQ</a>
          </p>
          <p style={{ marginBottom: 0 }}>
            <Link to="/admin/login" style={{ color: '#B9D3C4' }}>Organizer login</Link>
          </p>
        </div>
      </div>
      <div className="container" style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <p style={{ color: '#8FB09F', fontSize: '0.85rem', marginBottom: 0 }}>
          © {new Date().getFullYear()} {event?.name || 'ANB Picnic'}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
