alter table public.bookings add column if not exists restzahlung_method text;
comment on column public.bookings.restzahlung_method is 'Zahlungsart der Restzahlung, unabhängig von der Anzahlung';
