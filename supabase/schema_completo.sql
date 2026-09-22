-- =============================================================
-- FAVIE — SCHEMA COMPLETO (arquivo único)
--
-- Junta as 21 migrations na ordem correta, para você colar UMA VEZ
-- no SQL Editor do Supabase em vez de rodar uma a uma.
--
-- É seguro rodar mais de uma vez: todas as partes são idempotentes.
-- Se parar no meio por algum motivo, pode rodar tudo de novo.
--
-- Gerado a partir de supabase/migrations/ — não edite este arquivo à
-- mão: mexa na migration correspondente e gere de novo.
-- =============================================================



-- =============================================================
-- [01/21] 20260714120000_initial_schema.sql
-- =============================================================

-- =============================================================
-- Migration inicial — Sistema de Gestão de Produção de Conteúdo
-- Agência de social media
--
-- Ordem de criação (evita erros de dependência):
--   1. Extensões
--   2. Tipos ENUM
--   3. Tabelas (na ordem das chaves estrangeiras)
--   4. Índices
--   5. Funções
--   6. Triggers
--   7. Row Level Security (RLS) + políticas
--
-- Convenção: nomes de tabelas/colunas em snake_case (inglês), compatível
-- com o padrão do Supabase/Postgres.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Extensões
-- -------------------------------------------------------------
create extension if not exists pgcrypto; -- gen_random_uuid()

-- -------------------------------------------------------------
-- 2. Tipos ENUM
-- (guardados em blocos DO para permitir reexecução sem erro)
-- -------------------------------------------------------------

-- Papéis de usuário
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('planner', 'producer', 'admin');
  end if;
end
$$;

-- Status do conteúdo (pipeline de produção)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type content_status as enum (
      'Planejamento',
      'Roteiro pronto',
      'Aguardando gravação',
      'Gravado',
      'Fila de edição',
      'Em edição',
      'Revisão interna',
      'Aprovação do cliente',
      'Ajustes',
      'Aprovado',
      'Agendado',
      'Publicado',
      'Pausado',
      'Cancelado'
    );
  end if;
end
$$;

-- Prioridade do conteúdo
do $$
begin
  if not exists (select 1 from pg_type where typname = 'content_priority') then
    create type content_priority as enum ('Urgente', 'Alta', 'Média', 'Baixa');
  end if;
end
$$;

-- -------------------------------------------------------------
-- 3. Tabelas
-- -------------------------------------------------------------

