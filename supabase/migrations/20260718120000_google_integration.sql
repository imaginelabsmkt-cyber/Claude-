-- =============================================================
-- Integração com o Google (Agenda + Tarefas)
-- - google_accounts: guarda a conexão de cada usuário (refresh token).
-- - google_sync: mapeia conteúdo -> id do evento/tarefa criado no Google,
--   por usuário, para poder atualizar/remover depois.
-- Também adiciona colunas de rastreio no conteúdo (redundância barata).
-- Idempotente.
-- =============================================================

create extension if not exists pgcrypto;

-- Conexão do usuário com o Google (só o próprio dono vê/mexe).
create table if not exists public.google_accounts (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  email         text,
  refresh_token text not null,
  scope         text,
  connected_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.google_accounts enable row level security;

drop policy if exists "google_accounts_own" on public.google_accounts;
create policy "google_accounts_own"
  on public.google_accounts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Mapeamento conteúdo -> evento/tarefa no Google (por usuário).
create table if not exists public.google_sync (
  id          uuid primary key default gen_random_uuid(),
  content_id  uuid not null references public.contents(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null, -- 'event' (gravação) ou 'task' (edição)
  external_id text not null,
  updated_at  timestamptz not null default now(),
  unique (content_id, user_id, kind)
);

alter table public.google_sync enable row level security;

drop policy if exists "google_sync_own" on public.google_sync;
create policy "google_sync_own"
  on public.google_sync for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
