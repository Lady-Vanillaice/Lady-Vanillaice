create table if not exists public.cashbook_hidden_bookings (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  hidden_by uuid null references auth.users(id) on delete set null
);

alter table public.cashbook_hidden_bookings enable row level security;

drop policy if exists "Admins can view hidden cashbook bookings" on public.cashbook_hidden_bookings;
create policy "Admins can view hidden cashbook bookings" on public.cashbook_hidden_bookings for select to authenticated using (private.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins can hide cashbook bookings" on public.cashbook_hidden_bookings;
create policy "Admins can hide cashbook bookings" on public.cashbook_hidden_bookings for insert to authenticated with check (private.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins can restore cashbook bookings" on public.cashbook_hidden_bookings;
create policy "Admins can restore cashbook bookings" on public.cashbook_hidden_bookings for delete to authenticated using (private.has_role(auth.uid(), 'admin'::app_role));

grant select, insert, delete on public.cashbook_hidden_bookings to authenticated;
grant all on public.cashbook_hidden_bookings to service_role;
