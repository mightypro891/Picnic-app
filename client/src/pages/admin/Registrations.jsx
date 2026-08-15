import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listRegistrations, exportAttendeesCsvUrl } from '../../api/admin.js';

const STATUS_OPTIONS = ['', 'PENDING', 'APPROVED', 'REJECTED'];
const LEVEL_OPTIONS = ['', '100', '200', '300', '400', '500', 'PG', 'Other'];

export default function Registrations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const status = searchParams.get('status') || '';
  const level = searchParams.get('level') || '';
  const checkin = searchParams.get('checkin') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const [data, setData] = useState({ registrations: [], pagination: { page: 1, pageSize: 20, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    listRegistrations({ search: searchParams.get('search') || '', status, level, checkin, page })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [searchParams]);

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  }

  function onSearchSubmit(e) {
    e.preventDefault();
    updateParam('search', searchInput);
  }

  function goToPage(p) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
  }

  const totalPages = Math.max(Math.ceil(data.pagination.total / data.pagination.pageSize), 1);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Registrations</h1>
          <p style={{ marginBottom: 0 }}>{data.pagination.total} total</p>
        </div>
        <a href={exportAttendeesCsvUrl()} className="btn btn-ghost btn-sm">Export CSV</a>
      </div>

      <form className="admin-toolbar" onSubmit={onSearchSubmit}>
        <input
          className="input"
          placeholder="Search name, matric no, email, ticket ID"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="btn btn-ghost btn-sm">Search</button>

        <select className="input" style={{ maxWidth: 160 }} value={status} onChange={(e) => updateParam('status', e.target.value)}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt || 'All statuses'}</option>
          ))}
        </select>

        <select className="input" style={{ maxWidth: 140 }} value={level} onChange={(e) => updateParam('level', e.target.value)}>
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt || 'All levels'}</option>
          ))}
        </select>

        <select className="input" style={{ maxWidth: 170 }} value={checkin} onChange={(e) => updateParam('checkin', e.target.value)}>
          <option value="">Any check-in status</option>
          <option value="CHECKED_IN">Checked in</option>
          <option value="VALID">Not checked in</option>
        </select>
      </form>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading…</p>}

      {!loading && data.registrations.length === 0 && (
        <div className="empty-state card">
          <p className="empty-state__icon">🔍</p>
          <p>No students matched your search.</p>
        </div>
      )}

      {!loading && data.registrations.length > 0 && (
        <>
          <div className="reg-table-wrap">
            <table className="reg-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Matric No.</th>
                  <th>Level</th>
                  <th>Status</th>
                  <th>Ticket ID</th>
                  <th>Check-in</th>
                </tr>
              </thead>
              <tbody>
                {data.registrations.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`/admin/registrations/${r.id}`)}>
                    <td>{r.full_name}</td>
                    <td>{r.matric_number}</td>
                    <td>{r.level}</td>
                    <td>
                      <StatusBadge status={r.status} />
                      {r.duplicate_of_registration_id && (
                        <span className="badge badge-rejected" style={{ marginLeft: 6 }} title="Payment evidence matches another registration">
                          ⚠️ Duplicate receipt
                        </span>
                      )}
                    </td>
                    <td>{r.ticket_code || '—'}</td>
                    <td>{r.ticket_status === 'CHECKED_IN' ? <span className="badge badge-checked-in">Checked in</span> : r.ticket_status ? <span className="badge badge-valid">Not yet</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="reg-cards">
            {data.registrations.map((r) => (
              <div key={r.id} className="card reg-card" onClick={() => navigate(`/admin/registrations/${r.id}`)}>
                <div className="reg-card__top">
                  <div>
                    <p style={{ margin: 0, fontWeight: 700 }}>{r.full_name}</p>
                    <p className="reg-card__meta" style={{ margin: 0 }}>{r.matric_number} · {r.level} Level</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                {r.duplicate_of_registration_id && (
                  <p style={{ margin: '6px 0 0' }}>
                    <span className="badge badge-rejected">⚠️ Duplicate receipt</span>
                  </p>
                )}
                <div className="reg-card__meta">
                  Ticket: {r.ticket_code || '—'}{' '}
                  {r.ticket_status === 'CHECKED_IN' && <span className="badge badge-checked-in">Checked in</span>}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Previous</button>
              <span style={{ alignSelf: 'center' }}>Page {page} of {totalPages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    PENDING: 'badge-pending',
    APPROVED: 'badge-approved',
    REJECTED: 'badge-rejected',
  };
  return <span className={`badge ${map[status] || ''}`}>{status}</span>;
}
