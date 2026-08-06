create or replace function public.set_manual_booking_email_from_message()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  extracted_email text;
begin
  if new.guest_email like 'manuell+%@intern.local'
     and coalesce(new.message, '') ~* 'E-Mail:[[:space:]]*[^[:space:]]+@[^[:space:]]+' then
    extracted_email := substring(
      new.message from '(?i)E-Mail:[[:space:]]*([A-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,})'
    );

    if extracted_email is not null then
      new.guest_email := lower(trim(extracted_email));
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_manual_booking_email_from_message on public.bookings;

create trigger trg_set_manual_booking_email_from_message
before insert or update of guest_email, message
on public.bookings
for each row
execute function public.set_manual_booking_email_from_message();
