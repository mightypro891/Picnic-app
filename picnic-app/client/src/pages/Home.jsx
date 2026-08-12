import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { useEvent } from '../hooks/useEvent.js';
import './Home.css';

const STEPS = [
  {
    label: 'Pay the EXCO',
    text: 'Send your picnic fee directly to the designated EXCO member using the agreed payment method.',
  },
  {
    label: 'Get your link',
    text: 'Once your payment is confirmed, the EXCO sends you the registration form link.',
  },
  {
    label: 'Register & upload evidence',
    text: 'Fill in your details and upload a clear screenshot or receipt of your payment.',
  },
  {
    label: 'Wait for verification',
    text: 'Your registration is reviewed by the organizing team — usually within a day or two.',
  },
  {
    label: 'Receive your ticket',
    text: 'Once approved, your QR ticket lands in your inbox and on your ticket page.',
  },
];

const FAQS = [
  {
    q: 'How do I pay for the picnic?',
    a: 'Payment is made directly to a designated EXCO member through the agreed method. There is no online payment gateway — do not send money anywhere else.',
  },
  {
    q: 'When do I get my ticket?',
    a: 'After you submit the registration form with your payment evidence, the organizing team verifies it and sends your QR ticket by email — usually within a day or two.',
  },
  {
    q: 'What if my payment evidence is rejected?',
    a: "You'll receive an email explaining why. You can reach out to an organizer or re-submit the registration form with clearer evidence.",
  },
  {
    q: 'Can someone else use my ticket?',
    a: 'Each ticket is single-use and tied to your registration. Once scanned at the gate, it cannot be used again.',
  },
  {
    q: 'I lost my ticket email — what do I do?',
    a: 'Keep the link from your registration confirmation — it always shows your current status and ticket. Contact an organizer if you no longer have it.',
  },
];

