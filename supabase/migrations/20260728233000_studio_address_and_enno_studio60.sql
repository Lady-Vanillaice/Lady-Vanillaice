alter table public.availability_slots
  add column if not exists location_address text;

comment on column public.availability_slots.location_address is
  'Frei bearbeitbare vollständige Adresse des Studios für Adminbereich, Kassenbuch und Exporte.';

-- Enno Singer: Studio60 eintragen. Die genaue Adresse kann anschließend
-- direkt im Kassenbuch über „Bearbeiten“ ergänzt oder korrigiert werden.
with target as (
  select slot_id
  from public.bookings
  where regexp_replace(lower(trim(guest_name)), '[^a-z0-9]+', ' ', 'g') like '%enno%singer%'
    and slot_id is not null
  order by created_at desc
  limit 1
)
update public.availability_slots s
set
  location = 'Studio60',
  updated_at = now()
from target
where s.id = target.slot_id;
