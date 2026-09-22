-- =============================================================
-- Relatório semanal do cliente (recado da equipe por semana)
--
-- Toda semana a equipe escreve como foi a semana (o "nosso lado") e isso
-- aparece organizado no painel do cliente, na semana correspondente. Uma
-- linha por cliente/semana (segunda-feira como âncora). Idempotente.
-- =============================================================

create table if not exists public.client_weekly_notes (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  week_start  text not null, -- 'YYYY-MM-DD' (segunda-feira da semana)
  note        text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (client_id, week_start)
);

create index if not exists client_weekly_notes_client_idx
  on public.client_weekly_notes (client_id);

comment on table public.client_weekly_notes is
  'Recado semanal da equipe por cliente (aparece no painel do cliente).';

alter table public.client_weekly_notes enable row level security;
drop policy if exists "client_weekly_notes_all" on public.client_weekly_notes;
create policy "client_weekly_notes_all" on public.client_weekly_notes
  for all to authenticated using (true) with check (true);
