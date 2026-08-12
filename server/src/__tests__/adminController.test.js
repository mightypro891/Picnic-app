import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('../config/db.js', () => ({
  db: { query: (...args) => queryMock(...args) },
}));

const { getStats, listAuditLog } = await import('../controllers/adminController.js');

function mockReqRes(query = {}) {
  const req = { query };
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return { req, res };
}

describe('getStats', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('combines registration and ticket counts into one JSON payload', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total: '12', pending: '3', approved: '8', rejected: '1' }] })
      .mockResolvedValueOnce({ rows: [{ checkedIn: '5', notCheckedIn: '3' }] });

    const { req, res } = mockReqRes();
    await getStats(req, res);

    expect(res.json).toHaveBeenCalledWith({
      totalRegistrations: 12,
      pending: 3,
      approved: 8,
      rejected: 1,
      checkedIn: 5,
      notCheckedIn: 3,
    });
  });

  it('defaults every count to 0 when the tables are empty', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total: null, pending: null, approved: null, rejected: null }] })
      .mockResolvedValueOnce({ rows: [{ checkedIn: null, notCheckedIn: null }] });

    const { req, res } = mockReqRes();
    await getStats(req, res);

    expect(res.json).toHaveBeenCalledWith({
      totalRegistrations: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      checkedIn: 0,
      notCheckedIn: 0,
    });
  });
});

describe('listAuditLog', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('paginates and returns entries with a total count', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'aud_1', action: 'LOGIN_SUCCESS' }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const { req, res } = mockReqRes({ page: '1', pageSize: '50' });
    await listAuditLog(req, res);

    expect(res.json).toHaveBeenCalledWith({
      entries: [{ id: 'aud_1', action: 'LOGIN_SUCCESS' }],
      pagination: { page: 1, pageSize: 50, total: 1 },
    });
  });

  it('silently ignores an action filter that is not in the allow-list', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const { req, res } = mockReqRes({ action: "'; DROP TABLE admins; --" });
    await listAuditLog(req, res);

    // The malicious "action" never makes it into the WHERE clause as a raw value.
    const [sql] = queryMock.mock.calls[0];
    expect(sql).not.toContain('DROP TABLE');
  });
});
