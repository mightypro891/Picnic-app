import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getRegistrationDetail, approveRegistration, rejectRegistration, evidenceUrl } from '../../api/admin.js';

export default function RegistrationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reg, setReg] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');

  function load() {
    getRegistrationDetail(id).then(setReg).catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  async function onApprove() {
    if (!window.confirm(`Approve ${reg.full_name}'s registration and issue a ticket?`)) return;
    setBusy(true);
    try {
      await approveRegistration(id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    setBusy(true);
    try {
      await rejectRegistration(id, reason);
      setShowReject(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!reg) return <p>Loading…</p>;

  const isImage = reg.payment_evidence_mime?.startsWith('image/');

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr', maxWidth: 900 }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: '1.4rem', marginBottom: 4 }}>{reg.full_name}</h1>
              <p style={{ marginBottom: 0 }}>{reg.matric_number} · {reg.level} Level</p>
            </div>
            <StatusBadge status={reg.status} />
          </div>

          <dl style={{ display: 'grid', gap: 10, margin: '20px 0 0', gridTemplateColumns: '1fr 1fr' }}>
            <Fact label="Email" value={reg.email} />
            <Fact label="Phone" value={reg.phone} />
            <Fact label="Registered" value={new Date(reg.created_at).toLocaleString()} />
            {reg.ticket_code && <Fact label="Ticket ID" value={reg.ticket_code} />}
          </dl>

          {reg.status === 'REJECTED' && reg.rejection_reason && (
            <p className="hint" style={{ marginTop: 16 }}>Rejection reason: "{reg.rejection_reason}"</p>
          )}

          {reg.status === 'PENDING' && (
            <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={onApprove} disabled={busy}>
                {busy ? 'Working…' : 'Approve Payment'}
              </button>
              <button className="btn btn-danger" onClick={() => setShowReject(true)} disabled={busy}>
                Reject
              </button>
            </div>
          )}

          {showReject && (
            <div className="card" style={{ padding: 16, marginTop: 16, background: 'var(--color-surface-alt)' }}>
              <label htmlFor="reason" style={{ fontWeight: 600, fontSize: '0.9rem' }}>Reason (optional)</label>
              <textarea
                id="reason"
                className="input"
                rows={3}
                style={{ marginTop: 8, marginBottom: 12 }}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Payment evidence could not be verified."
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-danger btn-sm" onClick={onReject} disabled={busy}>Confirm Reject</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowReject(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Payment Evidence</h2>
          {isImage ? (
            <a href={evidenceUrl(reg.id)} target="_blank" rel="noreferrer">
              <img
                src={evidenceUrl(reg.id)}
                alt={`Payment evidence submitted by ${reg.full_name}`}
                style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
              />
            </a>
          ) : (
            <a href={evidenceUrl(reg.id)} target="_blank" rel="noreferrer" className="btn btn-ghost">
              📄 Open PDF evidence
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--color-ink-soft)' }}>{label}</p>
      <p style={{ margin: 0, fontWeight: 600 }}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { PENDING: 'badge-pending', APPROVED: 'badge-approved', REJECTED: 'badge-rejected' };
  return <span className={`badge ${map[status] || ''}`}>{status}</span>;
}
