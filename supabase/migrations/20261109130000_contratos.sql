-- =============================================================
-- Contratos de cliente — a entidade que faltava
--
-- O ERRO QUE ISTO CORRIGE
--
-- Até aqui, "contrato" era duas coisas espalhadas e nenhuma delas
-- era um contrato:
--
--   1. o ARQUIVO assinado, um `client_files` marcado como 'Contrato';
--   2. o VALOR, uma linha de `financial_recurrences`.
--
-- Ou seja: o sistema sabia quanto o cliente paga e tinha o PDF, mas
-- não sabia desde quando ele é cliente, até quando o contrato vale, o
-- que está no escopo, nem quando reajustar. A Fran pediu exatamente
-- isso: "cada cliente tem o seu contrato, o seu tempo de contrato, os
-- seus dados, que às vezes a gente precisa acessar rápido".
--
-- Eu tinha feito contrato = recorrência para não duplicar dado. Foi
-- troca errada: economizou uma tabela e custou a informação toda.
--
-- COMO FICA
--
-- O contrato é a entidade; a recorrência é a COBRANÇA que ele gera.
-- `recurrence_id` liga as duas, e continua existindo um valor só:
-- quem manda no quanto é o contrato, e a recorrência é o braço dele
-- dentro do financeiro.
--
-- Idempotente.
-- =============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'contract_status') then
    create type contract_status as enum ('Ativo', 'Pausado', 'Encerrado');
  end if;
end
$$;

create table if not exists public.client_contracts (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients(id) on delete cascade,
  status         contract_status not null default 'Ativo',
  -- Quanto o cliente paga por mês, por este contrato.
  monthly_amount numeric(12, 2) not null default 0 check (monthly_amount >= 0),
  -- O que está incluído. Texto livre de propósito: escopo de agência
  -- não cabe em lista fechada, e engessar aqui só faria escrever
  -- "outros" o tempo todo.
  scope          text,
  start_date     date not null,
  -- Null = sem data de fim combinada (vigência indeterminada).
  end_date       date,
  -- Índice de reajuste, quando houver: 'IPCA', 'IGP-M'...
  readjust_index text,
  -- Quando foi reajustado pela última vez. Null = nunca.
  last_readjust  date,
  signed_at      date,
  notes          text,
  -- A cobrança que este contrato gera no financeiro.
  recurrence_id  uuid references public.financial_recurrences(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

comment on table public.client_contracts is
  'Contrato do cliente: vigência, escopo e reajuste. A cobrança que ele gera vive em financial_recurrences.';

create index if not exists idx_client_contracts_client
  on public.client_contracts (client_id);
create index if not exists idx_client_contracts_status
  on public.client_contracts (status, end_date);

drop trigger if exists trg_client_contracts_updated_at on public.client_contracts;
create trigger trg_client_contracts_updated_at
  before update on public.client_contracts
  for each row execute function public.set_updated_at();

-- Dado da empresa: as duas sócias veem o mesmo, desde que liberadas.
alter table public.client_contracts enable row level security;

drop policy if exists "client_contracts_liberado" on public.client_contracts;
create policy "client_contracts_liberado"
  on public.client_contracts for all
  to authenticated
  using (public.usuario_aprovado())
  with check (public.usuario_aprovado());

revoke all on public.client_contracts from anon;

-- -------------------------------------------------------------
-- Aproveita o que já existe
--
-- Cada mensalidade ativa no financeiro vira um contrato, com o valor
-- e o início que ela já tinha. Vigência, escopo e reajuste ficam em
-- branco, para serem preenchidos uma vez, por cliente. É melhor do
-- que começar do zero: o valor e a data de início já estão certos.
-- -------------------------------------------------------------
insert into public.client_contracts
  (client_id, status, monthly_amount, start_date, end_date, recurrence_id)
select r.client_id,
       'Ativo',
       r.amount,
       (r.start_month || '-01')::date,
       case when r.end_month is null then null
            else (date_trunc('month', (r.end_month || '-01')::date)
                  + interval '1 month - 1 day')::date end,
       r.id
  from public.financial_recurrences r
 where r.kind = 'Receita'
   and r.active
   and r.client_id is not null
   and not exists (
     select 1 from public.client_contracts c where c.recurrence_id = r.id
   );
