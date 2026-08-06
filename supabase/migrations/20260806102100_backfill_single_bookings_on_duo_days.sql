-- Also fix already-created future manual single appointments on duo days.
update public.availability_slots target
   set duo_partner = source.duo_partner
  from lateral (
    select duo.duo_partner
      from public.availability_slots duo
     where duo.id <> target.id
       and duo.duo_partner is not null
       and coalesce(duo.is_duo, false) = true
       and (duo.starts_at at time zone 'Europe/Berlin')::date =
           (target.starts_at at time zone 'Europe/Berlin')::date
     order by abs(extract(epoch from (duo.starts_at - target.starts_at)))
     limit 1
  ) source
 where target.status = 'booked'
   and coalesce(target.is_duo, false) = false
   and target.duo_partner is null
   and target.ends_at > now();
