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
