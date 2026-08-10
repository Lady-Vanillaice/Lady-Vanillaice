alter table public.cash_book_entries
  add column if not exists deposit_exemption_reason text null,
  add column if not exists anzahlung_datum date null,
  add column if not exists restzahlung_method text null,
  add column if not exists restzahlung_datum date null;
