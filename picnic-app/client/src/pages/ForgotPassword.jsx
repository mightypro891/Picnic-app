import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 380, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: '2rem' }} aria-hidden="true">🔑</span>
          <h1 style={{ fontSize: '1.4rem', marginTop: 8 }}>Reset Password</h1>
          <p style={{ marginBottom: 0 }}>Enter your admin email and we'll send you a reset link.</p>
        </div>

        {sent ? (
          <p style={{ textAlign: 'center' }}>
            If that email belongs to an admin account, a reset link is on its way. Check your inbox (and spam
            folder) — the link expires in 30 minutes.
          </p>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            {error && <p className="error" style={{ marginBottom: 16 }}>{error}</p>}

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
          <Link to="/admin/login" style={{ fontSize: '0.9rem' }}>Back to login</Link>
        </p>
      </div>
    </main>
  );
}
