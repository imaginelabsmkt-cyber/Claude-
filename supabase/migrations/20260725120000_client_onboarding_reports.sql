-- =============================================================
-- Onboard (DNA) e Relatórios do cliente
--
-- - client_onboarding: 1 linha por cliente com o "DNA" (informações
--   principais + direção do conteúdo). Guardado como JSONB para o formulário
--   poder evoluir sem novas migrações.
-- - client_reports: relatórios mensais/quinzenais enviados pela Vitória
--   (arquivo no bucket client-files) + metadados para visualização.
--
-- Idempotente.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Onboarding (DNA do cliente)
-- -------------------------------------------------------------
create table if not exists public.client_onboarding (
  client_id  uuid primary key references public.clients (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.client_onboarding is
  'DNA / onboarding do cliente (informações principais e direção do conteúdo).';

alter table public.client_onboarding enable row level security;

drop policy if exists "client_onboarding_all_authenticated" on public.client_onboarding;
create policy "client_onboarding_all_authenticated"
  on public.client_onboarding for all
  to authenticated
  using (true)
  with check (true);

drop trigger if exists trg_client_onboarding_updated_at on public.client_onboarding;
create trigger trg_client_onboarding_updated_at
  before update on public.client_onboarding
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- 2. Relatórios do cliente
-- -------------------------------------------------------------
create table if not exists public.client_reports (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients (id) on delete cascade,
  reference_month text,
  title           text,
  path            text,
  file_name       text,
  size_bytes      bigint,
  mime_type       text,
  notes           text,
  uploaded_by     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

comment on table public.client_reports is
  'Relatórios (mensais/quinzenais) por cliente. Arquivo no bucket client-files.';

create index if not exists idx_client_reports_client_id
  on public.client_reports (client_id);

alter table public.client_reports enable row level security;

drop policy if exists "client_reports_all_authenticated" on public.client_reports;
create policy "client_reports_all_authenticated"
  on public.client_reports for all
  to authenticated
  using (true)
  with check (true);

-- Reaproveita o bucket "client-files" (criado na migração de arquivos). Se
-- ainda não existir, cria aqui também (idempotente).
insert into storage.buckets (id, name, public)
values ('client-files', 'client-files', false)
on conflict (id) do nothing;
