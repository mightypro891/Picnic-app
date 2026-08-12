import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/auth.js';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/admin/login'), 2500);
    } catch (err) {
      setError(err.message || 'This reset link is invalid or has expired.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 380, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: '2rem' }} aria-hidden="true">🔒</span>
          <h1 style={{ fontSize: '1.4rem', marginTop: 8 }}>Set a New Password</h1>
        </div>

        {!token && (
          <p className="error" style={{ textAlign: 'center' }}>
            This link is missing its reset token. Please request a new one from the login page.
          </p>
        )}

        {token && done && (
          <p style={{ textAlign: 'center' }}>Your password has been reset. Redirecting you to login…</p>
        )}

        {token && !done && (
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="password">New password</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <p className="hint">At least 10 characters.</p>
            </div>

            <div className="field">
              <label htmlFor="confirm">Confirm new password</label>
              <input
                id="confirm"
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            {error && <p className="error" style={{ marginBottom: 16 }}>{error}</p>}

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Saving…' : 'Reset Password'}
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
