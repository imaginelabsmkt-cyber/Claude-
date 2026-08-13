-- =============================================================
-- Diagnóstico do cliente
--
-- O diagnóstico é a análise profunda (Instagram, concorrência, plano) feita
-- no início/pontualmente — diferente do relatório recorrente. É guardado
-- como HTML (documento visual, auto-contido) e renderizado dentro da ficha
-- do cliente para nunca se perder.
--
-- Idempotente.
-- =============================================================

create table if not exists public.client_diagnostics (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  title       text,
  html        text not null,
  created_at  timestamptz not null default now(),
  uploaded_by uuid references public.profiles (id) on delete set null
);

comment on table public.client_diagnostics is
  'Diagnósticos (HTML visual) por cliente — análise profunda, distinta do relatório.';

create index if not exists idx_client_diagnostics_client_id
  on public.client_diagnostics (client_id);

alter table public.client_diagnostics enable row level security;

drop policy if exists "client_diagnostics_all_authenticated" on public.client_diagnostics;
create policy "client_diagnostics_all_authenticated"
  on public.client_diagnostics for all
  to authenticated
  using (true)
  with check (true);
