import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const queryMock = vi.fn();
vi.mock('../config/db.js', () => ({
  db: { query: (...args) => queryMock(...args) },
}));

const { requireAdmin } = await import('../middleware/auth.js');
const { env } = await import('../config/env.js');

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('requireAdmin middleware', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('rejects a request with no session cookie', async () => {
    const req = { cookies: {} };
    const res = mockRes();
    const next = vi.fn();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a session with an invalid/garbage token', async () => {
    const req = { cookies: { admin_session: 'not-a-real-jwt' } };
    const res = mockRes();
    const next = vi.fn();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a validly-signed token for an admin that no longer exists', async () => {
    const token = jwt.sign({ sub: 'adm_deleted' }, env.jwtSecret, { expiresIn: '1h' });
    queryMock.mockResolvedValueOnce({ rows: [] });

    const req = { cookies: { admin_session: token } };
    const res = mockRes();
    const next = vi.fn();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches req.admin and calls next() for a valid session', async () => {
    const admin = { id: 'adm_123', name: 'Head Admin', email: 'admin@test.local', role: 'admin' };
    const token = jwt.sign({ sub: admin.id }, env.jwtSecret, { expiresIn: '1h' });
    queryMock.mockResolvedValueOnce({ rows: [admin] });

    const req = { cookies: { admin_session: token } };
    const res = mockRes();
    const next = vi.fn();

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.admin).toEqual(admin);
    expect(res.status).not.toHaveBeenCalled();
  });
});
