import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form onSubmit={onSubmit} className="card" style={{ width: '100%', maxWidth: 380, padding: 32 }} noValidate>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: '2rem' }} aria-hidden="true">🧺</span>
          <h1 style={{ fontSize: '1.4rem', marginTop: 8 }}>Organizer Login</h1>
          <p style={{ marginBottom: 0 }}>Sign in to manage registrations and check-in.</p>
        </div>

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

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <p className="error" style={{ marginBottom: 16 }}>{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
          <Link to="/admin/forgot-password" style={{ fontSize: '0.9rem' }}>Forgot password?</Link>
        </p>
      </form>
    </main>
  );
}
