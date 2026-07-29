-- Bestehende kombinierte Werte wie
-- "Studio60, Gärtnerstraße 60, 80992 München"
-- in Studio-Name und Adresse aufteilen. Dadurch erscheint der Studio-Name
-- groß und die Adresse darunter kleiner – genauso wie bei Enno.

update public.availability_slots
set
  location_address = coalesce(
    nullif(trim(location_address), ''),
    nullif(trim(substring(location from position(',' in location) + 1)), '')
  ),
  location = trim(left(location, position(',' in location) - 1)),
  updated_at = now()
where position(',' in coalesce(location, '')) > 0;

update public.bookings
set
  studio_address_override = coalesce(
    nullif(trim(studio_address_override), ''),
    nullif(trim(substring(studio_override from position(',' in studio_override) + 1)), '')
  ),
  studio_override = trim(left(studio_override, position(',' in studio_override) - 1))
where position(',' in coalesce(studio_override, '')) > 0;
