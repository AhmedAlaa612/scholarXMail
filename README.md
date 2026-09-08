# Campaign Sender App (Vercel Ready)

A simple boss-friendly app:

- choose how many recipients to send
- fetch unsent participants from Supabase
- send one-by-one
- save each sent participant to campaign table
- stop anytime
- edit HTML template before sending
- send a one-off test email to any address you enter

## 1) Setup Database

Run SQL in Supabase SQL Editor:

- `supabase.sql`

This creates/updates:

- `campaigns`
- `campaign_participants` (now tracks `status` sent/failed + `error_message`)
- `campaign_jobs` (now supports a `limit_reached` status + `limit_profile`)
- function `get_next_unsent_participant(uuid)` (now newest signups first)

Re-run `supabase.sql` even on an existing database — it's written to be safe
to re-apply (adds columns/constraints if missing).

## 2) Environment Variables

Copy `.env.example` to `.env.local` and fill values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SMTP_INFO_HOST`
- `SMTP_INFO_PORT`
- `SMTP_INFO_USER`
- `SMTP_INFO_PASS`
- `SMTP_INFO_FROM`

For many sender accounts, use a local file instead of long env lists:

- create `smtp-profiles.local.json` in project root (already gitignored)
- optional: set `SMTP_PROFILES_FILE` in `.env.local` if you want a custom path

Example:

```json
{
  "gmail": {
    "host": "smtp.gmail.com",
    "port": 587,
    "user": "scholarx.team@gmail.com",
    "pass": "app-password",
    "from": "ScholarX <scholarx.team@gmail.com>"
  },
  "info": {
    "host": "smtp.hostinger.com",
    "port": 465,
    "user": "info@scholar-x.org",
    "pass": "mail-password",
    "from": "ScholarX <info@scholar-x.org>"
  },
  "eu": {
    "host": "smtp.hostinger.com",
    "port": 465,
    "user": "eu@scholar-x.org",
    "pass": "mail-password",
    "from": "EU Team <eu@scholar-x.org>"
  }
}
```

The app UI auto-loads profiles from this file.

For Vercel, use `SMTP_PROFILES_JSON` in Project Settings -> Environment Variables.
`smtp-profiles.local.json` is local-only and is not uploaded to Vercel.

Example value for `SMTP_PROFILES_JSON`:

```json
{
  "gmail": {
    "host": "smtp.gmail.com",
    "port": 587,
    "user": "scholarx.team@gmail.com",
    "pass": "app-password",
    "from": "ScholarX <scholarx.team@gmail.com>"
  },
  "marketing_gmail": {
    "host": "smtp.gmail.com",
    "port": 587,
    "user": "scholarx.marketing@gmail.com",
    "pass": "app-password",
    "from": "ScholarX Marketing <scholarx.marketing@gmail.com>"
  },
  "info_gmail": {
    "host": "smtp.gmail.com",
    "port": 587,
    "user": "scholarx.info@gmail.com",
    "pass": "app-password",
    "from": "ScholarX Info <scholarx.info@gmail.com>"
  },
  "info": {
    "host": "smtp.hostinger.com",
    "port": 465,
    "user": "info@scholar-x.org",
    "pass": "mail-password",
    "from": "ScholarX <info@scholar-x.org>"
  }
}
```

## 3) Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 4) Deploy to Vercel

1. Push this folder to GitHub.
2. Import project in Vercel.
3. Set the same env vars in Vercel Project Settings.
4. Deploy.

## Notes

- Template supports `{{first_name}}` placeholder.
- Test send saves the current campaign template, then sends only to the email you enter.
- Sender profile switch loads all configured profiles from env and/or `smtp-profiles.local.json`.
- Sending loop is controlled by the browser calling `/api/jobs/next` repeatedly. Keep the
  tab open while a job is running — closing it stops sending (nothing is lost; hit Resume
  and it continues from wherever it left off).
- Recipients are sent newest-signup-first.
- Stop button updates job status to `stopped`; next iteration exits.
- When a send fails with an SMTP rate-limit / quota-exceeded style error, the job
  auto-stops with status `limit_reached` and records which profile hit it. The
  recipient that failed is **not** marked as sent, so it's retried once you pick a
  different profile (or the same one tomorrow, after its quota resets) and click
  **Resume**.
- Any other send failure (bad address, bounce, etc.) is recorded permanently as
  `status = "failed"` with the SMTP error message on `campaign_participants`, so it's
  never retried but stays available for review. Use **Load Failed List** in the app,
  or query `campaign_participants` where `status = 'failed'` in Supabase directly.
