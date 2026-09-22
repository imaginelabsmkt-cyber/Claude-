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
