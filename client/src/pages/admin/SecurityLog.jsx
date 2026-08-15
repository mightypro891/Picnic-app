import { useEffect, useState } from 'react';
import { listAuditLog, auditLogExportUrl } from '../../api/admin.js';

const ACTIONS = [
  '', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'RATE_LIMIT_EXCEEDED', 'REGISTRATION_APPROVED',
  'REGISTRATION_REJECTED', 'CHECK_IN', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED',
  'ATTENDEES_EXPORTED', 'BACKUP_CREATED', 'BOT_REGISTRATION_BLOCKED', 'DUPLICATE_RECEIPT_DETECTED',
];

function actionBadgeClass(action) {
  if (action === 'RATE_LIMIT_EXCEEDED' || action === 'LOGIN_FAILED') return 'badge badge-rejected';
  if (action === 'CHECK_IN' || action === 'LOGIN_SUCCESS' || action === 'BACKUP_CREATED') return 'badge badge-approved';
  return 'badge badge-pending';
}

export default function SecurityLog() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pageSize: 50 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    listAuditLog({ action, page: String(page) })
      .then((data) => {
        setEntries(data.entries);
        setPagination(data.pagination);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [action, page]);

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Security Log</h1>
      <p style={{ marginBottom: 20 }}>
        Admin logins, password resets, check-ins, and every rate-limit trip (a sign someone is
        hammering an endpoint — brute-forcing a login, scraping, or a misbehaving client).
      </p>

      <div className="admin-toolbar" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          className="input"
          style={{ maxWidth: 260 }}
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value);
          }}
        >
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{a || 'All actions'}</option>
          ))}
        </select>
        <a href={auditLogExportUrl()} className="btn btn-ghost btn-sm">Export CSV</a>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading…</p>}

      {!loading && entries.length === 0 && (
        <div className="empty-state card">
          <p className="empty-state__icon">🛡️</p>
          <p>No matching log entries yet.</p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="reg-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.created_at).toLocaleString()}</td>
                  <td><span className={actionBadgeClass(e.action)}>{e.action}</span></td>
                  <td>{e.actor_type}{e.actor_id ? ` · ${e.actor_id}` : ''}</td>
                  <td>{e.target_type ? `${e.target_type}${e.target_id ? ` · ${e.target_id}` : ''}` : '—'}</td>
                  <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.metadata ? JSON.stringify(e.metadata) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span className="hint">Page {pagination.page} of {totalPages} · {pagination.total} entries</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
