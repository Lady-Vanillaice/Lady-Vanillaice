alter table public.bookings
  add column if not exists completed_at timestamptz,
  add column if not exists cash_received_at timestamptz,
  add column if not exists fully_paid boolean not null default false;

comment on column public.bookings.completed_at is 'Datum, an dem der Termin tatsächlich durchgeführt wurde.';
comment on column public.bookings.cash_received_at is 'Datum, an dem der Barbetrag tatsächlich erhalten wurde.';
comment on column public.bookings.fully_paid is 'Kennzeichnet, dass Anzahlung und Restzahlung vollständig erfasst wurden.';

create index if not exists bookings_completed_at_idx on public.bookings (completed_at);
create index if not exists bookings_cash_received_at_idx on public.bookings (cash_received_at);