-- 3.1 profiles — perfil do usuário (1:1 com auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  email       text not null unique,
  role        user_role not null default 'producer',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Perfis de usuário; id espelha auth.users.';

-- 3.2 clients — clientes atendidos pela agência
create table if not exists public.clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  active        boolean not null default true,
  color         text,    -- cor de identificação (hex), ex.: #4f46e5
  niche         text,    -- nicho do cliente, ex.: "Dentista"
  monthly_goal  integer, -- meta de conteúdos por mês (opcional)
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.clients is 'Clientes da agência.';

-- 3.3 contents — entidade central (pauta/roteiro + pipeline)
create table if not exists public.contents (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid not null references public.clients (id) on delete restrict,

  -- Identificação / planejamento
  title                  text not null,
  description            text,
  format                 text,          -- ex.: Reel, Carrossel, Story
  content_pillar         text,          -- pilar de conteúdo
  objective              text,          -- objetivo da postagem
  status                 content_status not null default 'Planejamento',
  priority               content_priority not null default 'Média',

  -- Datas de planejamento
  reference_month        text,          -- mês de referência, ex.: "2026-07"
  planned_week           integer,       -- semana planejada (1-5)
  planned_date           date,          -- data planejada de publicação
  actual_post_date       date,          -- data real da publicação

  -- Gravação
  requires_recording     boolean not null default false,
  recording_date         date,
  recording_time         text,
  recording_location     text,
  participants           text[] not null default '{}',
  outfit                 text,          -- figurino/vestuário
  required_materials     text[] not null default '{}',

  -- Responsáveis (referenciam profiles)
  planner_id             uuid references public.profiles (id) on delete set null,
  recorder_id            uuid references public.profiles (id) on delete set null,
  editor_id              uuid references public.profiles (id) on delete set null,
  publisher_id           uuid references public.profiles (id) on delete set null,

  -- Prazos
  script_deadline        date,
  recording_deadline     date,
  editing_deadline       date,

  -- Conteúdo rico (vindo do planejamento)
  script                 text,          -- roteiro completo
  caption                text,          -- legenda do post

  -- Arquivos / links
  reference_url          text,
  script_url             text,
  raw_files_url          text,
  edited_file_url        text,
  published_url          text,

  -- Controle
  notes                  text,
  revision_count         integer not null default 0,
  editing_queue_position integer,
  is_fixed_date          boolean not null default false,
  is_campaign            boolean not null default false,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.contents is 'Conteúdos: entidade central do pipeline de produção.';

-- 3.4 content_history — histórico de mudanças de campos do conteúdo
create table if not exists public.content_history (
  id            uuid primary key default gen_random_uuid(),
  content_id    uuid not null references public.contents (id) on delete cascade,
  user_id       uuid references public.profiles (id) on delete set null,
  field_changed text not null,
  old_value     text,
  new_value     text,
  created_at    timestamptz not null default now()
);

comment on table public.content_history is 'Auditoria de alterações em campos de contents.';

-- 3.5 comments — comentários em um conteúdo
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete set null,
  comment    text not null,
  created_at timestamptz not null default now()
);

comment on table public.comments is 'Comentários de colaboração em um conteúdo.';

-- -------------------------------------------------------------
-- 4. Índices (chaves estrangeiras e campos usados em filtros)
-- -------------------------------------------------------------
create index if not exists idx_clients_active            on public.clients (active);

create index if not exists idx_contents_client_id        on public.contents (client_id);
create index if not exists idx_contents_status           on public.contents (status);
create index if not exists idx_contents_priority         on public.contents (priority);
create index if not exists idx_contents_planned_date     on public.contents (planned_date);
create index if not exists idx_contents_reference_month  on public.contents (reference_month);
create index if not exists idx_contents_planner_id       on public.contents (planner_id);
create index if not exists idx_contents_recorder_id      on public.contents (recorder_id);
create index if not exists idx_contents_editor_id        on public.contents (editor_id);
create index if not exists idx_contents_publisher_id     on public.contents (publisher_id);

create index if not exists idx_content_history_content_id on public.content_history (content_id);
create index if not exists idx_content_history_user_id    on public.content_history (user_id);

create index if not exists idx_comments_content_id       on public.comments (content_id);
create index if not exists idx_comments_user_id          on public.comments (user_id);

-- -------------------------------------------------------------
-- 5. Funções
-- -------------------------------------------------------------

-- 5.1 Atualiza automaticamente o campo updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 5.2 Cria um profile automaticamente quando um usuário é criado no Auth.
--     Lê name/role de raw_user_meta_data; role inválido cai para 'producer'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
begin
  begin
    v_role := (new.raw_user_meta_data ->> 'role')::user_role;
  exception when others then
    v_role := 'producer';
  end;

  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(v_role, 'producer')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- -------------------------------------------------------------
-- 6. Triggers
-- -------------------------------------------------------------

-- 6.1 updated_at
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists trg_contents_updated_at on public.contents;
create trigger trg_contents_updated_at
  before update on public.contents
  for each row execute function public.set_updated_at();

-- 6.2 Criação automática de profile no signup
drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------
-- 7. Row Level Security (RLS) + políticas
--
-- Regra do MVP: todo usuário AUTENTICADO pode visualizar e editar
-- todos os registros do sistema. Refinamentos por papel virão depois.
-- -------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.clients         enable row level security;
alter table public.contents        enable row level security;
alter table public.content_history enable row level security;
alter table public.comments        enable row level security;

-- profiles
drop policy if exists "profiles_all_authenticated" on public.profiles;
create policy "profiles_all_authenticated"
  on public.profiles for all
  to authenticated
  using (true)
  with check (true);

-- clients
drop policy if exists "clients_all_authenticated" on public.clients;
create policy "clients_all_authenticated"
  on public.clients for all
  to authenticated
  using (true)
  with check (true);

-- contents
drop policy if exists "contents_all_authenticated" on public.contents;
create policy "contents_all_authenticated"
  on public.contents for all
  to authenticated
  using (true)
  with check (true);

-- content_history
drop policy if exists "content_history_all_authenticated" on public.content_history;
create policy "content_history_all_authenticated"
  on public.content_history for all
  to authenticated
  using (true)
  with check (true);

-- comments
drop policy if exists "comments_all_authenticated" on public.comments;
create policy "comments_all_authenticated"
  on public.comments for all
  to authenticated
  using (true)
  with check (true);


-- =============================================================
-- [02/21] 20260715120000_client_niche_monthly_goal.sql
-- =============================================================

-- =============================================================
-- Atualização do cadastro de clientes
-- - Adiciona: niche (nicho) e monthly_goal (meta de conteúdos por mês)
-- - Remove: posting_frequency (medição por semana foi substituída pela
--   meta mensal + contagem real de conteúdos)
-- Idempotente: pode rodar sem erro mesmo se reexecutada.
-- =============================================================

alter table public.clients add column if not exists niche text;
alter table public.clients add column if not exists monthly_goal integer;
alter table public.clients drop column if exists posting_frequency;


-- =============================================================
-- [03/21] 20260715130000_content_script_caption.sql
-- =============================================================

-- =============================================================
-- Conteúdos: campos de roteiro e legenda
-- - script:  roteiro completo (cenas/falas/stories), vindo do planejamento
-- - caption: legenda do post
-- Idempotente.
-- =============================================================

alter table public.contents add column if not exists script text;
alter table public.contents add column if not exists caption text;


-- =============================================================
-- [04/21] 20260715140000_content_reference_url.sql
-- =============================================================

-- =============================================================
-- Conteúdos: link de referência (Instagram/TikTok)
-- Usado como inspiração na hora de gravar/editar. Vem do planejamento
-- (campo "REFERÊNCIA:" / "LINK:").
-- Idempotente.
-- =============================================================

alter table public.contents add column if not exists reference_url text;


-- =============================================================
-- [05/21] 20260716120000_hardening_rls.sql
-- =============================================================

-- =============================================================
-- Endurecimento de segurança (RLS + signup)
--
-- Contexto: as policies iniciais eram "for all to authenticated using(true)",
-- o que permitia a um usuário autenticado alterar QUALQUER perfil (inclusive
-- o papel) e apagar/editar o histórico e comentários de outros. Esta migração
-- restringe esses três pontos sem mudar o comportamento do app.
-- Idempotente.
-- =============================================================

-- -------------------------------------------------------------
-- 1. profiles: ver todos, mas editar só o próprio; papel imutável
-- -------------------------------------------------------------
drop policy if exists "profiles_all_authenticated" on public.profiles;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Impede que o usuário altere o próprio papel/e-mail via update comum.
-- Só protege quando quem atualiza é um usuário autenticado (app). O seed e a
-- administração via service_role/SQL (auth.uid() nulo) continuam livres para
-- ajustar papéis.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.role := old.role;
    new.email := old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect on public.profiles;
create trigger trg_profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- -------------------------------------------------------------
-- 2. content_history: somente inserir e ler (auditoria imutável)
-- -------------------------------------------------------------
drop policy if exists "content_history_all_authenticated" on public.content_history;

drop policy if exists "content_history_select_authenticated" on public.content_history;
create policy "content_history_select_authenticated"
  on public.content_history for select
  to authenticated
  using (true);

drop policy if exists "content_history_insert_authenticated" on public.content_history;
create policy "content_history_insert_authenticated"
  on public.content_history for insert
  to authenticated
  with check (true);
-- (sem policy de update/delete => update/delete negados)

-- -------------------------------------------------------------
-- 3. comments: ler/criar todos; editar/apagar só os próprios
-- -------------------------------------------------------------
drop policy if exists "comments_all_authenticated" on public.comments;

drop policy if exists "comments_select_authenticated" on public.comments;
create policy "comments_select_authenticated"
  on public.comments for select
  to authenticated
  using (true);

drop policy if exists "comments_insert_authenticated" on public.comments;
create policy "comments_insert_authenticated"
  on public.comments for insert
  to authenticated
  with check (true);

drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own"
  on public.comments for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own"
  on public.comments for delete
  to authenticated
  using (user_id = auth.uid());

-- -------------------------------------------------------------
-- 4. Signup: nunca aceitar 'role' vindo do metadata (evita virar admin)
-- -------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    'producer' -- papel padrão; ajuste manualmente para planner/admin quando necessário
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


-- =============================================================
-- [06/21] 20260717120000_content_recording_time.sql
-- =============================================================

-- =============================================================
-- Conteúdos: horário da gravação (HH:MM)
-- A data já existe (recording_date); a hora permite agendar "terça às 9h"
-- e virar tarefa/evento no Google Agenda no horário certo.
-- Idempotente.
-- =============================================================

alter table public.contents add column if not exists recording_time text;


-- =============================================================
-- [07/21] 20260718120000_google_integration.sql
-- =============================================================

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


-- =============================================================
-- [08/21] 20260719120000_plannings.sql
-- =============================================================

-- =============================================================
-- Planejamentos: gestão da CRIAÇÃO do planejamento mensal por cliente
-- (marcar reunião -> reunião -> criação -> envio -> aprovação).
-- Um registro por cliente por mês.
-- Idempotente.
-- =============================================================

create extension if not exists pgcrypto;

create table if not exists public.plannings (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  reference_month   text not null, -- "YYYY-MM"
  status            text not null default 'Marcar reunião',
  meeting_date      date,
  meeting_time      text,          -- "HH:MM" (opcional)
  delivery_deadline date,
  notes             text,          -- anotações da reunião
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (client_id, reference_month)
);

alter table public.plannings enable row level security;

-- Dados compartilhados entre as usuárias (mesma filosofia de clients/contents).
drop policy if exists "plannings_all_authenticated" on public.plannings;
create policy "plannings_all_authenticated"
  on public.plannings for all
  to authenticated
  using (true)
  with check (true);

drop trigger if exists trg_plannings_updated_at on public.plannings;
create trigger trg_plannings_updated_at
  before update on public.plannings
  for each row execute function public.set_updated_at();


-- =============================================================
-- [09/21] 20260720120000_planning_google_sync.sql
-- =============================================================

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


-- =============================================================
-- [10/21] 20260721120000_planning_situation.sql
-- =============================================================

-- Situação MANUAL do planejamento (marcada pela planejadora, não automática).
-- Ex.: Pendente, Entregue, Atrasado, Reagendado.
alter table public.plannings
  add column if not exists situation text;


-- =============================================================
-- [11/21] 20260722120000_google_calendars.sql
-- =============================================================

-- Calendários próprios da agência dentro da conta Google de cada usuário.
-- Guardamos o ID de cada calendário (criado sob demanda) para rotear os
-- eventos: Reuniões, Produção (gravações/fotos) e Postagens.
alter table public.google_accounts
  add column if not exists cal_reunioes text,
  add column if not exists cal_producao text,
  add column if not exists cal_postagens text;


-- =============================================================
-- [12/21] 20260723120000_content_cover_source.sql
-- =============================================================

-- Vincula uma CAPA (arte) ao vídeo de origem, para gerar a demanda de capa
-- automaticamente quando o vídeo é editado (e evitar capas duplicadas).
alter table public.contents
  add column if not exists cover_source_id uuid references public.contents(id) on delete set null;

create index if not exists idx_contents_cover_source
  on public.contents(cover_source_id);


-- =============================================================
-- [13/21] 20260724120000_client_files.sql
-- =============================================================

-- =============================================================
-- Central de arquivos por cliente
--
-- Guarda os arquivos (briefings, referências, contratos, artes, etc.) de
-- cada cliente centralizados na ficha dele. O binário fica no Storage
-- (bucket privado "client-files"); esta tabela guarda os metadados
-- (nome original, caminho, tamanho, quem enviou).
--
-- Idempotente — pode rodar novamente sem erro.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Tabela de metadados
-- -------------------------------------------------------------
create table if not exists public.client_files (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  name        text not null,
  path        text not null unique,
  size_bytes  bigint,
  mime_type   text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table public.client_files is
  'Arquivos centralizados por cliente (metadados; binário no bucket client-files do Storage).';

create index if not exists idx_client_files_client_id
  on public.client_files (client_id);

alter table public.client_files enable row level security;

drop policy if exists "client_files_all_authenticated" on public.client_files;
create policy "client_files_all_authenticated"
  on public.client_files for all
  to authenticated
  using (true)
  with check (true);

-- -------------------------------------------------------------
-- 2. Bucket de armazenamento (privado)
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('client-files', 'client-files', false)
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- 3. Policies do Storage para o bucket client-files
--    (time pequeno e confiável: qualquer usuário autenticado acessa)
-- -------------------------------------------------------------
drop policy if exists "client_files_objects_select" on storage.objects;
create policy "client_files_objects_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'client-files');

drop policy if exists "client_files_objects_insert" on storage.objects;
create policy "client_files_objects_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'client-files');

drop policy if exists "client_files_objects_update" on storage.objects;
create policy "client_files_objects_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'client-files')
  with check (bucket_id = 'client-files');

drop policy if exists "client_files_objects_delete" on storage.objects;
create policy "client_files_objects_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'client-files');


-- =============================================================
-- [14/21] 20260725120000_client_onboarding_reports.sql
-- =============================================================

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


-- =============================================================
-- [15/21] 20260726120000_client_diagnostics.sql
-- =============================================================

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


-- =============================================================
-- [16/21] 20260727120000_report_analysis.sql
-- =============================================================

-- =============================================================
-- Análise do relatório gerada por IA
--
-- Guarda o resumo "mastigado" (JSON) que a IA produz a partir do relatório,
-- para não reprocessar toda vez. Idempotente.
-- =============================================================

alter table public.client_reports
  add column if not exists analysis text;


-- =============================================================
-- [17/21] 20260908120000_financeiro.sql
-- =============================================================

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


-- =============================================================
-- [18/21] 20260921120000_comercial.sql
-- =============================================================

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


-- =============================================================
-- [19/21] 20260922120000_empresa.sql
-- =============================================================

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


-- =============================================================
-- [20/21] 20260923120000_pessoas.sql
-- =============================================================

-- =============================================================
-- Pessoas — quem trabalha na agência e quanto custa
--
-- Até aqui a área "Pessoas" era só um recorte do financeiro: mostrava
-- o total de pró-labore, mas não sabia QUEM. Esta migration cria o
-- cadastro das pessoas e liga cada pagamento a uma delas.
--
-- Por que uma tabela nova, se já existe `profiles`?
--   `profiles` é quem faz LOGIN no sistema (hoje, Fran e Vitória).
--   `team_members` é quem RECEBE dinheiro da agência — o que inclui
--   freelancers que nunca vão ter login. São coisas diferentes, e a
--   ligação opcional `profile_id` junta as duas quando é a mesma pessoa.
--
-- O quanto cada um custa continua saindo do financeiro: a coluna nova
-- em `financial_entries` só diz a quem aquele lançamento se refere.
--
-- Idempotente.
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- 1. Tipo de vínculo
-- -------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'team_kind') then
    create type team_kind as enum ('Sócia', 'Freelancer', 'Prestador');
  end if;
end
$$;

-- -------------------------------------------------------------
-- 2. Cadastro de pessoas
-- -------------------------------------------------------------
create table if not exists public.team_members (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  kind         team_kind not null default 'Freelancer',
  -- O que a pessoa faz (edição, design, tráfego...).
  role         text,
  -- Quem faz login no sistema, quando for a mesma pessoa.
  profile_id   uuid references public.profiles(id) on delete set null,
  -- Valor de referência: pró-labore mensal ou diária/cachê do freela.
  default_rate numeric(12, 2) check (default_rate is null or default_rate >= 0),
  contact      text,
  -- Chave PIX ou dado de pagamento. Não é segredo de sistema, é dado
  -- de cadastro — mas fica atrás do login como todo o resto.
  payment_info text,
  notes        text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (name)
);

comment on table public.team_members is
  'Quem recebe dinheiro da agência. Diferente de profiles, que é quem faz login.';

create index if not exists idx_team_members_active on public.team_members (active);

-- -------------------------------------------------------------
-- 3. A quem o lançamento se refere
--    Nullable: lançamento de pessoas antigo (ou de outra natureza)
--    continua válido sem apontar para ninguém.
-- -------------------------------------------------------------
alter table public.financial_entries
  add column if not exists team_member_id uuid
  references public.team_members(id) on delete set null;

create index if not exists idx_financial_entries_team_member
  on public.financial_entries (team_member_id);

-- A recorrência do pró-labore também aponta para a pessoa, para que os
-- lançamentos gerados todo mês já nasçam com o dono certo.
alter table public.financial_recurrences
  add column if not exists team_member_id uuid
  references public.team_members(id) on delete set null;

-- -------------------------------------------------------------
-- 4. Triggers
-- -------------------------------------------------------------
drop trigger if exists trg_team_members_updated_at on public.team_members;
create trigger trg_team_members_updated_at
  before update on public.team_members
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- 5. Row Level Security
-- -------------------------------------------------------------
alter table public.team_members enable row level security;

drop policy if exists "team_members_all_authenticated" on public.team_members;
create policy "team_members_all_authenticated"
  on public.team_members for all
  to authenticated using (true) with check (true);

-- -------------------------------------------------------------
-- 6. As duas sócias, e a ligação com o pró-labore que já existe
-- -------------------------------------------------------------
insert into public.team_members (name, kind, role)
select * from (values
  ('Fran',    'Sócia'::team_kind, 'Produção e financeiro'),
  ('Vitória', 'Sócia'::team_kind, 'Planejamento e comercial')
) as novas(name, kind, role)
where not exists (select 1 from public.team_members);

-- Liga o que já existe: "Pró-labore Fran" -> a pessoa Fran.
update public.financial_entries e
   set team_member_id = t.id
  from public.team_members t
 where e.team_member_id is null
   and e.description = 'Pró-labore ' || t.name;

update public.financial_recurrences r
   set team_member_id = t.id
  from public.team_members t
 where r.team_member_id is null
   and r.description = 'Pró-labore ' || t.name;


-- =============================================================
-- [21/21] 20260924120000_seguranca.sql
-- =============================================================

-- =============================================================
-- Segurança — só conta LIBERADA enxerga o sistema
--
-- O PROBLEMA QUE ISTO RESOLVE
--
-- A chave "anon" do Supabase é pública por natureza: ela vai no
-- JavaScript que o navegador baixa, e qualquer pessoa consegue lê-la.
-- Com ela, dá para chamar a API de cadastro do Supabase diretamente,
-- mesmo o sistema não tendo tela de cadastro nenhuma.
--
-- E o que acontecia depois: o trigger `handle_new_user` criava um
-- profile para o novo usuário, e as 23 policies com `using (true)`
-- liberavam TUDO para qualquer autenticado — fluxo de caixa, carteira
-- de clientes, contratos, chaves PIX, documentos da empresa.
--
-- Ou seja: um estranho que criasse conta lia (e escrevia) a empresa
-- inteira.
--
-- A SOLUÇÃO
--
-- Uma conta passa a valer só depois de LIBERADA por quem já está
-- dentro. `profiles.approved` começa em `false`, e todas as policies
-- passam a exigir que o usuário esteja liberado. Quem se cadastrar
-- sozinho continua criando um profile — mas não enxerga nada.
--
-- Isso é defesa em profundidade: mesmo que o cadastro fique aberto nas
-- configurações do Supabase, a conta nasce inerte.
--
-- Idempotente.
-- =============================================================

-- -------------------------------------------------------------
-- 1. A marca de conta liberada
-- -------------------------------------------------------------
alter table public.profiles
  add column if not exists approved boolean not null default false;

comment on column public.profiles.approved is
  'Conta liberada para usar o sistema. Nasce false; liberar é ato de quem já está dentro.';

-- Quem JÁ existe foi cadastrado à mão por vocês, então está liberado.
-- Roda uma vez só: depois disso, conta nova nasce bloqueada.
update public.profiles set approved = true where approved = false;

-- -------------------------------------------------------------
-- 2. A função que as policies consultam
--
--    `security definer` é essencial: a função lê `profiles` por fora
--    do RLS. Sem isso, uma policy de `profiles` que chamasse esta
--    função entraria em recursão infinita.
-- -------------------------------------------------------------
create or replace function public.usuario_aprovado()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and approved
  );
