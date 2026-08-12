import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

const queryMock = vi.fn();
vi.mock('../config/db.js', () => ({
  db: { query: (...args) => queryMock(...args) },
}));

const sendPasswordResetEmailMock = vi.fn().mockResolvedValue({});
vi.mock('../services/emailService.js', () => ({
  sendPasswordResetEmail: (...args) => sendPasswordResetEmailMock(...args),
}));

const { login, forgotPassword, resetPassword } = await import('../controllers/authController.js');

function mockReqRes(body = {}) {
  const req = { body, cookies: {} };
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return { req, res };
}

describe('login', () => {
  beforeEach(() => {
    queryMock.mockReset();
    // Default: any db.query() call we didn't explicitly stub for this test
    // (most commonly the fire-and-forget recordAudit() write inside the
    // controller) still resolves instead of returning undefined.
    queryMock.mockResolvedValue({ rows: [] });
  });

  it('rejects a malformed email without querying the database', async () => {
    const { req, res } = mockReqRes({ email: 'not-an-email', password: 'whatever' });
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('returns a generic 401 for an email that has no matching admin', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const { req, res } = mockReqRes({ email: 'nobody@test.local', password: 'whatever12345' });

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password.' });
  });

  it('returns 423 when the account is currently locked out', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: 'adm_1', locked_until: new Date(Date.now() + 60_000).toISOString(), failed_login_attempts: 5 }],
    });
    const { req, res } = mockReqRes({ email: 'admin@test.local', password: 'whatever12345' });

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(423);
  });

  it('rejects an incorrect password and increments the failed attempt counter', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'adm_1', password_hash: passwordHash, failed_login_attempts: 0, locked_until: null }] })
      .mockResolvedValueOnce({ rows: [] }); // the UPDATE ... failed_login_attempts call

    const { req, res } = mockReqRes({ email: 'admin@test.local', password: 'wrong-password' });

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    const updateCall = queryMock.mock.calls[1];
    expect(updateCall[0]).toMatch(/UPDATE admins SET failed_login_attempts/);
    expect(updateCall[1][0]).toBe(1); // attempts incremented to 1
  });

  it('logs in successfully with the correct password and sets a session cookie', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    queryMock
      .mockResolvedValueOnce({
        rows: [{ id: 'adm_1', name: 'Head Admin', email: 'admin@test.local', role: 'admin', password_hash: passwordHash, failed_login_attempts: 0, locked_until: null }],
      })
      .mockResolvedValueOnce({ rows: [] }); // reset failed_login_attempts

    const { req, res } = mockReqRes({ email: 'admin@test.local', password: 'correct-password' });

    await login(req, res);

    expect(res.cookie).toHaveBeenCalledOnce();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ admin: expect.objectContaining({ email: 'admin@test.local' }) })
    );
  });
});

describe('forgotPassword', () => {
  beforeEach(() => {
    queryMock.mockReset();
    // Default: any db.query() call we didn't explicitly stub for this test
    // (most commonly the fire-and-forget recordAudit() write inside the
    // controller) still resolves instead of returning undefined.
    queryMock.mockResolvedValue({ rows: [] });
    sendPasswordResetEmailMock.mockClear();
  });

  it('always returns the same generic message, even for an unknown email', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const { req, res } = mockReqRes({ email: 'unknown@test.local' });

    await forgotPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
  });

  it('generates a reset token and emails it for a known admin', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'adm_1', name: 'Head Admin', email: 'admin@test.local' }] })
      .mockResolvedValueOnce({ rows: [] }); // UPDATE reset_token_hash

    const { req, res } = mockReqRes({ email: 'admin@test.local' });

    await forgotPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(sendPasswordResetEmailMock).toHaveBeenCalledOnce();
    const emailArgs = sendPasswordResetEmailMock.mock.calls[0][0];
    expect(emailArgs.to).toBe('admin@test.local');
    expect(emailArgs.resetUrl).toContain('/admin/reset-password?token=');
  });
});

describe('resetPassword', () => {
  beforeEach(() => {
    queryMock.mockReset();
    // Default: any db.query() call we didn't explicitly stub for this test
    // (most commonly the fire-and-forget recordAudit() write inside the
    // controller) still resolves instead of returning undefined.
    queryMock.mockResolvedValue({ rows: [] });
  });

  it('rejects a password shorter than the minimum length', async () => {
    const { req, res } = mockReqRes({ token: 'sometoken', password: 'short' });
    await resetPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid or expired token', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const { req, res } = mockReqRes({ token: 'bad-token', password: 'a-long-enough-password' });

    await resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('resets the password and clears the token for a valid request', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'adm_1' }] }) // token lookup
      .mockResolvedValueOnce({ rows: [] }); // UPDATE password_hash

    const { req, res } = mockReqRes({ token: 'good-token', password: 'a-long-enough-password' });

    await resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const updateCall = queryMock.mock.calls[1];
    expect(updateCall[0]).toMatch(/UPDATE admins/);
    expect(updateCall[0]).toMatch(/reset_token_hash = NULL/);
  });
});
