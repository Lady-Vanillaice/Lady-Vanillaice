-- Auswahl für bewusst erlassene Anzahlungen
alter table public.bookings
  add column if not exists deposit_exemption_reason text,
  add column if not exists deposit_guarantor text;

alter table public.bookings
  drop constraint if exists bookings_deposit_exemption_reason_check;

alter table public.bookings
  add constraint bookings_deposit_exemption_reason_check
  check (
    deposit_exemption_reason is null
    or deposit_exemption_reason in (
      'regular_customer',
      'trust',
      'exception',
      'colleague_guarantees'
    )
  );

comment on column public.bookings.deposit_exemption_reason is
  'Grund, warum bewusst keine Anzahlung verlangt wird: Stammkunde, Vertrauensbasis, Ausnahme oder Kollegin bürgt.';
comment on column public.bookings.deposit_guarantor is
  'Name der bürgenden Kollegin; wird nur bei colleague_guarantees verwendet.';

-- Lothar: keine Anzahlung, da Ruby June als Kollegin bürgt.
with target as (
  select id
  from public.bookings
  where lower(trim(guest_name)) = 'lothar'
  order by created_at desc
  limit 1
)
update public.bookings b
set
  anzahlung = 0,
  anzahlung_paid = false,
  deposit_exemption_reason = 'colleague_guarantees',
  deposit_guarantor = 'Ruby June',
  updated_at = now()
from target
where b.id = target.id;

-- Peter Wolff: Duo mit Ruby June. Die Partnerin bleibt am Termin gespeichert
-- und wird vom Kassenbuch weiterhin nicht als eigene Spalte ausgegeben.
with target as (
  select slot_id
  from public.bookings
  where lower(trim(guest_name)) in ('peter wolff', 'peter wolf')
    and slot_id is not null
  order by created_at desc
  limit 1
)
update public.availability_slots s
set
  is_duo = true,
  duo_partner = 'Ruby June',
  updated_at = now()
from target
where s.id = target.slot_id;

-- Enno Singer: Studio60 ergänzen und die am 13.07.2026 per PayPal
-- eingegangene Anzahlung trotz Status „Umplanen“ im Juli belassen.
with target as (
  select id, slot_id
  from public.bookings
  where lower(trim(guest_name)) = 'enno singer'
  order by created_at desc
  limit 1
), booking_update as (
  update public.bookings b
  set
    anzahlung_paid = true,
    anzahlung_method = 'PayPal',
    anzahlung_paid_at = timestamptz '2026-07-13 12:00:00+02',
    updated_at = now()
  from target
  where b.id = target.id
  returning target.slot_id
)
update public.availability_slots s
set
  location = 'Studio60',
  updated_at = now()
from booking_update
where s.id = booking_update.slot_id;
