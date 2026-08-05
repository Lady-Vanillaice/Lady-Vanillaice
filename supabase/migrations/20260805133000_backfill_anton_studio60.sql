-- Ergänzt Studio60 bei vorhandenen Anton-Buchungen, bei denen bisher kein Studio gespeichert ist.
-- Bereits gesetzte Studioangaben bleiben unverändert.
update public.bookings
set
  studio_override = 'Studio60',
  studio_address_override = 'Gärtnerstraße 60, 80992 München'
where
  regexp_replace(lower(trim(guest_name)), '[^a-z0-9äöüß]+', ' ', 'g') like 'anton%'
  and nullif(trim(coalesce(studio_override, '')), '') is null;
