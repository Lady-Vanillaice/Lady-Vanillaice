-- Standardize all existing calendar pause times to 30 minutes
-- and keep 30 minutes as the default for newly created slots.

update public.availability_slots
set buffer_minutes = 30
where buffer_minutes is distinct from 30;

alter table public.availability_slots
  alter column buffer_minutes set default 30;
