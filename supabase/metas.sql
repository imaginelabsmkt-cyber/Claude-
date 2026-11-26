-- =============================================================
-- METAS: as premissas e as contratações da projeção
--
-- A Fran: "eu quero adicionar uma aba de metas no nosso sistema (...)
-- e eu quero que tudo se integre, o financeiro, o administrativo,
-- tudo se integre para a gente conseguir ficar sempre analisando
-- essas projeções."
--
-- O QUE NÃO ENTRA AQUI, DE PROPÓSITO:
--
--   clientes de hoje e faturamento recorrente  -> da carteira
--   custo fixo                                 -> das contas fixas
--   oportunidades em negociação                -> do funil
--
-- Isso tudo o sistema já sabe, e a planilha tinha que digitar à mão.
-- É o "se integre" do pedido: a projeção lê o que já existe e guarda
-- só o que é PALPITE — quanto vai custar um editor, quando entra a
-- CS, quanto se quer guardar por mês.
--
-- Pode rodar quantas vezes quiser.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Premissas: linha única, como o financial_settings
-- -------------------------------------------------------------
create table if not exists public.growth_assumptions (
  id boolean primary key default true check (id),

  -- Quanto vale um cliente novo, e quanto trabalho ele dá.
  ticket_novo        numeric(14, 2) not null default 2000,
  videos_por_cliente numeric(6, 2)  not null default 4,

  -- O editor é pago por vídeo, não por mês: tem teto de produção.
  videos_do_editor   integer        not null default 50,
  preco_por_video    numeric(14, 2) not null default 50,

  -- Imposto. `imposto_fixo` é o palpite de vocês; `imposto_percentual`
  -- é a 1ª faixa do Anexo III do Simples, para comparar.
  imposto_fixo       numeric(14, 2) not null default 600,
  contador_mensal    numeric(14, 2) not null default 0,
  das_do_mei         numeric(14, 2) not null default 86.05,
  imposto_percentual numeric(6, 4)  not null default 0.06,

  -- A saída do MEI custa uma vez e muda o imposto daí para a frente.
  custo_saida_do_mei numeric(14, 2) not null default 2000,
  mes_saida_do_mei   text           not null default '2027-01',

  -- Encargos sobre salário CLT: 13º, férias com 1/3, FGTS. Em PJ, 0.
  encargos_clt       numeric(6, 4)  not null default 0.40,

  -- A meta.
  guardar_por_mes    numeric(14, 2) not null default 8500,
  meta_guardada      numeric(14, 2) not null default 50000,
  mes_da_meta        text           not null default '2027-06',
  clientes_na_projecao integer      not null default 20,

  updated_at timestamptz not null default now()
);

insert into public.growth_assumptions (id) values (true)
on conflict (id) do nothing;

comment on table public.growth_assumptions is
  'Os palpites da projeção. O que o sistema já sabe (carteira, custo fixo, funil) NÃO mora aqui.';

-- -------------------------------------------------------------
-- 2. Contratações
-- -------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'hire_pay_kind') then
    -- Duas formas de pagar, e elas mudam a conta:
    --   mensal       custo igual todo mês (salário, PJ fixo)
    --   por_video    custo = vídeos editados × preço, com teto
    create type hire_pay_kind as enum ('mensal', 'por_video');
  end if;
end $$;

