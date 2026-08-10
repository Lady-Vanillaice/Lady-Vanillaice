alter table public.bookings
  add column if not exists restzahlung_method text;

comment on column public.bookings.restzahlung_method is 'Zahlungsart der Rest-/Vor-Ort-Zahlung, getrennt von der Anzahlungs-Zahlungsart.';

update public.bookings
set restzahlung_method = 'Bar'
where restzahlung_method is null
  and coalesce(bar, 0) > 0;
