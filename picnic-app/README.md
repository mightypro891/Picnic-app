# ANB Picnic — Registration & QR Check-in System

A full-stack registration and QR check-in system for a department picnic / get-together, with manual
(EXCO-to-student) payment confirmation, admin approval, ticket + QR issuance by email, and a mobile-friendly
scanner for gate check-in. Built to run entirely on free hosting tiers.

## Stack

- **Frontend:** React 18 + Vite + React Router
- **Backend:** Node.js + Express
- **Database:** Postgres, hosted free on **Supabase**
- **File storage:** Supabase Storage (private bucket, accessed only via short-lived signed URLs)
- **Auth:** JWT in an httpOnly cookie, bcrypt password hashing, login rate limiting + lockout
- **Email:** Nodemailer over SMTP (Gmail app password works fine), with inline QR code
- **QR:** `qrcode` (server-side generation) + `html5-qrcode` (camera scanning, client side)

## 1. Create your free Supabase project

1. Go to [supabase.com](https://supabase.com), sign up (no credit card required), and create a new project.
   Save the database password you're asked to set — you'll need it in a moment.
2. **Database connection string:** in your project, go to *Project Settings → Database → Connection string*.
   Copy the **Connection pooling** URI (it looks like
   `postgresql://postgres.xxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres`). This is your
   `DATABASE_URL`.
3. **API keys:** go to *Project Settings → API*. Copy the **Project URL** (`SUPABASE_URL`) and the
   **service_role** key (`SUPABASE_SERVICE_ROLE_KEY`) — NOT the `anon`/public key, since that one can't be
   trusted with write access.
4. **Storage bucket:** go to *Storage*, click **New bucket**, name it `payment-evidence`, and make sure
   **Public bucket is turned OFF** (it must stay private — the app only ever hands out short-lived signed links
   to view evidence, never a public URL).

## 2. Configure environment variables

```bash
cd server
cp .env.example .env
```

Fill in `server/.env`:
- `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` — from step 1
- `JWT_SECRET` / `TICKET_TOKEN_SECRET` — generate with:
  `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` (run twice, for two different values)
- `SMTP_*` / `EMAIL_FROM_*` — your SMTP provider (Gmail app password is the easiest free option)
- `EVENT_*` — your actual event details
- `CLIENT_BASE_URL` — where your frontend runs (update this once you deploy it — see below)

```bash
cd ../client
cp .env.example .env
```
Leave `VITE_API_BASE_URL` empty for local dev; set it once you deploy the backend (see below).

## 3. Install dependencies and create your first admin

```bash
cd server && npm install
npm run create-admin
```
This connects to your Supabase database, creates the tables automatically on first run, and prompts you for an
admin name/email/password.

```bash
cd ../client && npm install
```

## 4. Run locally

```bash
# Terminal 1
cd server && npm run dev      # http://localhost:4000

# Terminal 2
cd client && npm run dev      # http://localhost:5173
```

Visit `http://localhost:5173` for the public site and `http://localhost:5173/admin/login` for the dashboard.

## 5. Go live for free

Your database and file storage already live on Supabase (not on whatever server runs your code), so the
Express app itself and the React app are both now **stateless** — meaning they're safe to run on a free tier
that doesn't offer persistent disks.

**Backend — Render (free tier):**
1. Push this project to a GitHub repo.
2. On [render.com](https://render.com), New → Web Service → connect your repo, set the root directory to
   `server`.
3. Build command: `npm install`. Start command: `npm start`.
4. Add every variable from your `server/.env` under the service's Environment tab. Set `CLIENT_BASE_URL` to
   your Vercel URL once you have it (step below — you can circle back and update this).
5. Deploy. Render gives you a URL like `https://picnic-api.onrender.com` — that's your `API_BASE_URL`.

**Frontend — Vercel or Netlify (free tier):**
1. New Project → import the same repo, set the root directory to `client`.
2. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
3. Add `VITE_API_BASE_URL` = your Render URL from above.
4. Deploy. You'll get a URL like `https://picnic.vercel.app`.
5. Go back to Render and update `CLIENT_BASE_URL` to this URL, then redeploy the backend so CORS and email
   links point to the right place.

**Create your admin on the deployed database:** since Render's free web services don't easily support one-off
interactive terminal commands, run `npm run create-admin` **locally** with your `server/.env` pointed at the
same Supabase `DATABASE_URL` — it inserts directly into the same database your live app uses, so this works
fine even though the app itself runs on Render.

Note: Render's free tier spins down after ~15 minutes of inactivity and takes 30-60 seconds to wake back up on
the next request — the first registration/login after a quiet period may feel slow but will work.

## Testing the full flow

1. **Register:** `/register` → fill form → upload payment evidence (JPG/PNG/WEBP/PDF, up to 5MB) → land on a
   confirmation page with a link to your status page (`/ticket/:accessToken`) — save it.
2. **Pending status:** open that link — shows "Pending Verification."
3. **Approve:** log in at `/admin/login` → Registrations → open the pending entry → view evidence →
   **Approve Payment**. Generates a ticket + QR and emails it (or logs the email to the console if SMTP isn't
   configured).
4. **Ticket view:** reload the student's ticket link — now shows the QR code and "Payment Verified."
5. **Check in:** `/admin/scanner` → scan the QR, or use **Manual Ticket Lookup** with the ticket ID
   (e.g. `PIC-7X92KQ`) if the camera isn't available. Shows "VALID TICKET / CHECK-IN SUCCESSFUL."
6. **Duplicate scan:** scan the same ticket again — shows "ALREADY CHECKED IN."
7. **Invalid ticket:** look up a made-up code like `PIC-000000` — shows "INVALID TICKET."
8. **Reject flow:** register a second student, reject them with a reason — their status page shows it.
9. **Duplicate registration:** try registering again with the same matric number while pending/approved — the
   server blocks it with a clear error (enforced by a real database constraint, not just the frontend).
10. **Export:** Registrations → **Export CSV** to download attendee data (payment evidence is never exported).

## Security notes

- Passwords are bcrypt-hashed; sessions are JWTs in httpOnly, sameSite cookies (never localStorage)
- All validation happens server-side regardless of what the frontend already checked
- Duplicate registrations are blocked by a real database unique constraint, not just an application check
- Uploaded files are validated by MIME type + extension, size-capped, and stored in a **private** Supabase
  bucket — evidence is only ever accessible through a signed URL that expires in 2 minutes
- QR codes encode a long random opaque token, never personal data; every scan is verified server-side
- Check-in is a single conditional SQL `UPDATE ... WHERE status = 'VALID'`, so two organizers scanning the same
  ticket at the same instant can only ever produce one successful check-in
- Login is rate-limited and locks an account for 15 minutes after 5 failed attempts
- An audit log records admin logins, approvals, rejections, ticket generation, and check-ins

## Known limitations

- Camera scanner behavior varies by phone/browser — test with the actual devices your organizers will use
  ahead of time
- Multi-gate check-in tags each scan with a gate name typed in on that device; there's no central admin UI to
  pre-define a fixed gate list yet
- The daily backup only reliably fires on Render's free tier if you set up an external scheduler to hit
  `/api/system/backup/trigger` — see "Keeping the app awake & backed up" below
- WhatsApp ticket delivery isn't implemented — the only ban-safe way to do it is Meta's official WhatsApp
  Business Cloud API, which needs your own Meta Business account and credentials

## What's new since the initial release

- **Permanent admin account** — `FIRST_ADMIN_EMAIL`/`FIRST_ADMIN_PASSWORD` in `.env` are seeded into the
  database automatically on every server boot (see `src/config/seedAdmin.js`). It only ever creates the
  account if it doesn't already exist, so a later password change (via reset) is never silently reverted.
- **Admin password reset** — "Forgot password?" on the login page emails a 30-minute reset link
  (`/admin/forgot-password`, `/admin/reset-password`). Tokens are stored hashed, never in plaintext.
- **Automated test suite** — `cd server && npm install && npm test` (Vitest + Supertest). Everything is
  mocked (database, email, storage) so tests run fully offline — see `src/__tests__/`.
- **Dashboard stats** — a live check-in progress bar and a background refresh every 30 seconds, plus a manual
  refresh button, on the Overview page.
- **Promo graphic** — Admin → Promo Graphic renders a ready-to-share poster with date/time/venue shown as
  "Coming Soon," downloadable as a PNG.
- **Multi-gate check-in** — organizers pick a gate name on the Scanner page; every gate reads/writes the same
  `tickets` table, so the existing atomic `UPDATE ... WHERE status = 'VALID'` still guarantees a ticket can
  only be checked in once, no matter which gate scans it first. Attendees page can filter by gate.
- **Health checks** — `GET /api/health` (cheap, for uptime pings) and `GET /api/health/deep` (also checks the
  database).
- **Security log** — Admin → Security Log lists logins, password resets, check-ins, and every rate-limit trip,
  with CSV export.
- **Daily backups** — a JSON snapshot of registrations, tickets, and the audit log (never admin passwords) is
  written to a private Supabase Storage bucket at noon daily, and can be triggered manually from Admin →
  Backups.

### Keeping the app awake & backed up (Render free tier)

Render's free tier spins the app down after inactivity, so an in-process cron job alone won't reliably run at
exactly noon. Set up two free external monitors:

1. **Keep-alive:** any uptime monitor (e.g. [cron-job.org](https://cron-job.org), UptimeRobot) hitting
   `GET https://your-api.onrender.com/api/health` every 10 minutes.
2. **Backup trigger:** a second scheduled job hitting
   `POST https://your-api.onrender.com/api/system/backup/trigger` once a day around noon, with the header
   `X-Backup-Secret: <your BACKUP_TRIGGER_SECRET value>`.

Both env vars (`BACKUP_TRIGGER_SECRET`, `BACKUP_STORAGE_BUCKET`) are already in `.env` — just create a private
`backups` bucket in Supabase Storage (Storage → New Bucket → leave "Public" unchecked) before the first run.
#   P i c n i c - a p p  
 