$$;

comment on function public.usuario_aprovado() is
  'A conta autenticada está liberada? Usada por todas as policies.';

revoke all on function public.usuario_aprovado() from public, anon;
grant execute on function public.usuario_aprovado() to authenticated;

-- -------------------------------------------------------------
-- 3. Ninguém se libera sozinho
--
--    O Supabase concede UPDATE na tabela inteira para `authenticated`.
--    Revogar coluna a coluna não adianta enquanto o grant de tabela
--    existir — então revoga-se a tabela e devolve-se só o que o app
--    realmente edita (o nome do perfil, em /configuracoes).
--
--    Sem isto, um usuário bloqueado se marcaria `approved = true`, ou
--    se promoveria a `admin`.
-- -------------------------------------------------------------
revoke update on public.profiles from authenticated, anon;
grant update (name, avatar_url) on public.profiles to authenticated;

-- Criar e apagar perfil é do trigger de signup, não do usuário.
revoke insert, delete on public.profiles from authenticated, anon;

-- -------------------------------------------------------------
-- 4. Policies: tudo passa a exigir conta liberada
-- -------------------------------------------------------------

-- 4.1 profiles — você sempre lê a si mesmo (senão nem a tela de
--     "conta não liberada" saberia seu nome); ver os colegas exige
--     estar liberado.
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_liberado"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.usuario_aprovado());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 4.2 As demais tabelas: acesso total para quem está liberado, nada
--     para quem não está.
do $$
declare
  t text;
  tabelas text[] := array[
    'clients', 'contents', 'comments',
    'plannings', 'client_files', 'client_onboarding',
    'client_reports', 'client_diagnostics',
    'financial_settings', 'financial_categories',
    'financial_recurrences', 'financial_entries',
    'commercial_leads', 'commercial_proposals',
    'company_files', 'company_obligations', 'obligation_completions',
    'team_members'
  ];
