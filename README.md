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
- Sender profile switch supports Gmail and info@scholar-x.org.
- Sending loop is controlled by the browser calling `/api/jobs/next` repeatedly.
- Stop button updates job status to `stopped`; next iteration exits.
