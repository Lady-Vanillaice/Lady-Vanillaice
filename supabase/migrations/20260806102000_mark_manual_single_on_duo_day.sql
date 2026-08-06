-- Preserve the duo-day context for booked single appointments.
-- A manual single booking remains is_duo = false, but inherits the day's
-- duo_partner marker so the admin timeline can render it as "nur Einzel".

create or replace function public.mark_single_booking_on_duo_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'booked'
     and coalesce(new.is_duo, false) = false
     and new.duo_partner is null then
    select s.duo_partner
      into new.duo_partner
      from public.availability_slots s
     where s.id <> new.id
       and s.duo_partner is not null
       and coalesce(s.is_duo, false) = true
       and (s.starts_at at time zone 'Europe/Berlin')::date =
           (new.starts_at at time zone 'Europe/Berlin')::date
     order by abs(extract(epoch from (s.starts_at - new.starts_at)))
     limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists mark_single_booking_on_duo_day_trigger
  on public.availability_slots;

create trigger mark_single_booking_on_duo_day_trigger
before insert on public.availability_slots
for each row
execute function public.mark_single_booking_on_duo_day();