begin
  foreach t in array tabelas loop
    -- Só age sobre o que existe, para a migration não depender da ordem.
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    -- Derruba as policies antigas desta tabela, sejam quais forem.
    execute (
      select coalesce(string_agg(
        format('drop policy if exists %I on public.%I;', policyname, t), ' '), '')
      from pg_policies where schemaname = 'public' and tablename = t
    );

    execute format(
      'create policy %I on public.%I for all to authenticated '
      || 'using (public.usuario_aprovado()) with check (public.usuario_aprovado())',
      t || '_liberado', t);
  end loop;
end
$$;

-- 4.3 content_history é AUDITORIA: escreve e lê, nunca edita nem apaga.
--     Sem policy de update/delete, o banco nega os dois.
drop policy if exists "content_history_select_authenticated" on public.content_history;
drop policy if exists "content_history_insert_authenticated" on public.content_history;
drop policy if exists "content_history_liberado" on public.content_history;

create policy "content_history_select_liberado"
  on public.content_history for select
  to authenticated
  using (public.usuario_aprovado());

create policy "content_history_insert_liberado"
  on public.content_history for insert
  to authenticated
  with check (public.usuario_aprovado());

-- 4.4 Integrações do Google continuam sendo de cada um — e agora
--     também exigem conta liberada.
drop policy if exists "google_accounts_own" on public.google_accounts;
create policy "google_accounts_own"
  on public.google_accounts for all
  to authenticated
  using (user_id = auth.uid() and public.usuario_aprovado())
  with check (user_id = auth.uid() and public.usuario_aprovado());

