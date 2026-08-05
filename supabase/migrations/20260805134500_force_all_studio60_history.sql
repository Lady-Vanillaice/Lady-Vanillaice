-- Canonicalize every historical Studio60 reference.
-- Other studios are intentionally left untouched.

update public.admin_studios
set
  name = 'Studio60',
  address = 'Gärtnerstraße 60, 80992 München',
  updated_at = now()
where regexp_replace(lower(trim(name)), '[^a-z0-9]+', '', 'g') = 'studio60';

update public.availability_slots
set
  location = 'Studio60',
  location_address = 'Gärtnerstraße 60, 80992 München',
  updated_at = now()
where regexp_replace(lower(coalesce(location, '')), '[^a-z0-9]+', '', 'g') like '%studio60%';

update public.bookings as booking
set
  studio_override = 'Studio60',
  studio_address_override = 'Gärtnerstraße 60, 80992 München'
where
  regexp_replace(lower(coalesce(booking.studio_override, '')), '[^a-z0-9]+', '', 'g') like '%studio60%'
  or exists (
    select 1
    from public.availability_slots as slot
    where slot.id = booking.slot_id
      and regexp_replace(lower(coalesce(slot.location, '')), '[^a-z0-9]+', '', 'g') = 'studio60'
  );
