-- =============================================================
-- Módulo Financeiro — fluxo de caixa da agência
--
-- Espelha a planilha "Fluxo de Caixa Imagine Labs 2026":
--   * cada mês tem um saldo inicial (= saldo final do mês anterior);
--   * lançamentos de RECEITA e DESPESA classificados por categoria;
--   * status "Pago" (realizado) ou "Pendente" (a receber / a pagar);
--   * resultado líquido = receitas - despesas realizadas;
--   * saldo final = saldo inicial + resultado líquido.
--
-- As mensalidades recorrentes (mesmo cliente, mesmo valor, todo mês)
-- viram REGRAS em financial_recurrences e geram lançamentos do mês
-- com um clique, em vez de serem redigitadas a cada aba.
--
-- Idempotente (pode ser reexecutada).
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- 1. Tipos ENUM
-- -------------------------------------------------------------

-- Natureza do lançamento
do $$
begin
  if not exists (select 1 from pg_type where typname = 'financial_kind') then
    create type financial_kind as enum ('Receita', 'Despesa');
  end if;
end
$$;

-- Situação do lançamento (igual à coluna "Status" da planilha)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'financial_status') then
    create type financial_status as enum ('Pago', 'Pendente');
  end if;
end
$$;

-- -------------------------------------------------------------
-- 2. Tabelas
-- -------------------------------------------------------------

-- 2.1 Configurações do módulo (linha única).
--     O saldo inicial é o caixa no primeiro mês da série; a partir dele
--     todos os meses seguintes são encadeados automaticamente.
create table if not exists public.financial_settings (
  id              boolean primary key default true check (id),
  opening_balance numeric(14, 2) not null default 0,
  opening_month   text not null default '2026-04', -- "YYYY-MM"
  updated_at      timestamptz not null default now()
);

insert into public.financial_settings (id)
values (true)
on conflict (id) do nothing;

-- 2.2 Categorias (as linhas de agrupamento do "Resumo Anual").
create table if not exists public.financial_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  kind       financial_kind not null,
  sort_order integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, name)
);

-- 2.3 Recorrências (mensalidades e custos fixos que se repetem todo mês).
create table if not exists public.financial_recurrences (
  id           uuid primary key default gen_random_uuid(),
  description  text not null,
  kind         financial_kind not null,
  category_id  uuid not null references public.financial_categories(id) on delete restrict,
  client_id    uuid references public.clients(id) on delete set null,
  amount       numeric(12, 2) not null check (amount >= 0),
  due_day      integer check (due_day between 1 and 31),
  start_month  text not null,  -- "YYYY-MM"
  end_month    text,           -- "YYYY-MM" (null = sem fim previsto)
  active       boolean not null default true,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 2.4 Lançamentos (as linhas das abas mensais).
create table if not exists public.financial_entries (
  id              uuid primary key default gen_random_uuid(),
  reference_month text not null,  -- "YYYY-MM" (mês de competência)
  kind            financial_kind not null,
  category_id     uuid not null references public.financial_categories(id) on delete restrict,
  client_id       uuid references public.clients(id) on delete set null,
  description     text not null,
  amount          numeric(12, 2) not null check (amount >= 0),
  status          financial_status not null default 'Pendente',
  due_date        date,
  paid_date       date,
  payment_method  text,
  notes           text,
  -- Origem: preenchido quando o lançamento nasceu de uma recorrência.
  -- O par (recurrence_id, reference_month) é único para que "gerar o mês"
  -- possa ser clicado mais de uma vez sem duplicar nada.
  recurrence_id   uuid references public.financial_recurrences(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (recurrence_id, reference_month)
);

-- -------------------------------------------------------------
-- 3. Índices (consultas sempre partem do mês de competência)
-- -------------------------------------------------------------
create index if not exists idx_financial_entries_month
  on public.financial_entries (reference_month);
create index if not exists idx_financial_entries_month_kind
  on public.financial_entries (reference_month, kind);
create index if not exists idx_financial_entries_category
  on public.financial_entries (category_id);
create index if not exists idx_financial_entries_client
  on public.financial_entries (client_id);
create index if not exists idx_financial_entries_status
  on public.financial_entries (status);
create index if not exists idx_financial_recurrences_active
  on public.financial_recurrences (active);

-- -------------------------------------------------------------
-- 4. Triggers de updated_at (função criada na migration inicial)
-- -------------------------------------------------------------
drop trigger if exists trg_financial_settings_updated_at on public.financial_settings;
create trigger trg_financial_settings_updated_at
  before update on public.financial_settings
  for each row execute function public.set_updated_at();

drop trigger if exists trg_financial_categories_updated_at on public.financial_categories;
create trigger trg_financial_categories_updated_at
  before update on public.financial_categories
  for each row execute function public.set_updated_at();

drop trigger if exists trg_financial_recurrences_updated_at on public.financial_recurrences;
create trigger trg_financial_recurrences_updated_at
  before update on public.financial_recurrences
  for each row execute function public.set_updated_at();

drop trigger if exists trg_financial_entries_updated_at on public.financial_entries;
create trigger trg_financial_entries_updated_at
  before update on public.financial_entries
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- 5. Row Level Security
-- (mesma filosofia das demais tabelas: dado compartilhado entre as sócias)
-- -------------------------------------------------------------
alter table public.financial_settings    enable row level security;
alter table public.financial_categories  enable row level security;
alter table public.financial_recurrences enable row level security;
alter table public.financial_entries     enable row level security;

drop policy if exists "financial_settings_all_authenticated" on public.financial_settings;
create policy "financial_settings_all_authenticated"
  on public.financial_settings for all
  to authenticated using (true) with check (true);

drop policy if exists "financial_categories_all_authenticated" on public.financial_categories;
create policy "financial_categories_all_authenticated"
  on public.financial_categories for all
  to authenticated using (true) with check (true);

drop policy if exists "financial_recurrences_all_authenticated" on public.financial_recurrences;
create policy "financial_recurrences_all_authenticated"
  on public.financial_recurrences for all
  to authenticated using (true) with check (true);

drop policy if exists "financial_entries_all_authenticated" on public.financial_entries;
create policy "financial_entries_all_authenticated"
  on public.financial_entries for all
  to authenticated using (true) with check (true);

-- -------------------------------------------------------------
-- 6. Categorias padrão (as mesmas linhas do "Resumo Anual" da planilha)
-- -------------------------------------------------------------
insert into public.financial_categories (name, kind, sort_order) values
  ('Mensalidades / clientes recorrentes', 'Receita', 10),
  ('Projetos avulsos',                    'Receita', 20),
  ('Produtos / cursos',                   'Receita', 30),
  ('Outras receitas',                     'Receita', 40),
  ('Pró-labore (sócias)',                 'Despesa', 10),
  ('Freelancers / colaboradores',         'Despesa', 20),
  ('Tráfego pago (gestão)',               'Despesa', 30),
  ('Telefone / internet',                 'Despesa', 40),
  ('Transporte / deslocamento',           'Despesa', 50),
  ('Contabilidade / MEI',                 'Despesa', 60),
  ('DAS - Simples Nacional',              'Despesa', 70),
  ('Equipamentos',                        'Despesa', 80),
  ('Assinaturas e ferramentas digitais',  'Despesa', 90),
  ('Outros custos operacionais',          'Despesa', 100)
on conflict (kind, name) do nothing;
