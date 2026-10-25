-- Completion is independent of booking status and accounting history.
create table if not exists public.booking_session_closures (
 booking_id uuid primary key references public.bookings(id) on delete cascade,
 crm_notes text not null check (length(trim(crm_notes)) > 0),
 report_decision text not null check (report_decision in ('sent','skipped')),
 completed_at timestamptz not null default now(),
 completed_by uuid not null references auth.users(id)
);
alter table public.booking_session_closures enable row level security;
-- Access exclusively through authenticated admin server functions using service role.
revoke all on public.booking_session_closures from anon, authenticated;
create index if not exists booking_session_closures_completed_at_idx on public.booking_session_closures(completed_at);
