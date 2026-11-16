create table if not exists public.calendar_waitlist (
  id uuid primary key default gen_random_uuid(),
  waitlist_date date not null,
  name text not null,
  email text not null,
  status text not null default 'waiting' check (status in ('waiting','contacted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists calendar_waitlist_date_email_unique
  on public.calendar_waitlist (waitlist_date, lower(email));

alter table public.calendar_waitlist enable row level security;

revoke all on table public.calendar_waitlist from anon, authenticated;