drop policy if exists "google_sync_own" on public.google_sync;
create policy "google_sync_own"
  on public.google_sync for all
  to authenticated
  using (user_id = auth.uid() and public.usuario_aprovado())
  with check (user_id = auth.uid() and public.usuario_aprovado());

drop policy if exists "planning_google_sync_own" on public.planning_google_sync;
create policy "planning_google_sync_own"
  on public.planning_google_sync for all
  to authenticated
  using (user_id = auth.uid() and public.usuario_aprovado())
  with check (user_id = auth.uid() and public.usuario_aprovado());

-- -------------------------------------------------------------
-- 5. Arquivos: os dois buckets também exigem conta liberada
--    (contratos, notas e documentos da empresa estão neles)
-- -------------------------------------------------------------
do $$
declare
  b text;
  buckets text[] := array['client-files', 'company-files'];
begin
  foreach b in array buckets loop
    execute format('drop policy if exists %I on storage.objects', b || '_select');
    execute format('drop policy if exists %I on storage.objects', b || '_insert');
    execute format('drop policy if exists %I on storage.objects', b || '_update');
    execute format('drop policy if exists %I on storage.objects', b || '_delete');

    execute format(
      'create policy %I on storage.objects for select to authenticated '
      || 'using (bucket_id = %L and public.usuario_aprovado())',
      b || '_select', b);
    execute format(
      'create policy %I on storage.objects for insert to authenticated '
      || 'with check (bucket_id = %L and public.usuario_aprovado())',
      b || '_insert', b);
    execute format(
      'create policy %I on storage.objects for delete to authenticated '
      || 'using (bucket_id = %L and public.usuario_aprovado())',
      b || '_delete', b);
  end loop;
end
$$;

-- As policies antigas dos buckets, que só olhavam o bucket_id.
drop policy if exists "client_files_objects_select" on storage.objects;
drop policy if exists "client_files_objects_insert" on storage.objects;
drop policy if exists "client_files_objects_update" on storage.objects;
drop policy if exists "client_files_objects_delete" on storage.objects;
drop policy if exists "company_files_objects_select" on storage.objects;
drop policy if exists "company_files_objects_insert" on storage.objects;
drop policy if exists "company_files_objects_delete" on storage.objects;

-- =============================================================
-- COMO LIBERAR UMA CONTA
--
--   update public.profiles set approved = true
--    where email = 'pessoa@exemplo.com';
--
-- E para ver quem está esperando:
--
--   select email, name, created_at from public.profiles
--    where not approved order by created_at;
-- =============================================================

