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
