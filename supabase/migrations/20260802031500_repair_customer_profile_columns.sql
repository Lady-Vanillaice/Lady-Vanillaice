-- Repariert Installationen, bei denen die frühere Profilerweiterung noch
-- nicht auf die Live-Datenbank angewendet wurde.
alter table public.customer_notes
  add column if not exists gesundheit text,
  add column if not exists safeword text;

comment on column public.customer_notes.gesundheit is
  'Interne gesundheitliche Hinweise zum Kunden.';

comment on column public.customer_notes.safeword is
  'Beim Kunden hinterlegtes Safeword.';
