import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

const queryMock = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
vi.mock('../config/db.js', () => ({
  db: { query: (...args) => queryMock(...args) },
}));

// The real backup path uploads to Supabase Storage over the network, which
// this offline test suite deliberately never does. Mock it so the
// "correct secret" test exercises the auth check and the runBackup() call
// itself without an actual (and here, failing) network request.
vi.mock('../services/storageService.js', () => ({
  uploadBackup: vi.fn().mockResolvedValue('daily/backup-test.json'),
  listBackupFiles: vi.fn().mockResolvedValue([]),
  getSignedBackupUrl: vi.fn().mockResolvedValue('https://example.com/signed-url'),
  uploadPaymentEvidence: vi.fn(),
  getSignedEvidenceUrl: vi.fn(),
  deleteEvidence: vi.fn(),
}));

const { buildApp } = await import('../app.js');

describe('server integration (supertest)', () => {
  const app = buildApp();

  it('GET /api/health responds 200 without touching the database', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });

  it('GET /api/health/deep confirms database reachability', async () => {
    const res = await request(app).get('/api/health/deep');
    expect(res.status).toBe(200);
    expect(res.body.database).toBe('reachable');
  });

  it('GET /api/event returns the configured event info', async () => {
    const res = await request(app).get('/api/event');
    expect(res.status).toBe(200);
    expect(res.body.event).toBeDefined();
  });

  it('an unknown route returns a JSON 404, not an HTML error page', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    expect(res.status).toBe(404);
  });

  it('admin routes reject requests with no session cookie', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  it('checkin routes reject requests with no session cookie', async () => {
    const res = await request(app).post('/api/checkin/scan').send({ token: 'whatever' });
    expect(res.status).toBe(401);
  });

  it('the backup trigger endpoint rejects a missing/incorrect secret', async () => {
    const res = await request(app).post('/api/system/backup/trigger');
    expect(res.status).toBe(401);
  });

  it('the backup trigger endpoint accepts the correct secret header and runs the backup', async () => {
    const res = await request(app).post('/api/system/backup/trigger').set('X-Backup-Secret', 'test_backup_secret');
    expect(res.status).toBe(200);
    expect(res.body.filename).toMatch(/^backup-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