export default function Home() {
  const { event } = useEvent();

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main">
        {/* HERO */}
        <section className="hero">
          <div className="container hero__grid">
            <div>
              <span className="eyebrow">🧺 Registration now open</span>
              <h1>ANB Class 29, one long green afternoon.</h1>
              <p className="hero__lede">
                Food, games, music, and the people who make lecture halls bearable — all in one field, one day.
                Pay the EXCO, register below, and we'll send your ticket straight to your inbox.
              </p>
              <div className="hero__actions">
                <Link to="/register" className="btn btn-primary">Register Now</Link>
                <a href="#how-it-works" className="btn btn-ghost">How it works</a>
              </div>
              <dl className="hero__facts">
                <div>
                  <dt>Date</dt>
                  <dd>{event.date}</dd>
                </div>
                <div>
                  <dt>Venue</dt>
                  <dd>{event.venue}</dd>
                </div>
                <div>
                  <dt>Fee</dt>
                  <dd>{event.fee}</dd>
                </div>
              </dl>
            </div>
            <div className="hero__card card" aria-hidden="true">
              <div className="hero__ticket-preview">
                <p className="eyebrow" style={{ color: 'var(--color-accent-dark)' }}>{event.name}</p>
                <h3 style={{ margin: '6px 0 18px' }}>Your Picnic Ticket</h3>
                <div className="hero__qr-mock">
                  <div className="hero__qr-grid">
                    {Array.from({ length: 49 }).map((_, i) => (
                      <span key={i} className={Math.random() > 0.55 ? 'is-dark' : ''} />
                    ))}
                  </div>
                </div>
                <p className="hero__ticket-code">PIC-7X92KQ</p>
                <span className="badge badge-approved">Payment Verified</span>
              </div>
            </div>
          </div>
          <svg className="scallop-edge" viewBox="0 0 1200 28" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M0,0 C 20,28 40,28 60,0 C 80,28 100,28 120,0 C 140,28 160,28 180,0 C 200,28 220,28 240,0 C 260,28 280,28 300,0 C 320,28 340,28 360,0 C 380,28 400,28 420,0 C 440,28 460,28 480,0 C 500,28 520,28 540,0 C 560,28 580,28 600,0 C 620,28 640,28 660,0 C 680,28 700,28 720,0 C 740,28 760,28 780,0 C 800,28 820,28 840,0 C 860,28 880,28 900,0 C 920,28 940,28 960,0 C 980,28 1000,28 1020,0 C 1040,28 1060,28 1080,0 C 1100,28 1120,28 1140,0 C 1160,28 1180,28 1200,0 L1200,28 L0,28 Z"
              fill="var(--color-bg)"
            />
          </svg>
        </section>

        {/* ABOUT */}
        <section id="about" className="section">
          <div className="container about__grid">
            <div>
              <span className="eyebrow">About the picnic</span>
              <h2>An afternoon built by ANB Class 29, for ANB Class 29.</h2>
              <p>
                Once a year, lectures pause and Animal Nutrition and Biotechnology Class 29 heads outdoors.
                Expect shared food, casual games, music, and a relaxed stretch of time with coursemates and
                lecturers outside the classroom.
              </p>
              <p>
                The picnic is organized entirely by the class executive council (EXCO). Every fee goes
                toward food, logistics, and the small things that make the day run smoothly.
              </p>
            </div>
            <ul className="about__list">
              <li>🍲 Shared meals and snacks throughout the day</li>
              <li>🎲 Games and light-hearted group activities</li>
              <li>🎵 Music and an open, informal atmosphere</li>
              <li>📸 A relaxed setting to catch up with coursemates</li>
            </ul>
          </div>
        </section>

        {/* EVENT DETAILS */}
        <section id="details" className="section section--alt">
          <div className="container">
            <span className="eyebrow">Event details</span>
            <h2 style={{ marginBottom: 32 }}>Everything you need to know</h2>
            <div className="details__grid">
              <DetailCard icon="📅" label="Date" value={event.date} />
              <DetailCard icon="🕒" label="Time" value={event.time} />
              <DetailCard icon="📍" label="Venue" value={event.venue} />
              <DetailCard icon="💵" label="Fee" value={event.fee} />
            </div>
            <div className="notice-card">
              <strong>Important:</strong> There is no online payment gateway. Pay only the designated EXCO member
              directly — never send money to anyone else claiming to collect picnic fees.
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="section">
          <div className="container">
            <span className="eyebrow">How registration works</span>
            <h2 style={{ marginBottom: 40 }}>From payment to ticket, in five steps</h2>
            <ol className="steps">
              {STEPS.map((step, i) => (
                <li key={step.label} className="steps__item">
                  <span className="steps__marker">{i + 1}</span>
                  <div>
                    <h3 style={{ marginBottom: 6, fontSize: '1.15rem' }}>{step.label}</h3>
                    <p style={{ marginBottom: 0 }}>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <Link to="/register" className="btn btn-primary">Start Registration</Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="section section--alt">
          <div className="container faq__grid">
            <div>
              <span className="eyebrow">FAQ</span>
              <h2>Questions people actually ask</h2>
              <p>Can't find your answer here? Reach out — contact details are just below.</p>
            </div>
            <div className="faq__list">
              {FAQS.map((item) => (
                <details key={item.q} className="faq__item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="section">
          <div className="container contact__box card">
            <div>
              <span className="eyebrow">Contact</span>
              <h2 style={{ marginBottom: 10 }}>Talk to an organizer</h2>
              <p style={{ marginBottom: 0 }}>
                Questions about payment, registration, or your ticket? Reach the organizing committee through your
                usual class EXCO contact channels, or your class representative.
              </p>
            </div>
            <Link to="/register" className="btn btn-accent">Register Now</Link>
          </div>
        </section>
      </main>
      <Footer event={event} />
    </>
  );
}

function DetailCard({ icon, label, value }) {
  return (
    <div className="detail-card card">
      <span className="detail-card__icon" aria-hidden="true">{icon}</span>
      <p className="detail-card__label">{label}</p>
      <p className="detail-card__value">{value}</p>
    </div>
  );
}
