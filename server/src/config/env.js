import dotenv from 'dotenv';

dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  return value === undefined ? '' : value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiBaseUrl: required('API_BASE_URL', 'http://localhost:4000'),
  clientBaseUrl: required('CLIENT_BASE_URL', 'http://localhost:5173').replace(/\/$/, ''),

  databaseUrl: required('DATABASE_URL'),

  supabase: {
    url: required('SUPABASE_URL'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    bucket: required('SUPABASE_STORAGE_BUCKET', 'payment-evidence'),
  },

  // A PUBLIC bucket (separate from the private payment-evidence one) that
  // holds ticket QR code images, so they can be linked directly in emails —
  // see storageService.uploadQrCode for why this has to be a plain public
  // URL rather than an inline/attached image.
  qrCodes: {
    bucket: required('QR_CODES_BUCKET', 'ticket-qr-codes'),
  },

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  ticketTokenSecret: required('TICKET_TOKEN_SECRET'),

  firstAdmin: {
    name: process.env.FIRST_ADMIN_NAME || 'Admin',
    email: process.env.FIRST_ADMIN_EMAIL || '',
    password: process.env.FIRST_ADMIN_PASSWORD || '',
  },

  // Email is sent via Brevo's HTTP API (not raw SMTP) because Render's free
  // tier blocks all outbound traffic on SMTP ports (25/465/587) as of Sept
  // 2025 — see https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports.
  // Brevo's API runs over normal HTTPS (port 443), which isn't blocked.
  email: {
    brevoApiKey: process.env.BREVO_API_KEY || '',
    fromName: process.env.EMAIL_FROM_NAME || 'ANB Picnic',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'no-reply@example.com',
  },

  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB || 5),

  backup: {
    bucket: required('BACKUP_STORAGE_BUCKET', 'backups'),
    // Lets an external scheduler (cron-job.org, UptimeRobot, etc.) trigger a
    // backup by hitting POST /api/admin/backups/run with this as a header,
    // without needing an admin login session — useful because that request
    // is also what wakes a spun-down free-tier instance back up at noon.
    triggerSecret: required('BACKUP_TRIGGER_SECRET', ''),
    // IANA timezone the daily 12:00 backup is scheduled against.
    timezone: required('BACKUP_TIMEZONE', 'Africa/Lagos'),
  },

  event: {
    name: process.env.EVENT_NAME || 'ANB Picnic',
    date: process.env.EVENT_DATE || 'TBA',
    time: process.env.EVENT_TIME || 'TBA',
    venue: process.env.EVENT_VENUE || 'TBA',
    fee: process.env.EVENT_FEE || 'TBA',
  },
};

/**
 * Fail fast on missing critical config rather than running insecurely or
 * against a database/storage backend that isn't actually configured.
 */
export function assertCriticalEnv() {
  const missing = [];
  if (!env.jwtSecret || env.jwtSecret.includes('replace_this')) missing.push('JWT_SECRET');
  if (!env.ticketTokenSecret || env.ticketTokenSecret.includes('replace_this')) missing.push('TICKET_TOKEN_SECRET');
  if (!env.databaseUrl || env.databaseUrl.includes('xxxxxxxx')) missing.push('DATABASE_URL');
  if (!env.supabase.url || env.supabase.url.includes('xxxxxxxxxxxxx')) missing.push('SUPABASE_URL');
  if (!env.supabase.serviceRoleKey || env.supabase.serviceRoleKey.includes('replace_with')) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }
  if (missing.length) {
    throw new Error(
      `Missing/insecure required environment variables: ${missing.join(', ')}. ` +
        `Copy .env.example to .env and fill in real values.`
    );
  }
}
