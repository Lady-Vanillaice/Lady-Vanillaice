alter table public.bookings
  add column if not exists studio_override text,
  add column if not exists studio_address_override text;

comment on column public.bookings.studio_override is
  'Admin-bearbeitbarer Studio-Name für Kassenbuch und Exporte; überschreibt den verknüpften Slot.';

comment on column public.bookings.studio_address_override is
  'Admin-bearbeitbare Studio-Adresse für Kassenbuch und Exporte; überschreibt den verknüpften Slot.';

create or replace function public.admin_update_booking_studio(
  p_booking_id uuid,
  p_location text,
  p_location_address text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Forbidden';
  end if;

  update public.bookings
  set
    studio_override = nullif(trim(p_location), ''),
    studio_address_override = nullif(trim(p_location_address), '')
  where id = p_booking_id
  returning slot_id into v_slot_id;

  if not found then
    return false;
  end if;

  if v_slot_id is not null then
    update public.availability_slots
    set
      location = nullif(trim(p_location), ''),
      location_address = nullif(trim(p_location_address), ''),
      updated_at = now()
    where id = v_slot_id;
  end if;

  return true;
end;
$$;

revoke all on function public.admin_update_booking_studio(uuid, text, text) from public;
grant execute on function public.admin_update_booking_studio(uuid, text, text) to authenticated;

-- Vorhandenen Enno-Eintrag direkt korrigieren, auch wenn die Slot-Verknüpfung fehlt.
update public.bookings
set
  studio_override = 'Studio60',
  studio_address_override = 'Gärtnerstraße 60, 80992 München'
where regexp_replace(lower(trim(guest_name)), '[^a-z0-9äöüß]+', ' ', 'g') like '%enno%singer%';
