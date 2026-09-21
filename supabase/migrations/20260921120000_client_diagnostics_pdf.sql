-- =============================================================
-- Diagnóstico do cliente — tabela + suporte a PDF
--
-- Cria a tabela client_diagnostics caso ainda não exista (em projetos onde a
-- migração original 20260726120000 não foi aplicada) e garante o suporte a
-- arquivo (PDF): colunas path + mime_type, e html opcional.
--
-- O diagnóstico pode ser:
--   - HTML inline: html preenchido, path/mime_type nulos.
--   - Arquivo (PDF, imagem…): no Storage (bucket client-files), com path +
--     mime_type preenchidos e html nulo.
--
-- Totalmente idempotente.
-- =============================================================

create table if not exists public.client_diagnostics (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  title       text,
  html        text,
  path        text,
  mime_type   text,
  created_at  timestamptz not null default now(),
  uploaded_by uuid references public.profiles (id) on delete set null
);

-- Garante as colunas novas caso a tabela já existisse numa versão antiga.
alter table public.client_diagnostics
  add column if not exists html      text,
  add column if not exists path      text,
  add column if not exists mime_type text;

-- html deixa de ser obrigatório (PDF não tem html inline).
alter table public.client_diagnostics
  alter column html drop not null;

comment on table public.client_diagnostics is
  'Diagnósticos por cliente — análise profunda (HTML inline ou arquivo PDF no Storage).';
comment on column public.client_diagnostics.path is
  'Caminho no Storage (bucket client-files) quando o diagnóstico é um arquivo (PDF etc.). Nulo para HTML inline.';
comment on column public.client_diagnostics.mime_type is
  'Tipo do arquivo quando guardado no Storage (ex.: application/pdf).';

create index if not exists idx_client_diagnostics_client_id
  on public.client_diagnostics (client_id);

alter table public.client_diagnostics enable row level security;

drop policy if exists "client_diagnostics_all_authenticated" on public.client_diagnostics;
create policy "client_diagnostics_all_authenticated"
  on public.client_diagnostics for all
  to authenticated
  using (true)
  with check (true);
