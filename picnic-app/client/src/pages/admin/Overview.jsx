import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../../api/admin.js';

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((silent = false) => {
    if (!silent) setRefreshing(true);
    return getStats()
      .then((data) => {
        setStats(data);
        setLastUpdated(new Date());
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000); // quiet background refresh every 30s
    return () => clearInterval(interval);
  }, [load]);

  const checkInRate = stats && stats.approved > 0 ? Math.round((stats.checkedIn / stats.approved) * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Dashboard Overview</h1>
          <p style={{ marginBottom: 0 }}>A snapshot of registrations and check-ins right now.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => load()} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
          {lastUpdated && (
            <p className="hint" style={{ margin: '4px 0 0' }}>Updated {lastUpdated.toLocaleTimeString()}</p>
          )}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {stats && (
        <>
          <div className="stats-grid" style={{ marginTop: 24 }}>
            <StatCard label="Total Registrations" value={stats.totalRegistrations} />
            <StatCard label="Pending Verification" value={stats.pending} />
            <StatCard label="Approved" value={stats.approved} />
            <StatCard label="Rejected" value={stats.rejected} />
            <StatCard label="Checked In" value={stats.checkedIn} />
            <StatCard label="Not Checked In" value={stats.notCheckedIn} />
          </div>

          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Check-in Progress</h2>
              <span style={{ fontWeight: 700 }}>{checkInRate}%</span>
            </div>
            <div style={{ height: 12, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${checkInRate}%`,
                  background: 'var(--color-primary)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>
              {stats.checkedIn} of {stats.approved} approved attendees have been checked in so far.
            </p>
          </div>
        </>
      )}

      <div className="card" style={{ padding: 24, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 4 }}>Pending registrations need review</h2>
          <p style={{ marginBottom: 0 }}>Approve or reject student payment evidence to issue tickets.</p>
        </div>
        <Link to="/admin/registrations?status=PENDING" className="btn btn-primary">
          Review Pending
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card stat-card">
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value ?? '—'}</p>
    </div>
  );
}
