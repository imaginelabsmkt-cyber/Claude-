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
-- só o que é PALPITE, quanto vai custar um editor, quando entra a
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
  --
  -- Estes dois ficaram por compatibilidade: o valor e o teto de cada
  -- pessoa agora moram na contratação dela, onde dá para saber de
  -- quem são.
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
-- -------------------------------------------------------------
-- 2. Contratações
--
-- CINCO FORMAS DE PAGAR, e elas mudam a conta de jeitos diferentes:
--
--   mensal              salário igual todo mês (a CS, única CLT)
--   por_video_editado   o editor: valor por vídeo, com teto
--   por_video_gravado   o videomaker: valor por vídeo GRAVADO
--   por_cliente         a social media: valor por cliente atendido
--   uma_vez             o advogado: custo único, num mês só
--
-- GRAVADO E EDITADO SÃO CONTAS SEPARADAS. Videomaker grava, editor
-- edita, e o mesmo vídeo passa pelos dois. Na primeira versão eu
-- tinha os dois como "por vídeo" e a conta pagaria duas vezes pela
-- mesma coisa.
--
-- O VALOR E O TETO MORAM NA CONTRATAÇÃO, não nas premissas. O editor
-- edita 50 a R$ 50; o videomaker grava 45 a R$ 60; a social media
-- atende 10 a R$ 200. São três pares de números, e cada um pertence
-- a uma pessoa: nas premissas viravam seis campos soltos que ninguém
-- sabe de quem são.
--
-- `pay_kind` é TEXTO com lista fechada, e não enum, de propósito: o
-- Postgres não deixa usar um valor de enum recém-criado como literal
-- na mesma transação, e esta lista ainda vai crescer. Com texto e
-- check, acrescentar uma forma nova é uma linha.
-- -------------------------------------------------------------
create table if not exists public.growth_hires (
  id         uuid primary key default gen_random_uuid(),
  role       text not null,
  pay_kind   text not null default 'mensal',

  -- Para 'mensal' e 'uma_vez': o valor. Nas outras, fica em branco e
  -- a conta usa `unit_rate` vezes as unidades do mês.
  monthly_cost numeric(14, 2),

  -- Para as formas por unidade: quanto vale cada uma e quantas no
  -- máximo por mês. O que passar do teto continua com as sócias.
  unit_rate  numeric(14, 2),
  unit_cap   numeric(10, 2),

  -- 'YYYY-MM' do primeiro mês em que a pessoa custa dinheiro.
  -- Para 'uma_vez', é o único mês em que ela custa.
  start_month text not null,

  -- Entra na conta? Desmarcar simula adiar a contratação sem apagar.
  active     boolean not null default true,

  -- Encargos CLT por cima do salário. Por demanda: false.
  clt        boolean not null default true,

  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Quem já tinha a tabela com o enum antigo: converte para texto.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'growth_hires'
       and column_name = 'pay_kind' and udt_name = 'hire_pay_kind'
  ) then
    alter table public.growth_hires
      alter column pay_kind drop default,
      alter column pay_kind type text using pay_kind::text,
      alter column pay_kind set default 'mensal';
    update public.growth_hires set pay_kind = 'por_video_editado'
     where pay_kind = 'por_video';
  end if;
end $$;

alter table public.growth_hires
  add column if not exists unit_rate numeric(14, 2),
  add column if not exists unit_cap  numeric(10, 2);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'growth_hires_pay_kind_ok'
  ) then
    alter table public.growth_hires
      add constraint growth_hires_pay_kind_ok check (pay_kind in (
        'mensal', 'por_video_editado', 'por_video_gravado',
        'por_cliente', 'uma_vez'
      ));
  end if;
end $$;

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
insert into public.growth_hires
  (role, pay_kind, monthly_cost, unit_rate, unit_cap, start_month, clt, notes)
select * from (values
  ('Editor', 'por_video_editado', null::numeric, 50::numeric, 50::numeric,
   '2027-03', false,
   'Por demanda. Edita até 50 vídeos por mês; o que passar fica com a Fran.'),

  -- "Uma pessoa que acompanha as gravações, para a gente conseguir
  -- fazer uma transição." Grava, não edita: o mesmo vídeo passa
  -- pelos dois, e somar os dois na mesma conta pagaria duas vezes.
  ('Videomaker', 'por_video_gravado', null::numeric, 60::numeric, 45::numeric,
   '2027-03', false,
   'Por demanda. Grava até 45 vídeos por mês; o resto a Fran grava. Cerca de 1h por vídeo.'),

  ('Social media', 'por_cliente', null::numeric, 200::numeric, 10::numeric,
   '2027-05', false,
   'Por demanda. Planejamento, roteiros, legendas e carrosséis de até 10 clientes.'),

  ('CS', 'mensal', 2000::numeric, null::numeric, null::numeric,
   '2027-04', true,
   'Única contratação CLT. Atendimento, aprovações e relatórios.'),

  -- Custo de uma vez, num mês só. Um mês antes das contratações de
  -- março, para os contratos estarem prontos quando a equipe entrar.
  ('Advogado', 'uma_vez', 3000::numeric, null::numeric, null::numeric,
   '2027-02', false,
   'Revisão de 3 contratos a R$ 1.000: modelo PJ por demanda, contrato CLT da CS e modelo dos clientes. Não é custo mensal.')
) as t(role, pay_kind, monthly_cost, unit_rate, unit_cap, start_month, clt, notes)
where not exists (select 1 from public.growth_hires);

-- O ritmo de entrada da planilha da Vitória: 12 clientes até maio.
insert into public.growth_months (reference_month, novos_clientes)
select * from (values
  ('2027-01', 4), ('2027-02', 2), ('2027-03', 2),
  ('2027-04', 2), ('2027-05', 2), ('2027-06', 0)
) as t(mes, novos)
where not exists (select 1 from public.growth_months);
