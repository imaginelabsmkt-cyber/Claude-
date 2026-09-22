-- =============================================================
-- Resultados do mês por cliente (tráfego + retorno do cliente)
--
-- Fecha o ciclo do tráfego: a EQUIPE registra os números do Meta e explica,
-- e o CLIENTE responde, pelo painel, quantos fechou, de onde vieram e um
-- comentário. Uma linha por cliente/mês. Idempotente.
-- =============================================================

create table if not exists public.client_monthly_results (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients (id) on delete cascade,
  month             text not null, -- 'YYYY-MM'
  -- Equipe:
  metrics           jsonb not null default '[]'::jsonb, -- [{label, value}]
  team_note         text,          -- explicação dos números
  -- Cliente (preenchido pelo painel):
  closed_count      integer,       -- quantos fechou no mês
  sources           text,          -- de onde vieram
  client_comment    text,          -- comentário livre
  client_updated_at timestamptz,   -- quando o cliente respondeu
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (client_id, month)
);

create index if not exists client_monthly_results_client_idx
  on public.client_monthly_results (client_id);

comment on table public.client_monthly_results is
  'Resultados do mês por cliente: números de tráfego (equipe) + retorno do cliente (painel).';

alter table public.client_monthly_results enable row level security;
drop policy if exists "client_monthly_results_all" on public.client_monthly_results;
create policy "client_monthly_results_all" on public.client_monthly_results
  for all to authenticated using (true) with check (true);
