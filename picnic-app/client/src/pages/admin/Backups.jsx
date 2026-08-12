import { useEffect, useState } from 'react';
import { listBackups, runBackupNow } from '../../api/admin.js';

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Backups() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState('');

  function refresh() {
    setLoading(true);
    listBackups()
      .then((data) => setBackups(data.backups))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function onRunNow() {
    setRunning(true);
    setRunMessage('');
    try {
      const result = await runBackupNow();
      setRunMessage(`Backup complete — ${result.counts.registrations} registrations, ${result.counts.tickets} tickets.`);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Backups</h1>
      <p style={{ marginBottom: 20 }}>
        A snapshot of registrations, tickets, and the audit log runs automatically every day at
        noon and is stored privately in Supabase Storage. Admin passwords are never included in a backup.
      </p>

      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" onClick={onRunNow} disabled={running}>
          {running ? 'Running…' : 'Run Backup Now'}
        </button>
        {runMessage && <span className="hint" style={{ margin: 0 }}>{runMessage}</span>}
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading…</p>}

      {!loading && backups.length === 0 && (
        <div className="empty-state card">
          <p className="empty-state__icon">🗄️</p>
          <p>No backups yet — run one now, or wait for tonight's noon schedule.</p>
        </div>
      )}

      {!loading && backups.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="reg-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Size</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.name}>
                  <td>{b.name}</td>
                  <td>{formatBytes(b.sizeBytes)}</td>
                  <td>{b.createdAt ? new Date(b.createdAt).toLocaleString() : '—'}</td>
                  <td>
                    <a href={b.downloadUrl} className="btn btn-ghost btn-sm" target="_blank" rel="noreferrer">
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint" style={{ marginTop: 12 }}>
            Download links expire after a few minutes — refresh this page for a fresh one.
          </p>
        </div>
      )}
    </div>
  );
}
