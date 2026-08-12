-- =============================================================
-- Mapeamento planejamento -> evento/tarefa no Google (por usuário).
-- Reunião do planejamento = evento; prazo de entrega = tarefa.
-- Idempotente.
-- =============================================================

create extension if not exists pgcrypto;

create table if not exists public.planning_google_sync (
  id          uuid primary key default gen_random_uuid(),
  planning_id uuid not null references public.plannings(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null, -- 'event' (reunião) ou 'task' (prazo de entrega)
  external_id text not null,
  updated_at  timestamptz not null default now(),
  unique (planning_id, user_id, kind)
);

alter table public.planning_google_sync enable row level security;

drop policy if exists "planning_google_sync_own" on public.planning_google_sync;
create policy "planning_google_sync_own"
  on public.planning_google_sync for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
