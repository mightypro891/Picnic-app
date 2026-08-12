import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Set BEFORE any test file's imports run, so config/env.js (which reads
    // process.env at import time) sees safe dummy values instead of
    // whatever real secrets happen to be in .env. Tests never touch a real
    // database, SMTP server, or Supabase project.
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test_jwt_secret_do_not_use_in_prod_00000000',
      TICKET_TOKEN_SECRET: 'test_ticket_secret_do_not_use_in_prod_000000',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      SUPABASE_URL: 'https://test-project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test_service_role_key',
      CLIENT_BASE_URL: 'http://localhost:5173',
      EVENT_NAME: 'ANB Picnic 2026',
      FIRST_ADMIN_EMAIL: 'admin@test.local',
      FIRST_ADMIN_PASSWORD: 'test_password_placeholder',
      BACKUP_TRIGGER_SECRET: 'test_backup_secret',
    },
  },
});
