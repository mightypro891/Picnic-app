import { useEffect, useState } from 'react';
import { listAttendance } from '../../api/admin.js';
import { getGateStats } from '../../api/checkin.js';

export default function Attendees() {
  const [search, setSearch] = useState('');
  const [gate, setGate] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [gateStats, setGateStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    listAttendance(search, gate)
      .then((data) => setAttendees(data.attendees))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search, gate]);

  useEffect(() => {
    getGateStats()
      .then((data) => setGateStats(data.gates))
      .catch(() => {});
  }, [attendees.length]);

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Attendees</h1>
      <p style={{ marginBottom: 20 }}>{attendees.length} checked in so far.</p>

      {gateStats.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          <button
            type="button"
            className={`btn btn-sm ${gate === '' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setGate('')}
          >
            All gates
          </button>
          {gateStats.map((g) => (
            <button
              key={g.gate}
              type="button"
              className={`btn btn-sm ${gate === g.gate ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setGate(g.gate)}
            >
              {g.gate} ({g.count})
            </button>
          ))}
        </div>
      )}

      <div className="admin-toolbar">
        <input
          className="input"
          placeholder="Search checked-in attendees"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading…</p>}

      {!loading && attendees.length === 0 && (
        <div className="empty-state card">
          <p className="empty-state__icon">🪑</p>
          <p>No attendees have checked in yet.</p>
        </div>
      )}

      {!loading && attendees.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="reg-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Matric No.</th>
                <th>Level</th>
                <th>Ticket ID</th>
                <th>Gate</th>
                <th>Checked in at</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((a) => (
                <tr key={a.ticket_code} style={{ cursor: 'default' }}>
                  <td>{a.full_name}</td>
                  <td>{a.matric_number}</td>
                  <td>{a.level}</td>
                  <td>{a.ticket_code}</td>
                  <td>{a.checked_in_gate || '—'}</td>
                  <td>{new Date(a.checked_in_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
