-- =============================================================
-- Empresa — documentos e obrigações com prazo
--
-- Duas lacunas do sistema interno:
--
--   1. DOCUMENTOS. Contrato assinado, cartão CNPJ, alvará, nota fiscal.
--      Documento de CLIENTE já tem lugar (`client_files`) — aqui só se
--      acrescenta o TIPO, para dar para achar "os contratos". Documento
--      da EMPRESA (que não é de nenhum cliente) ganha `company_files`.
--
--   2. OBRIGAÇÕES COM PRAZO PRÓPRIO. DAS e contabilidade já vêm do
--      financeiro, porque são despesas. Mas há prazo que não é despesa:
--      a declaração anual do Simples, a renovação do alvará. Essas
--      viram `company_obligations`, com a periodicidade, e cada período
--      cumprido é registrado em `obligation_completions`.
--
-- Idempotente.
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- 1. Tipo do documento de cliente
--    Coluna nova em `client_files` em vez de tabela nova: o arquivo do
--    contrato do Kiku Sushi é um arquivo do Kiku Sushi, e continua
--    aparecendo na ficha dele. O tipo só torna possível filtrar.
-- -------------------------------------------------------------
alter table public.client_files
  add column if not exists kind text not null default 'Outro';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'client_files_kind_check'
  ) then
    alter table public.client_files
      add constraint client_files_kind_check check (
        kind in ('Contrato', 'Proposta', 'Briefing', 'Referência', 'Arte', 'Nota fiscal', 'Outro')
      );
  end if;
end
$$;

create index if not exists idx_client_files_kind on public.client_files (kind);

-- -------------------------------------------------------------
-- 2. Documentos da empresa
--    Binário no bucket privado "company-files"; aqui só os metadados.
-- -------------------------------------------------------------
create table if not exists public.company_files (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  path        text not null unique,
  kind        text not null default 'Outro',
  size_bytes  bigint,
  mime_type   text,
  notes       text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint company_files_kind_check check (
    kind in ('Contrato social', 'CNPJ', 'Alvará', 'Certidão', 'Imposto',
             'Contabilidade', 'Seguro', 'Outro')
  )
);

comment on table public.company_files is
  'Documentos da empresa (metadados; binário no bucket company-files do Storage).';

create index if not exists idx_company_files_kind on public.company_files (kind);

insert into storage.buckets (id, name, public)
values ('company-files', 'company-files', false)
on conflict (id) do nothing;

drop policy if exists "company_files_objects_select" on storage.objects;
create policy "company_files_objects_select"
  on storage.objects for select
  to authenticated using (bucket_id = 'company-files');

drop policy if exists "company_files_objects_insert" on storage.objects;
create policy "company_files_objects_insert"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'company-files');

drop policy if exists "company_files_objects_delete" on storage.objects;
create policy "company_files_objects_delete"
  on storage.objects for delete
  to authenticated using (bucket_id = 'company-files');

-- -------------------------------------------------------------
-- 3. Obrigações com prazo próprio
-- -------------------------------------------------------------

-- Periodicidade da obrigação.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'obligation_cadence') then
    create type obligation_cadence as enum ('Mensal', 'Trimestral', 'Anual', 'Única');
  end if;
end
$$;

create table if not exists public.company_obligations (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  -- Qual área do sistema interno cuida disso ('contabil' ou 'administrativo').
  area        text not null default 'contabil',
  cadence     obligation_cadence not null default 'Mensal',
  -- Dia do vencimento (1-31). Dia que não existe no mês cai no último.
  due_day     integer check (due_day between 1 and 31),
  -- Mês do vencimento (1-12): usado por Anual e como âncora do Trimestral.
  due_month   integer check (due_month between 1 and 12),
  -- Data exata, só para a periodicidade "Única".
  due_date    date,
  -- Quantos dias antes o aviso deve aparecer no Início.
  alert_days  integer not null default 7 check (alert_days >= 0),
  notes       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint company_obligations_area_check
    check (area in ('contabil', 'administrativo')),
  -- Coerência: "Única" exige data; as periódicas exigem dia.
  constraint company_obligations_prazo_check check (
    (cadence = 'Única' and due_date is not null)
    or (cadence <> 'Única' and due_day is not null)
  ),
  -- Anual precisa saber em qual mês.
  constraint company_obligations_anual_check check (
    cadence <> 'Anual' or due_month is not null
  )
);

comment on table public.company_obligations is
  'Prazos que não são despesa (declaração anual, alvará). Despesa com prazo vive no financeiro.';

create index if not exists idx_obligations_active on public.company_obligations (active);
create index if not exists idx_obligations_area on public.company_obligations (area);

-- 3.1 Cada período cumprido. A chave do período é texto porque varia com
--     a periodicidade: "2026-09" (mensal/trimestral), "2026" (anual),
--     "unica" (uma vez só).
create table if not exists public.obligation_completions (
  id            uuid primary key default gen_random_uuid(),
  obligation_id uuid not null references public.company_obligations(id) on delete cascade,
  period        text not null,
  completed_at  date not null default current_date,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (obligation_id, period)
);

comment on table public.obligation_completions is
  'Um registro por período cumprido. A unicidade impede marcar duas vezes o mesmo período.';

create index if not exists idx_completions_obligation
  on public.obligation_completions (obligation_id);

-- -------------------------------------------------------------
-- 4. Triggers
-- -------------------------------------------------------------
drop trigger if exists trg_obligations_updated_at on public.company_obligations;
create trigger trg_obligations_updated_at
  before update on public.company_obligations
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- 5. Row Level Security
-- -------------------------------------------------------------
alter table public.company_files            enable row level security;
alter table public.company_obligations      enable row level security;
alter table public.obligation_completions   enable row level security;

drop policy if exists "company_files_all_authenticated" on public.company_files;
create policy "company_files_all_authenticated"
  on public.company_files for all
  to authenticated using (true) with check (true);

drop policy if exists "company_obligations_all_authenticated" on public.company_obligations;
create policy "company_obligations_all_authenticated"
  on public.company_obligations for all
  to authenticated using (true) with check (true);

drop policy if exists "obligation_completions_all_authenticated" on public.obligation_completions;
create policy "obligation_completions_all_authenticated"
  on public.obligation_completions for all
  to authenticated using (true) with check (true);

-- -------------------------------------------------------------
-- 6. Obrigações que toda MEI/Simples tem (só se a tabela estiver vazia)
-- -------------------------------------------------------------
insert into public.company_obligations (title, area, cadence, due_day, due_month, alert_days, notes)
select * from (values
  ('Declaração anual do Simples (DEFIS)', 'contabil', 'Anual'::obligation_cadence, 31, 3, 30,
   'Prazo até 31 de março, referente ao ano anterior.'),
  ('Conferir DAS do mês com o contador', 'contabil', 'Mensal'::obligation_cadence, 15, null, 3,
   'Antes do vencimento dia 20.')
) as novas(title, area, cadence, due_day, due_month, alert_days, notes)
where not exists (select 1 from public.company_obligations);
