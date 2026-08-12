import { Link, Navigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { useEvent } from '../hooks/useEvent.js';

export default function RegistrationSuccess() {
  const { event } = useEvent();
  const { state } = useLocation();
  const accessToken = state?.accessToken;

  if (!accessToken) {
    return <Navigate to="/register" replace />;
  }

  return (
    <>
      <Navbar />
      <main>
        <section className="section">
          <div className="container" style={{ maxWidth: 560 }}>
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }} aria-hidden="true">✓</div>
              <h1 style={{ fontSize: '1.7rem', marginBottom: 10 }}>Registration Submitted</h1>
              <p style={{ marginBottom: 4 }}>Your registration is currently <strong>pending verification</strong>.</p>
              <p>
                Once your payment is verified by the organizing team, your {event.name} ticket will be sent to
                your email — you can also check your status any time using the link below.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
                <Link to={`/ticket/${accessToken}`} className="btn btn-primary">
                  View My Registration Status
                </Link>
                <Link to="/" className="btn btn-ghost">
                  Back to Home
                </Link>
              </div>
              <p className="hint" style={{ marginTop: 20 }}>
                Save this page's link — it's the easiest way to check your status or view your ticket later.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer event={event} />
    </>
  );
}
