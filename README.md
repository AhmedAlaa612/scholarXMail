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
- `campaign_participants`
- `campaign_jobs`
- function `get_next_unsent_participant(uuid)`

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
- Sending loop is controlled by the browser calling `/api/jobs/next` repeatedly.
- Stop button updates job status to `stopped`; next iteration exits.
