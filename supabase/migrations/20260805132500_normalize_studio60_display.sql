-- Normalize legacy Studio60 values so name and address render on separate lines.

update public.bookings
set
  studio_override = 'Studio60',
  studio_address_override = coalesce(
    nullif(trim(studio_address_override), ''),
    nullif(trim(regexp_replace(studio_override, '^\s*Studio60\s*,\s*', '', 'i')), '')
  )
where studio_override ~* '^\s*Studio60\s*,';

update public.availability_slots
set
  location = 'Studio60',
  location_address = coalesce(
    nullif(trim(location_address), ''),
    nullif(trim(regexp_replace(location, '^\s*Studio60\s*,\s*', '', 'i')), '')
  ),
  updated_at = now()
where location ~* '^\s*Studio60\s*,';
