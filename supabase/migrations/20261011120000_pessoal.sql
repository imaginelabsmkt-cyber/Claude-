-- =============================================================
-- Gastos pessoais — uma aba por pessoa, privada de verdade
--
-- O PEDIDO
--
-- "Quero que cada uma tenha uma aba própria para controlar os
--  próprios gastos, mas eu não vou ter acesso à dela e ela não vai
--  ter acesso à minha."
--
-- POR QUE ISTO É DIFERENTE DE TUDO O QUE EXISTE AQUI
--
-- Todas as outras tabelas do sistema interno têm a mesma policy:
-- `using (public.usuario_aprovado())`. Isso é correto para a EMPRESA
-- — as duas sócias precisam ver o mesmo caixa, a mesma carteira, os
-- mesmos contratos. Mas é exatamente o que NÃO pode valer aqui.
--
-- Então estas duas tabelas seguem o padrão das `google_*`:
-- `user_id = auth.uid()`. Cada linha pertence a um login, e o banco
-- — não a tela — é quem garante que a outra pessoa não a vê. Mesmo
-- que alguém chame a API do Supabase direto, por fora do sistema,
-- com a chave anon que é pública: o Postgres devolve zero linhas.
--
-- Três camadas, todas no banco:
--   1. `default auth.uid()` — a linha nasce sua, sem o app precisar
--      informar nada;
--   2. `using (user_id = auth.uid())` — você só LÊ o que é seu;
--   3. `with check (user_id = auth.uid())` — você não consegue
--      GRAVAR uma linha no nome de outra pessoa, nem transferir uma
--      linha sua para ela.
--
-- E continua valendo o `usuario_aprovado()`: conta não liberada não
-- vê nem os próprios gastos.
--
-- O LIMITE HONESTO DESTA PROTEÇÃO
--
-- Ela vale para quem entra pelo sistema, com login. Quem tem acesso
-- ao PAINEL do Supabase (ou à chave `service_role`) passa por cima
-- de qualquer RLS — é o dono do banco. Como as duas sócias dividem
-- o mesmo projeto Supabase, as duas são donas do banco. Privacidade
-- aqui é entre as telas, não contra o administrador.
--
-- Idempotente.
-- =============================================================

-- -------------------------------------------------------------
-- 1. O plano fixo de cada uma (aluguel, academia, assinaturas)
--
--    Mesma ideia das recorrências da empresa: cadastra uma vez,
--    vira lançamento de qualquer mês com um clique.
-- -------------------------------------------------------------
create table if not exists public.personal_recurrences (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
                 references auth.users(id) on delete cascade,
  kind         financial_kind not null default 'Despesa',
  category     text not null,
  description  text not null,
  amount       numeric(12, 2) not null check (amount >= 0),
  -- Dia do vencimento (1..31). O dia 31 em fevereiro cai no último dia.
  due_day      smallint check (due_day between 1 and 31),
  start_month  text not null,            -- "YYYY-MM"
  end_month    text,                     -- "YYYY-MM" ou null (sem fim)
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- -------------------------------------------------------------
-- 2. Os lançamentos do mês
-- -------------------------------------------------------------
create table if not exists public.personal_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid()
                    references auth.users(id) on delete cascade,
  reference_month text not null,          -- "YYYY-MM"
  kind            financial_kind not null default 'Despesa',
  category        text not null,
  description     text not null,
  amount          numeric(12, 2) not null check (amount >= 0),
  entry_date      date,
  -- Diferente da empresa: aqui o normal é lançar o que JÁ aconteceu,
  -- então nasce pago. Desmarcar é para a conta que ainda vai vencer.
  paid            boolean not null default true,
  notes           text,
  -- Origem, quando nasceu do plano fixo. O par com o mês é único,
  -- então "gerar os fixos" pode ser clicado à vontade sem duplicar.
  recurrence_id   uuid references public.personal_recurrences(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (recurrence_id, reference_month)
);

comment on table public.personal_entries is
  'Gastos e receitas pessoais. PRIVADO por user_id — nunca compartilhado.';
comment on table public.personal_recurrences is
  'Plano fixo pessoal. PRIVADO por user_id — nunca compartilhado.';

-- -------------------------------------------------------------
-- 3. Índices — a consulta sempre parte de (quem, qual mês)
-- -------------------------------------------------------------
create index if not exists idx_personal_entries_user_month
  on public.personal_entries (user_id, reference_month);
create index if not exists idx_personal_recurrences_user_active
  on public.personal_recurrences (user_id, active);

-- -------------------------------------------------------------
-- 4. updated_at (função da migration inicial)
-- -------------------------------------------------------------
drop trigger if exists trg_personal_entries_updated_at on public.personal_entries;
create trigger trg_personal_entries_updated_at
  before update on public.personal_entries
  for each row execute function public.set_updated_at();

drop trigger if exists trg_personal_recurrences_updated_at on public.personal_recurrences;
create trigger trg_personal_recurrences_updated_at
  before update on public.personal_recurrences
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- 5. RLS — o coração deste arquivo
-- -------------------------------------------------------------
alter table public.personal_entries enable row level security;
alter table public.personal_recurrences enable row level security;

drop policy if exists "personal_entries_own" on public.personal_entries;
create policy "personal_entries_own"
  on public.personal_entries for all
  to authenticated
  using (user_id = auth.uid() and public.usuario_aprovado())
  with check (user_id = auth.uid() and public.usuario_aprovado());

drop policy if exists "personal_recurrences_own" on public.personal_recurrences;
create policy "personal_recurrences_own"
  on public.personal_recurrences for all
  to authenticated
  using (user_id = auth.uid() and public.usuario_aprovado())
  with check (user_id = auth.uid() and public.usuario_aprovado());

-- Ninguém anônimo chega aqui.
revoke all on public.personal_entries from anon;
revoke all on public.personal_recurrences from anon;

-- -------------------------------------------------------------
-- 6. Quem sou eu na equipe
--
--    `team_members.profile_id` já existia (migration de Pessoas) mas
--    nunca era preenchido. Preencher permite a aba pessoal mostrar
--    "você recebeu X de pró-labore neste mês" lendo o financeiro da
--    empresa, em vez de a pessoa redigitar o próprio salário.
--
--    A função deixa alguém se identificar — só a si mesma, e só numa
--    pessoa que ainda não tem dono. Reivindicar a pessoa da outra
--    sócia é bloqueado.
-- -------------------------------------------------------------
create or replace function public.vincular_me_a_pessoa(pessoa uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sem sessão.';
  end if;

  if not public.usuario_aprovado() then
    raise exception 'Conta não liberada.';
  end if;

  -- Solta o vínculo anterior desta conta (trocar de pessoa é permitido).
  update public.team_members
     set profile_id = null
   where profile_id = auth.uid()
     and id <> pessoa;

  update public.team_members
     set profile_id = auth.uid()
   where id = pessoa
     and (profile_id is null or profile_id = auth.uid());

  if not found then
    raise exception 'Essa pessoa já está ligada a outro login.';
  end if;
end;
$$;

revoke all on function public.vincular_me_a_pessoa(uuid) from anon;
grant execute on function public.vincular_me_a_pessoa(uuid) to authenticated;
