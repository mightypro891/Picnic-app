import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getRegistrationDetail, approveRegistration, rejectRegistration, resendTicket, deleteRegistration, getEvidenceUrl } from '../../api/admin.js';

export default function RegistrationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reg, setReg] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [evidenceSignedUrl, setEvidenceSignedUrl] = useState(null);
  const [evidenceError, setEvidenceError] = useState('');

  function load() {
    getRegistrationDetail(id).then(setReg).catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  useEffect(() => {
    if (!id) return;
    setEvidenceSignedUrl(null);
    setEvidenceError('');
    getEvidenceUrl(id)
      .then((data) => setEvidenceSignedUrl(data.url))
      .catch((err) => setEvidenceError(err.message));
  }, [id]);

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

  async function onResend() {
    setBusy(true);
    setResendMessage('');
    try {
      await resendTicket(id);
      setResendMessage('Ticket email resent successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    try {
      await deleteRegistration(id);
      navigate('/admin/registrations');
    } catch (err) {
      setError(err.message);
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

          {reg.duplicate_of_registration_id && (
            <div className="card" style={{ padding: 16, marginTop: 16, background: 'var(--color-surface-alt)', border: '1px solid var(--color-danger)' }}>
              <p style={{ margin: 0, fontWeight: 700 }}>⚠️ Possible duplicate receipt</p>
              <p style={{ margin: '6px 0 0' }}>
                This exact payment evidence file matches{' '}
                <a href={`/admin/registrations/${reg.duplicate_of_registration_id}`}>another registration</a>.
                Check both before approving — it may be a legitimate resubmission, or the same receipt reused
                by a different person.
              </p>
            </div>
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

          {reg.status === 'APPROVED' && (
            <div style={{ marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={onResend} disabled={busy}>
                {busy ? 'Sending…' : '✉️ Resend Ticket Email'}
              </button>
              <p className="hint" style={{ marginTop: 8 }}>
                Sends a fresh copy of the ticket + QR code — use this if the student says they never got
                the email, or if their ticket was issued before the QR code fix.
              </p>
              {resendMessage && <p style={{ color: 'var(--color-success)', marginTop: 4 }}>{resendMessage}</p>}
            </div>
          )}

          <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
            {!showDelete ? (
              <button
                className="btn btn-ghost"
                style={{ color: 'var(--color-danger)' }}
                onClick={() => setShowDelete(true)}
                disabled={busy}
              >
                🗑️ Delete Registration
              </button>
            ) : (
              <div className="card" style={{ padding: 16, background: 'var(--color-surface-alt)', border: '1px solid var(--color-danger)' }}>
                <p style={{ margin: 0, fontWeight: 700 }}>Delete this registration permanently?</p>
                <p className="hint" style={{ marginTop: 6 }}>
                  This removes {reg.full_name}'s registration, their ticket (if issued), and their uploaded
                  payment evidence file. This cannot be undone. Meant for cleaning up test submissions —
                  don't use this on a real attendee's registration.
                </p>
                <label htmlFor="deleteConfirm" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginTop: 10 }}>
                  Type the full name "{reg.full_name}" to confirm
                </label>
                <input
                  id="deleteConfirm"
                  className="input"
                  style={{ marginTop: 6, marginBottom: 12 }}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={onDelete}
                    disabled={busy || deleteConfirmText.trim() !== reg.full_name}
                  >
                    {busy ? 'Deleting…' : 'Permanently Delete'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setShowDelete(false);
                      setDeleteConfirmText('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

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
          {evidenceError && <p className="error">{evidenceError}</p>}
          {!evidenceError && !evidenceSignedUrl && <p>Loading evidence…</p>}
          {evidenceSignedUrl && isImage && (
            <a href={evidenceSignedUrl} target="_blank" rel="noreferrer">
              <img
                src={evidenceSignedUrl}
                alt={`Payment evidence submitted by ${reg.full_name}`}
                style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
              />
            </a>
          )}
          {evidenceSignedUrl && !isImage && (
            <a href={evidenceSignedUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">
              📄 Open PDF evidence
            </a>
          )}
          <p className="hint" style={{ marginTop: 10 }}>
            This link expires after a few minutes — reload the page for a fresh one if it stops working.
          </p>
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
