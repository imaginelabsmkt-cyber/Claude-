-- =============================================================
-- Comercial — funil de oportunidades e propostas
--
-- Fecha o ciclo que faltava: um lead entra pelo funil, recebe uma
-- proposta e, quando é ganho, VIRA CLIENTE E MENSALIDADE de uma vez —
-- sem ninguém redigitar nada no financeiro.
--
-- O que NÃO existe aqui, de propósito:
--
--   * Tabela de contratos. Um contrato é cliente + valor mensal +
--     vigência, e isso já é exatamente uma linha de
--     `financial_recurrences` (client_id, amount, start_month,
--     end_month). Criar outra tabela seria manter dois valores para
--     a mesma mensalidade. O "contrato vence em X dias" sai do
--     `end_month` da recorrência.
--   * Tabela de clientes do comercial. O cliente é `public.clients`,
--     o mesmo do sistema de demandas.
--
-- Idempotente.
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- 1. Tipos ENUM
-- -------------------------------------------------------------

-- Etapas do funil. "Fechado" e "Perdido" encerram a oportunidade.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_stage') then
    create type lead_stage as enum (
      'Contato feito',
      'Diagnóstico',
      'Proposta enviada',
      'Negociação',
      'Fechado',
      'Perdido'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'proposal_status') then
    create type proposal_status as enum (
      'Rascunho',
      'Enviada',
      'Aceita',
      'Recusada'
    );
  end if;
end
$$;

-- -------------------------------------------------------------
-- 2. Tabelas
-- -------------------------------------------------------------

-- 2.1 Oportunidades do funil.
create table if not exists public.commercial_leads (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  contact_name       text,
  contact_email      text,
  contact_phone      text,
  -- Como chegou até a agência (indicação, Instagram, etc).
  source             text,
  stage              lead_stage not null default 'Contato feito',
  -- Quanto se espera faturar por mês com este cliente.
  estimated_monthly  numeric(12, 2) not null default 0 check (estimated_monthly >= 0),
  notes              text,
  -- Preenchido quando o lead é ganho: aponta para o cliente criado.
  client_id          uuid references public.clients(id) on delete set null,
  -- Preenchido quando é perdido.
  lost_reason        text,
  -- Quando entrou na etapa atual — alimenta o "X dias parado".
  stage_changed_at   timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- 2.2 Propostas enviadas a uma oportunidade.
--     Mais de uma por lead é normal (a segunda versão depois da
--     negociação), por isso é tabela e não campo.
create table if not exists public.commercial_proposals (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid not null references public.commercial_leads(id) on delete cascade,
  status         proposal_status not null default 'Rascunho',
  -- Valor recorrente proposto; é ele que vira a mensalidade se aceita.
  monthly_amount numeric(12, 2) not null default 0 check (monthly_amount >= 0),
  -- Valor de entrada/setup, cobrado uma vez (opcional).
  setup_amount   numeric(12, 2) not null default 0 check (setup_amount >= 0),
  -- O que está incluso (ex.: "8 conteúdos/mês, 1 gravação").
  scope          text,
  -- Quantidade de conteúdos por mês — vira a meta do cliente.
  monthly_goal   integer check (monthly_goal is null or monthly_goal >= 0),
  sent_at        date,
  valid_until    date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- -------------------------------------------------------------
-- 3. Índices
-- -------------------------------------------------------------
create index if not exists idx_leads_stage on public.commercial_leads (stage);
create index if not exists idx_leads_client on public.commercial_leads (client_id);
create index if not exists idx_proposals_lead on public.commercial_proposals (lead_id);
create index if not exists idx_proposals_status on public.commercial_proposals (status);

-- -------------------------------------------------------------
-- 4. Triggers
-- -------------------------------------------------------------
drop trigger if exists trg_leads_updated_at on public.commercial_leads;
create trigger trg_leads_updated_at
  before update on public.commercial_leads
  for each row execute function public.set_updated_at();

drop trigger if exists trg_proposals_updated_at on public.commercial_proposals;
create trigger trg_proposals_updated_at
  before update on public.commercial_proposals
  for each row execute function public.set_updated_at();

-- 4.1 Carimba a data quando a etapa muda — é o relógio do "parado há
--     N dias". Fica no banco para valer mesmo se a etapa for mudada
--     fora da tela do funil.
create or replace function public.marcar_mudanca_etapa()
returns trigger
language plpgsql
as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_changed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_leads_stage_changed on public.commercial_leads;
create trigger trg_leads_stage_changed
  before update on public.commercial_leads
  for each row execute function public.marcar_mudanca_etapa();

-- -------------------------------------------------------------
-- 5. Row Level Security (mesma filosofia das demais tabelas)
-- -------------------------------------------------------------
alter table public.commercial_leads     enable row level security;
alter table public.commercial_proposals enable row level security;

drop policy if exists "commercial_leads_all_authenticated" on public.commercial_leads;
create policy "commercial_leads_all_authenticated"
  on public.commercial_leads for all
  to authenticated using (true) with check (true);

drop policy if exists "commercial_proposals_all_authenticated" on public.commercial_proposals;
create policy "commercial_proposals_all_authenticated"
  on public.commercial_proposals for all
  to authenticated using (true) with check (true);
