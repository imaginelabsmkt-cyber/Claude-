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
