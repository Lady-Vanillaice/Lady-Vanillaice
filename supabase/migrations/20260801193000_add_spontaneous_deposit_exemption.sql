alter table public.bookings
  drop constraint if exists bookings_deposit_exemption_reason_check;

alter table public.bookings
  add constraint bookings_deposit_exemption_reason_check
  check (
    deposit_exemption_reason is null
    or deposit_exemption_reason in (
      'regular_customer',
      'trust',
      'exception',
      'colleague_guarantees',
      'spontaneous'
    )
  );

comment on column public.bookings.deposit_exemption_reason is
  'Grund, warum bewusst keine Anzahlung verlangt wird: Stammkunde, Vertrauensbasis, Ausnahme, Kollegin bürgt oder spontaner Termin.';
