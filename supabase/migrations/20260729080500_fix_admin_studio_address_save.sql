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
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  ) then
    raise exception 'Forbidden';
  end if;

  select slot_id
    into v_slot_id
  from public.bookings
  where id = p_booking_id;

  if v_slot_id is null then
    return false;
  end if;

  update public.availability_slots
  set
    location = nullif(trim(p_location), ''),
    location_address = nullif(trim(p_location_address), ''),
    updated_at = now()
  where id = v_slot_id;

  return found;
end;
$$;

revoke all on function public.admin_update_booking_studio(uuid, text, text) from public;
grant execute on function public.admin_update_booking_studio(uuid, text, text) to authenticated;
