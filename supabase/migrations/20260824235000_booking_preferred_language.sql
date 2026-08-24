alter table public.bookings
  add column if not exists preferred_language text not null default 'de';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_preferred_language_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_preferred_language_check
      check (preferred_language in ('de', 'en'));
  end if;
end $$;

create index if not exists bookings_guest_email_language_idx
  on public.bookings (lower(guest_email), created_at desc);
