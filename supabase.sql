-- Required extension
create extension if not exists pgcrypto;

-- Campaigns table (adds subject + html_template if table already exists)
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  subject text,
  html_template text,
  created_at timestamptz not null default now()
);

alter table campaigns add column if not exists subject text;
alter table campaigns add column if not exists html_template text;

-- Sent recipients per campaign
create table if not exists campaign_participants (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  emailed_at timestamptz not null default now(),
  primary key (campaign_id, participant_id)
);

create index if not exists idx_campaign_participants_campaign on campaign_participants(campaign_id);
create index if not exists idx_campaign_participants_participant on campaign_participants(participant_id);

-- Send jobs (for start/stop/progress)
create table if not exists campaign_jobs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  requested_count integer not null check (requested_count > 0),
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null check (status in ('running', 'stopped', 'completed')) default 'running',
  created_at timestamptz not null default now()
);

create index if not exists idx_campaign_jobs_campaign on campaign_jobs(campaign_id);
create index if not exists idx_campaign_jobs_status on campaign_jobs(status);

-- Helper: next unsent participant for a campaign
create or replace function get_next_unsent_participant(p_campaign_id uuid)
returns table (id uuid, first_name text, email text)
language sql
security definer
as $$
  select p.id, p.first_name, p.email
  from participants p
  where p.email is not null
    and btrim(p.email) <> ''
    and not exists (
      select 1
      from campaign_participants cp
      where cp.campaign_id = p_campaign_id
        and cp.participant_id = p.id
    )
  order by p.created_at asc, p.id asc
  limit 1;
$$;