create table if not exists public.growth_hires (
  id         uuid primary key default gen_random_uuid(),
  role       text not null,
  pay_kind   hire_pay_kind not null default 'mensal',

  -- Para 'mensal': o salário. Para 'por_video': fica em branco e a
  -- conta usa o preço por vídeo das premissas.
  monthly_cost numeric(14, 2),

  -- 'YYYY-MM' do primeiro mês em que a pessoa custa dinheiro.
  start_month text not null,

  -- Entra na conta? Desmarcar simula adiar a contratação sem apagar.
  active     boolean not null default true,

  -- Encargos CLT por cima do salário. PJ: false.
  clt        boolean not null default true,

  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_growth_hires_start
  on public.growth_hires (start_month);

-- -------------------------------------------------------------
-- 3. Quantos clientes novos entram em cada mês
-- -------------------------------------------------------------
create table if not exists public.growth_months (
  reference_month text primary key,     -- 'YYYY-MM'
  novos_clientes  integer not null default 0,
  updated_at      timestamptz not null default now()
);

comment on table public.growth_months is
  'O ritmo de entrada da projeção: quantos clientes novos em cada mês.';

-- -------------------------------------------------------------
-- 4. RLS, no mesmo padrão do resto
-- -------------------------------------------------------------
alter table public.growth_assumptions enable row level security;
alter table public.growth_hires       enable row level security;
alter table public.growth_months      enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                  where tablename = 'growth_assumptions'
                    and policyname = 'growth_assumptions_all_authenticated') then
    create policy "growth_assumptions_all_authenticated"
      on public.growth_assumptions for all to authenticated
      using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies
                  where tablename = 'growth_hires'
                    and policyname = 'growth_hires_all_authenticated') then
    create policy "growth_hires_all_authenticated"
      on public.growth_hires for all to authenticated
      using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies
                  where tablename = 'growth_months'
                    and policyname = 'growth_months_all_authenticated') then
    create policy "growth_months_all_authenticated"
      on public.growth_months for all to authenticated
      using (true) with check (true);
  end if;
end $$;

-- -------------------------------------------------------------
-- 5. As contratações que já estão decididas
--
-- A Fran: "uma projeção que a gente já tem que adicionar aí para
-- março do ano que vem é a contratação de uma pessoa, um videomaker,
-- para a gente já ter uma pessoa que acompanha as gravações, para a
-- gente conseguir já fazer uma transição."
--
-- O videomaker entra em março/27. As outras três vêm da planilha da
-- Vitória, e as datas saem do mês a mês que ela montou.
--
-- Entram só se a tabela estiver vazia: depois disso, quem manda é o
-- que as duas mexeram na tela.
-- -------------------------------------------------------------
insert into public.growth_hires (role, pay_kind, monthly_cost, start_month, clt, notes)
select * from (values
  -- Mensal, e SEM VALOR de propósito.
  --
  -- A Fran disse quando e para quê, não quanto. Eu não invento folha
  -- de pagamento: um número chutado aqui atravessa a projeção
  -- inteira e some, porque vira só mais uma linha somada. Em branco,
  -- a tela cobra o valor e avisa que a projeção está incompleta.
  --
  -- E não é 'por_video': videomaker GRAVA, o editor EDITA. Pôr os
  -- dois na mesma conta pagaria duas vezes pelo mesmo vídeo.
  ('Videomaker', 'mensal'::hire_pay_kind, null::numeric,
   '2027-03', false,
   'Acompanha as gravações, para a Fran fazer a transição. Falta definir o valor.'),
  ('Editor', 'por_video'::hire_pay_kind, null::numeric,
   '2027-03', false,
   'Pago por vídeo, com teto de produção nas premissas.'),
  ('CS', 'mensal'::hire_pay_kind, 2000::numeric,
   '2027-04', true,
   'Atendimento, aprovações e relatórios.'),
  ('Social media', 'mensal'::hire_pay_kind, 2000::numeric,
   '2027-05', true,
   'Planejamento, roteiros, legendas e carrosséis.')
) as t(role, pay_kind, monthly_cost, start_month, clt, notes)
where not exists (select 1 from public.growth_hires);

-- O ritmo de entrada da planilha da Vitória: 12 clientes até maio.
insert into public.growth_months (reference_month, novos_clientes)
select * from (values
  ('2027-01', 4), ('2027-02', 2), ('2027-03', 2),
  ('2027-04', 2), ('2027-05', 2), ('2027-06', 0)
) as t(mes, novos)
where not exists (select 1 from public.growth_months);
