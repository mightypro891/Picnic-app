import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { getMyRegistration } from '../api/registrations.js';
import './TicketPage.css';

export default function TicketPage() {
  const { accessToken } = useParams();
  const [reg, setReg] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMyRegistration(accessToken)
      .then((data) => active && setReg(data))
      .catch((err) => active && setError(err.message || 'Could not load your registration.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [accessToken]);

  return (
    <>
      <Navbar />
      <main>
        <section className="section">
          <div className="container" style={{ maxWidth: 480 }}>
            {loading && <p style={{ textAlign: 'center' }}>Loading your registration…</p>}

            {!loading && error && (
              <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', marginBottom: 8 }}>❌</p>
                <h1 style={{ fontSize: '1.4rem' }}>We couldn't find that registration</h1>
                <p>{error}</p>
              </div>
            )}

            {!loading && reg && reg.status === 'PENDING' && (
              <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</p>
                <h1 style={{ fontSize: '1.4rem' }}>Pending Verification</h1>
                <p>
                  Hi {reg.fullName}, your registration for {reg.event.name} is still being reviewed. You'll get an
                  email as soon as it's verified.
                </p>
              </div>
            )}

            {!loading && reg && reg.status === 'REJECTED' && (
              <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</p>
                <h1 style={{ fontSize: '1.4rem' }}>Registration Not Approved</h1>
                <p>Hi {reg.fullName}, your payment evidence could not be verified.</p>
                {reg.rejectionReason && (
                  <p style={{ fontStyle: 'italic' }}>"{reg.rejectionReason}"</p>
                )}
                <p>Please contact an organizer for help re-submitting your registration.</p>
              </div>
            )}

            {!loading && reg && reg.status === 'APPROVED' && (
              <div className="ticket">
                <div className="ticket__header">
                  <p className="eyebrow" style={{ color: '#DCEBE2' }}>{reg.event.name}</p>
                  <h1 style={{ color: '#fff', fontSize: '1.5rem', margin: '4px 0 0' }}>{reg.fullName}</h1>
                  <p style={{ color: '#DCEBE2', margin: 0 }}>{reg.level} Level</p>
                </div>
                <div className="ticket__body">
                  {reg.qrCodeDataUrl && (
                    <img src={reg.qrCodeDataUrl} alt={`QR code for ticket ${reg.ticketCode}`} className="ticket__qr" />
                  )}
                  <p className="ticket__code">{reg.ticketCode}</p>

                  {reg.ticketStatus === 'CHECKED_IN' ? (
                    <span className="badge badge-checked-in">Checked in</span>
                  ) : (
                    <span className="badge badge-approved">Payment Verified ✓</span>
                  )}

                  <dl className="ticket__facts">
                    <div><dt>Date</dt><dd>{reg.event.date}</dd></div>
                    <div><dt>Time</dt><dd>{reg.event.time}</dd></div>
                    <div><dt>Venue</dt><dd>{reg.event.venue}</dd></div>
                  </dl>

                  <a href={reg.qrCodeDataUrl} download={`${reg.ticketCode}.png`} className="btn btn-primary btn-block">
                    Download Ticket
                  </a>
                  <p className="hint" style={{ textAlign: 'center', marginTop: 12 }}>
                    Present this QR code at the entrance. Screenshots work fine.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer event={reg?.event} />
    </>
  );
}
