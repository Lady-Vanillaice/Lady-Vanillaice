-- Keep the RPC name used by the admin UI in sync with the database API.
-- The implementation delegates to the existing, permission-checked function.
create or replace function public.set_booking_studio_override(
  p_booking_id uuid,
  p_location text,
  p_location_address text default null
)
returns boolean
language sql
security invoker
set search_path = public
as $$
  select public.admin_update_booking_studio(
    p_booking_id,
    p_location,
    p_location_address
  );
$$;

revoke all on function public.set_booking_studio_override(uuid, text, text) from public;
grant execute on function public.set_booking_studio_override(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
