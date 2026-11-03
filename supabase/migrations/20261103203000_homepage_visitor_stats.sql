create table if not exists public.homepage_visits (
  visitor_id uuid not null,
  visit_date date not null,
  first_seen_at timestamptz not null default now(),
  primary key (visitor_id, visit_date)
);

comment on table public.homepage_visits is
  'Datenschutzarme Homepage-Besucherstatistik: zufällige Browser-ID, maximal ein Eintrag pro Tag.';

create index if not exists homepage_visits_visit_date_idx
  on public.homepage_visits (visit_date desc);

alter table public.homepage_visits enable row level security;

-- Kein direkter Browserzugriff auf die Tabelle. Lesen und Schreiben erfolgen
-- ausschließlich über serverseitige Funktionen mit Service-Role.
revoke all on table public.homepage_visits from anon, authenticated;
