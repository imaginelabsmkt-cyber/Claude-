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
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  active            boolean not null default true,
  color             text, -- cor de identificação (hex), ex.: #4f46e5
  posting_frequency text, -- ex.: "3x por semana"
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
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

  -- Arquivos / links
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
