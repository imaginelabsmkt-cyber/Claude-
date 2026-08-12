-- =============================================================
-- Planejamentos: gestão da CRIAÇÃO do planejamento mensal por cliente
-- (marcar reunião -> reunião -> criação -> envio -> aprovação).
-- Um registro por cliente por mês.
-- Idempotente.
-- =============================================================

create extension if not exists pgcrypto;

create table if not exists public.plannings (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  reference_month   text not null, -- "YYYY-MM"
  status            text not null default 'Marcar reunião',
  meeting_date      date,
  meeting_time      text,          -- "HH:MM" (opcional)
  delivery_deadline date,
  notes             text,          -- anotações da reunião
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (client_id, reference_month)
);

alter table public.plannings enable row level security;

-- Dados compartilhados entre as usuárias (mesma filosofia de clients/contents).
drop policy if exists "plannings_all_authenticated" on public.plannings;
create policy "plannings_all_authenticated"
  on public.plannings for all
  to authenticated
  using (true)
  with check (true);

drop trigger if exists trg_plannings_updated_at on public.plannings;
create trigger trg_plannings_updated_at
  before update on public.plannings
  for each row execute function public.set_updated_at();
