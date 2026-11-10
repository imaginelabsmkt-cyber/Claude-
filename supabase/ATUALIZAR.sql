-- =============================================================
-- ATUALIZAR O SISTEMA — rode este arquivo, só ele
--
-- GERADO por scripts/montar-atualizar.sh. Não editar à mão: mexa
-- nos arquivos de origem e rode o script de novo.
--
-- Junta, na ordem certa, tudo que ainda falta aplicar no banco:
--
--   0. 00_colunas_novas — as colunas que o sistema passou a precisar.
--      Vem primeiro porque os blocos seguintes usam elas.
--   1. ajustar_planilha_novembro — tira o Captions e a
--      Contabilidade / MEI, põe o Canva em R$ 35,00, entra a Salte,
--      e acerta o dia do pró-labore (10) e do cartão (20).
--   2. vencimentos_por_cliente — o dia de cada cliente.
--   3. meta_de_faturamento — cria o campo da meta do ano.
--   4. detalhar_historico — abre os meses passados item por item,
--      no lugar das linhas-bloco e do "A CLASSIFICAR".
--   5. antecipado_e_fatura_outubro — o Studio Bambu paga adiantado,
--      a Salte fica sem dia até fechar o contrato, e a fatura do
--      cartão de outubro entra com o que faltava.
--   6. destravar_fixos — as recorrências passam a valer desde o
--      começo da série, cada lançamento passado se liga à sua
--      recorrência (é o que faz aparecer a caixinha de pago nos
--      meses anteriores), o Softbox duplicado sai e a "segunda
--      cobrança do Adobe" vira "Adobe Premiere".
--
-- COMO RODAR
--
--   Supabase > SQL Editor > New query > colar tudo > Run.
--
-- Pode rodar quantas vezes quiser: nada aqui mexe no que já está
-- certo, e nada toca no que já foi pago.
-- =============================================================


-- =============================================================
-- 00_colunas_novas
-- =============================================================
alter table public.financial_recurrences
  add column if not exists vencimento_meses smallint not null default 1;

comment on column public.financial_recurrences.vencimento_meses is
  'Quantos meses depois da competência a conta vence. +1 é o normal; -1 é quem paga antecipado (Studio Bambu).';

-- Meta de faturamento do ano, em reais. Null = sem meta.
alter table public.financial_settings
  add column if not exists annual_revenue_goal numeric(14, 2);

comment on column public.financial_settings.annual_revenue_goal is
  'Meta de faturamento do ano, em reais. Null = sem meta.';

-- =============================================================
-- ajustar_planilha_novembro
-- =============================================================
update public.financial_recurrences r
   set due_day = 10, updated_at = now()
  from public.financial_categories c
 where c.id = r.category_id
   and c.name = 'Pró-labore (sócias)'
   and r.due_day is distinct from 10;

update public.financial_recurrences r
   set due_day = 20, updated_at = now()
  from public.financial_categories c
 where c.id = r.category_id
   and c.name = 'Assinaturas e ferramentas digitais'
   and r.due_day is distinct from 20;

-- -------------------------------------------------------------
-- 2. Captions e Contabilidade / MEI saem
-- -------------------------------------------------------------
-- Primeiro os lançamentos EM ABERTO que nasceram delas. O que já
-- está pago fica, porque aconteceu de verdade.
delete from public.financial_entries e
 using public.financial_recurrences r
 where e.recurrence_id = r.id
   and e.status <> 'Pago'
   and r.description in ('Captions', 'Honorários da contabilidade');

delete from public.financial_entries e
 using public.financial_categories c
 where c.id = e.category_id
   and e.status <> 'Pago'
   and (
     e.description = 'Captions'
     or (c.name = 'Contabilidade / MEI' and e.kind = 'Despesa')
   );

delete from public.financial_recurrences r
 where r.description in ('Captions', 'Honorários da contabilidade');

delete from public.financial_recurrences r
 using public.financial_categories c
 where c.id = r.category_id
   and c.name = 'Contabilidade / MEI';

-- -------------------------------------------------------------
-- 3. O item de R$ 53,00 (Canva) passa a R$ 35,00
-- -------------------------------------------------------------
update public.financial_recurrences
   set amount = 35.00, updated_at = now()
 where description = 'Canva'
   and amount = 53.00;

update public.financial_entries
   set amount = 35.00, updated_at = now()
 where description = 'Canva'
   and amount = 53.00
   and status <> 'Pago';

-- -------------------------------------------------------------
-- 4. A Salte entra como mensalidade de R$ 1.300,00
-- -------------------------------------------------------------
do $$
declare
  cat_mensalidade uuid;
  cliente_salte   uuid;
begin
  select id into cat_mensalidade
    from public.financial_categories
   where kind = 'Receita' and name = 'Mensalidades / clientes recorrentes';

  if cat_mensalidade is null then
    raise notice 'Categoria "Mensalidades / clientes recorrentes" não existe; a Salte não entrou.';
    return;
  end if;

  -- O cliente, se ainda não existir.
  select id into cliente_salte from public.clients where name = 'Salte';
  if cliente_salte is null then
    insert into public.clients (name, active)
         values ('Salte', true)
      returning id into cliente_salte;
  end if;

  -- A recorrência, se ainda não existir.
  if not exists (
    select 1 from public.financial_recurrences
     where description = 'Mensalidade Salte'
  ) then
    insert into public.financial_recurrences
      (description, kind, category_id, client_id, amount, due_day,
       start_month, active)
    values
      ('Mensalidade Salte', 'Receita', cat_mensalidade, cliente_salte,
       1300.00, 10, '2026-11', true);
  end if;
end $$;

-- -------------------------------------------------------------
-- 5. Reescreve o vencimento dos lançamentos EM ABERTO
--
-- A conta de um mês vence no mês seguinte, no dia da recorrência:
-- o pró-labore de outubro vence em 10/11, o cartão de outubro
-- vence em 20/11. Só mexe no que ainda não foi pago, e só onde a
-- data está diferente da que a regra manda.
-- -------------------------------------------------------------
update public.financial_entries e
   set due_date = (
         (date_trunc('month', (e.reference_month || '-01')::date)
            + interval '1 month')::date
         + (least(
              r.due_day,
              extract(day from (
                date_trunc('month', (e.reference_month || '-01')::date)
                  + interval '2 month' - interval '1 day'))::int
            ) - 1)
       ),
       updated_at = now()
  from public.financial_recurrences r
 where e.recurrence_id = r.id
   and e.status <> 'Pago'
   and r.due_day is not null
   and e.due_date is distinct from (
         (date_trunc('month', (e.reference_month || '-01')::date)
            + interval '1 month')::date
         + (least(
              r.due_day,
              extract(day from (
                date_trunc('month', (e.reference_month || '-01')::date)
                  + interval '2 month' - interval '1 day'))::int
            ) - 1)
       );

-- =============================================================
-- vencimentos_por_cliente
-- =============================================================
do $$
declare
  item record;
begin
  for item in
    select *
      from (values
        ('Mensalidade Kiku Sushi',            10),
        ('Mensalidade Malukies Cookies & Co', 10),
        ('Mensalidade Laura Chioquetta',      25),
        ('Mensalidade Natural Concept',       25),
        ('Mensalidade Studio Bambu',          25)
      ) as t(descricao, dia)
  loop
    update public.financial_recurrences
       set due_day = item.dia, updated_at = now()
     where description = item.descricao
       and due_day is distinct from item.dia;
  end loop;
end $$;

-- -------------------------------------------------------------
-- A Izabela paga em duas parcelas de R$ 900,00
--
-- Uma dia 10 e outra dia 25. Era uma linha só de R$ 1.800,00.
-- -------------------------------------------------------------
do $$
declare
  original uuid;
  cat      uuid;
  cliente  uuid;
begin
  select id, category_id, client_id into original, cat, cliente
    from public.financial_recurrences
   where description = 'Mensalidade Izabela Schipitoski';

  if original is null then
    return;  -- já foi dividida numa rodada anterior
  end if;

  -- Os lançamentos EM ABERTO que nasceram da linha única saem: o
  -- botão "Gerar do plano fixo" recria as duas parcelas. O que já
  -- foi recebido fica como está.
  delete from public.financial_entries
   where recurrence_id = original and status <> 'Pago';

  update public.financial_recurrences
     set description = 'Mensalidade Izabela Schipitoski (1ª parcela)',
         amount = 900.00,
         due_day = 10,
         updated_at = now()
   where id = original;

  if not exists (
    select 1 from public.financial_recurrences
     where description = 'Mensalidade Izabela Schipitoski (2ª parcela)'
  ) then
    insert into public.financial_recurrences
      (description, kind, category_id, client_id, amount, due_day,
       start_month, active)
    select 'Mensalidade Izabela Schipitoski (2ª parcela)', 'Receita',
           cat, cliente, 900.00, 25, r.start_month, r.active
      from public.financial_recurrences r
     where r.id = original;
  end if;
end $$;

-- Reescreve o vencimento do que ainda está EM ABERTO, pela regra:
-- mês seguinte ao da competência, no dia da recorrência. O que já
-- foi pago não é tocado.
update public.financial_entries e
   set due_date = (
         (date_trunc('month', (e.reference_month || '-01')::date)
            + (coalesce(r.vencimento_meses, 1) || ' month')::interval)::date
         + (least(
              r.due_day,
              extract(day from (
                date_trunc('month', (e.reference_month || '-01')::date)
                  + ((coalesce(r.vencimento_meses, 1) + 1) || ' month')::interval - interval '1 day'))::int
            ) - 1)
       ),
       updated_at = now()
  from public.financial_recurrences r
 where e.recurrence_id = r.id
   and e.status <> 'Pago'
   and r.due_day is not null
   and e.due_date is distinct from (
         (date_trunc('month', (e.reference_month || '-01')::date)
            + (coalesce(r.vencimento_meses, 1) || ' month')::interval)::date
         + (least(
              r.due_day,
              extract(day from (
                date_trunc('month', (e.reference_month || '-01')::date)
                  + ((coalesce(r.vencimento_meses, 1) + 1) || ' month')::interval - interval '1 day'))::int
            ) - 1)
       );

-- =============================================================
-- meta_de_faturamento
-- =============================================================
alter table public.financial_settings
  add column if not exists annual_revenue_goal numeric(14, 2);

comment on column public.financial_settings.annual_revenue_goal is
  'Meta de faturamento do ano, em reais. Null = sem meta.';

-- =============================================================
-- detalhar_historico
-- =============================================================
delete from public.financial_entries
 where reference_month in ('2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10')
   and kind = 'Despesa'
   and description in ('Pró-labore (sócias)', 'Assinaturas e ferramentas digitais', 'Equipamentos', 'Outros custos operacionais', 'Transporte / deslocamento', 'Tráfego pago (gestão)', 'Contabilidade / MEI', 'DAS - Simples Nacional', 'Telefone / internet', 'Freelancers / colaboradores', 'A CLASSIFICAR — diferença da planilha', 'Projetos avulsos', 'Projeto avulso');

-- 2. Uma linha por item.
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Despesa', c.id, 'Pró-labore Fran', 5500.00, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-04'
        and e.description = 'Pró-labore Fran'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Despesa', c.id, 'Pró-labore Vitória', 5500.00, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-04'
        and e.description = 'Pró-labore Vitória'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Despesa', c.id, 'Adobe', 95.00, 'Pago', '2026-05-20', '2026-05-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-04'
        and e.description = 'Adobe'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Despesa', c.id, 'Asana', 124.43, 'Pago', '2026-05-20', '2026-05-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-04'
        and e.description = 'Asana'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Despesa', c.id, 'CapCut', 32.90, 'Pago', '2026-05-20', '2026-05-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-04'
        and e.description = 'CapCut'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Despesa', c.id, 'Captions', 51.90, 'Pago', '2026-05-20', '2026-05-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-04'
        and e.description = 'Captions'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Despesa', c.id, 'Claude (assinatura)', 110.00, 'Pago', '2026-05-20', '2026-05-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-04'
        and e.description = 'Claude (assinatura)'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Despesa', c.id, 'iCloud Fran', 66.90, 'Pago', '2026-05-20', '2026-05-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-04'
        and e.description = 'iCloud Fran'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Despesa', c.id, 'iCloud Vitória', 66.90, 'Pago', '2026-05-20', '2026-05-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-04'
        and e.description = 'iCloud Vitória'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Pró-labore Fran', 6500.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Pró-labore Fran'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Pró-labore Vitória', 6500.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Pró-labore Vitória'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Tráfego pago (gestão)', 304.76, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Tráfego pago (gestão)'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Tráfego pago (gestão)'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Gasolina - carro Fran', 200.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Transporte / deslocamento'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Gasolina - carro Fran'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Gasolina - carro Vitória', 200.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Transporte / deslocamento'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Gasolina - carro Vitória'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Honorários da contabilidade', 159.90, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Transporte / deslocamento'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Honorários da contabilidade'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'DAS do Simples Nacional', 86.05, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Transporte / deslocamento'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'DAS do Simples Nacional'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Microfone Hollyland Lark M2 (parcela 1/2)', 387.33, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Microfone Hollyland Lark M2 (parcela 1/2)'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Mouse', 99.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Mouse'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Capa Macbook Fran', 89.97, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Capa Macbook Fran'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Capa Macbook Vitória', 89.97, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Capa Macbook Vitória'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Pilates', 342.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Outros custos operacionais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Pilates'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Janta comemoração meta', 151.57, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Outros custos operacionais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Janta comemoração meta'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Material ensaio cliente (cartolinas/fitas)', 35.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Outros custos operacionais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Material ensaio cliente (cartolinas/fitas)'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Adobe', 99.00, 'Pago', '2026-06-20', '2026-06-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Adobe'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'CapCut', 32.90, 'Pago', '2026-06-20', '2026-06-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'CapCut'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Canva', 35.00, 'Pago', '2026-06-20', '2026-06-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Canva'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Captions', 51.90, 'Pago', '2026-06-20', '2026-06-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Captions'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'ChatGPT Plus', 119.90, 'Pago', '2026-06-20', '2026-06-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'ChatGPT Plus'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Claude (assinatura)', 118.50, 'Pago', '2026-06-20', '2026-06-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Claude (assinatura)'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Claude Max', 487.56, 'Pago', '2026-06-20', '2026-06-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'Claude Max'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'iCloud Fran', 66.90, 'Pago', '2026-06-20', '2026-06-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'iCloud Fran'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'iCloud Vitória', 66.90, 'Pago', '2026-06-20', '2026-06-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-05'
        and e.description = 'iCloud Vitória'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'Pró-labore Fran', 6500.00, 'Pago', '2026-07-10', '2026-07-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-06'
        and e.description = 'Pró-labore Fran'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'Pró-labore Vitória', 6500.00, 'Pago', '2026-07-10', '2026-07-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-06'
        and e.description = 'Pró-labore Vitória'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'Honorários da contabilidade', 159.90, 'Pago', '2026-07-10', '2026-07-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Contabilidade / MEI'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-06'
        and e.description = 'Honorários da contabilidade'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'DAS do Simples Nacional', 86.05, 'Pago', '2026-07-20', '2026-07-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'DAS - Simples Nacional'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-06'
        and e.description = 'DAS do Simples Nacional'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'Microfone Hollyland Lark M2 (parcela 2/2)', 387.33, 'Pago', '2026-07-10', '2026-07-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-06'
        and e.description = 'Microfone Hollyland Lark M2 (parcela 2/2)'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'Adobe', 160.00, 'Pago', '2026-07-20', '2026-07-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-06'
        and e.description = 'Adobe'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'CapCut', 32.90, 'Pago', '2026-07-20', '2026-07-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-06'
        and e.description = 'CapCut'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'Canva', 35.00, 'Pago', '2026-07-20', '2026-07-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-06'
        and e.description = 'Canva'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'Captions', 51.90, 'Pago', '2026-07-20', '2026-07-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-06'
        and e.description = 'Captions'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'ChatGPT Plus', 107.51, 'Pago', '2026-07-20', '2026-07-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-06'
        and e.description = 'ChatGPT Plus'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'Claude Max', 612.77, 'Pago', '2026-07-20', '2026-07-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-06'
        and e.description = 'Claude Max'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'iCloud Fran', 66.90, 'Pago', '2026-07-20', '2026-07-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-06'
        and e.description = 'iCloud Fran'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'iCloud Vitória', 66.90, 'Pago', '2026-07-20', '2026-07-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-06'
        and e.description = 'iCloud Vitória'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'Pró-labore Fran', 6500.00, 'Pago', '2026-08-10', '2026-08-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-07'
        and e.description = 'Pró-labore Fran'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'Pró-labore Vitória', 6500.00, 'Pago', '2026-08-10', '2026-08-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-07'
        and e.description = 'Pró-labore Vitória'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'Honorários da contabilidade', 159.90, 'Pago', '2026-08-10', '2026-08-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Contabilidade / MEI'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-07'
        and e.description = 'Honorários da contabilidade'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'DAS do Simples Nacional', 86.05, 'Pago', '2026-08-20', '2026-08-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'DAS - Simples Nacional'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-07'
        and e.description = 'DAS do Simples Nacional'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'Gasolina - carro Fran', 200.00, 'Pago', '2026-08-10', '2026-08-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Transporte / deslocamento'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-07'
        and e.description = 'Gasolina - carro Fran'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'Softbox Octabox e Aputure Amaran (Parcela 1/4)', 671.04, 'Pago', '2026-08-10', '2026-08-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-07'
        and e.description = 'Softbox Octabox e Aputure Amaran (Parcela 1/4)'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'Tripé K&f (Parcela 1/2)', 368.76, 'Pago', '2026-08-10', '2026-08-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-07'
        and e.description = 'Tripé K&f (Parcela 1/2)'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'Adobe', 95.00, 'Pago', '2026-08-20', '2026-08-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-07'
        and e.description = 'Adobe'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'CapCut', 32.90, 'Pago', '2026-08-20', '2026-08-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-07'
        and e.description = 'CapCut'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'Canva', 35.00, 'Pago', '2026-08-20', '2026-08-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-07'
        and e.description = 'Canva'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'Captions', 51.90, 'Pago', '2026-08-20', '2026-08-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-07'
        and e.description = 'Captions'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'ChatGPT Plus', 119.90, 'Pago', '2026-08-20', '2026-08-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-07'
        and e.description = 'ChatGPT Plus'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'Claude Max', 612.77, 'Pago', '2026-08-20', '2026-08-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-07'
        and e.description = 'Claude Max'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'iCloud Fran', 66.90, 'Pago', '2026-08-20', '2026-08-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-07'
        and e.description = 'iCloud Fran'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'iCloud Vitória', 66.90, 'Pago', '2026-08-20', '2026-08-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-07'
        and e.description = 'iCloud Vitória'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'Pró-labore Fran', 6500.00, 'Pago', '2026-09-10', '2026-09-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-08'
        and e.description = 'Pró-labore Fran'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'Pró-labore Vitória', 6500.00, 'Pago', '2026-09-10', '2026-09-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-08'
        and e.description = 'Pró-labore Vitória'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'Tráfego pago (gestão)', 250.00, 'Pendente', '2026-09-10', null
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Tráfego pago (gestão)'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-08'
        and e.description = 'Tráfego pago (gestão)'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'DAS do Simples Nacional', 86.05, 'Pago', '2026-09-20', '2026-09-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'DAS - Simples Nacional'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-08'
        and e.description = 'DAS do Simples Nacional'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'Pilates', 495.00, 'Pago', '2026-09-10', '2026-09-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Outros custos operacionais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-08'
        and e.description = 'Pilates'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'Softbox Octabox e Aputure Amaran (Parcela 2/4)', 671.04, 'Pago', '2026-09-10', '2026-09-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-08'
        and e.description = 'Softbox Octabox e Aputure Amaran (Parcela 2/4)'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'Tripé K&f (Parcela 2/2)', 368.76, 'Pago', '2026-09-10', '2026-09-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-08'
        and e.description = 'Tripé K&f (Parcela 2/2)'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'Adobe', 95.00, 'Pago', '2026-09-20', '2026-09-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-08'
        and e.description = 'Adobe'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'CapCut', 32.90, 'Pago', '2026-09-20', '2026-09-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-08'
        and e.description = 'CapCut'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'Canva', 35.00, 'Pago', '2026-09-20', '2026-09-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-08'
        and e.description = 'Canva'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'ChatGPT Plus', 119.90, 'Pago', '2026-09-20', '2026-09-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-08'
        and e.description = 'ChatGPT Plus'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'Claude Max', 612.77, 'Pago', '2026-09-20', '2026-09-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-08'
        and e.description = 'Claude Max'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'iCloud Fran', 66.90, 'Pago', '2026-09-20', '2026-09-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-08'
        and e.description = 'iCloud Fran'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'iCloud Vitória', 66.90, 'Pago', '2026-09-20', '2026-09-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-08'
        and e.description = 'iCloud Vitória'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'Pró-labore Fran', 6500.00, 'Pago', '2026-10-10', '2026-10-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-09'
        and e.description = 'Pró-labore Fran'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'Pró-labore Vitória', 6500.00, 'Pago', '2026-10-10', '2026-10-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-09'
        and e.description = 'Pró-labore Vitória'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'Pilates', 495.00, 'Pago', '2026-10-10', '2026-10-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Outros custos operacionais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-09'
        and e.description = 'Pilates'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'DAS do Simples Nacional', 86.05, 'Pago', '2026-10-20', '2026-10-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'DAS - Simples Nacional'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-09'
        and e.description = 'DAS do Simples Nacional'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'Softbox Octabox e Aputure Amaran (Parcela 2/4)', 671.04, 'Pago', '2026-10-10', '2026-10-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-09'
        and e.description = 'Softbox Octabox e Aputure Amaran (Parcela 2/4)'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'Tripé K&f (Parcela 2/2)', 368.76, 'Pago', '2026-10-10', '2026-10-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-09'
        and e.description = 'Tripé K&f (Parcela 2/2)'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'Mentoria Ultralize', 2166.70, 'Pago', '2026-10-10', '2026-10-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-09'
        and e.description = 'Mentoria Ultralize'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'Adobe', 95.00, 'Pago', '2026-10-20', '2026-10-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-09'
        and e.description = 'Adobe'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'CapCut', 32.90, 'Pago', '2026-10-20', '2026-10-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-09'
        and e.description = 'CapCut'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'Canva', 32.00, 'Pago', '2026-10-20', '2026-10-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-09'
        and e.description = 'Canva'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'ChatGPT Plus', 119.90, 'Pago', '2026-10-20', '2026-10-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-09'
        and e.description = 'ChatGPT Plus'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'Claude Max', 612.77, 'Pago', '2026-10-20', '2026-10-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-09'
        and e.description = 'Claude Max'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'iCloud Fran', 66.90, 'Pago', '2026-10-20', '2026-10-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-09'
        and e.description = 'iCloud Fran'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'iCloud Vitória', 66.90, 'Pago', '2026-10-20', '2026-10-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-09'
        and e.description = 'iCloud Vitória'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Despesa', c.id, 'Pró-labore Fran', 6500.00, 'Pendente', '2026-11-10', null
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-10'
        and e.description = 'Pró-labore Fran'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Despesa', c.id, 'Pró-labore Vitória', 6500.00, 'Pendente', '2026-11-10', null
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-10'
        and e.description = 'Pró-labore Vitória'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Despesa', c.id, 'DAS do Simples Nacional', 86.05, 'Pago', '2026-11-20', '2026-11-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'DAS - Simples Nacional'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-10'
        and e.description = 'DAS do Simples Nacional'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Despesa', c.id, 'Softbox Octabox e Aputure Amaran (Parcela 4/4)', 671.03, 'Pendente', '2026-11-10', null
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-10'
        and e.description = 'Softbox Octabox e Aputure Amaran (Parcela 4/4)'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Despesa', c.id, 'Mentoria Ultralize', 2166.70, 'Pendente', '2026-11-10', null
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-10'
        and e.description = 'Mentoria Ultralize'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Despesa', c.id, 'Adobe', 95.00, 'Pendente', '2026-11-20', null
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-10'
        and e.description = 'Adobe'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Despesa', c.id, 'CapCut', 32.90, 'Pendente', '2026-11-20', null
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-10'
        and e.description = 'CapCut'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Despesa', c.id, 'Canva', 32.00, 'Pendente', '2026-11-20', null
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-10'
        and e.description = 'Canva'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Despesa', c.id, 'ChatGPT Plus', 119.90, 'Pendente', '2026-11-20', null
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-10'
        and e.description = 'ChatGPT Plus'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Despesa', c.id, 'Claude Max', 612.77, 'Pendente', '2026-11-20', null
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-10'
        and e.description = 'Claude Max'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Despesa', c.id, 'iCloud Fran', 66.90, 'Pendente', '2026-11-20', null
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-10'
        and e.description = 'iCloud Fran'
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Despesa', c.id, 'iCloud Vitória', 66.90, 'Pendente', '2026-11-20', null
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-10'
        and e.description = 'iCloud Vitória'
   );

-- =============================================================
-- antecipado_e_fatura_outubro
-- =============================================================
alter table public.financial_recurrences
  add column if not exists vencimento_meses smallint not null default 1;

comment on column public.financial_recurrences.vencimento_meses is
  'Quantos meses depois da competência a conta vence. +1 é o normal; -1 é quem paga antecipado (Studio Bambu).';

update public.financial_recurrences
   set vencimento_meses = -1, updated_at = now()
 where description = 'Mensalidade Studio Bambu'
   and vencimento_meses is distinct from -1;

-- A Salte ainda não tem contrato fechado, então não tem dia.
update public.financial_recurrences
   set due_day = null, updated_at = now()
 where description = 'Mensalidade Salte'
   and due_day is not null;

delete from public.financial_entries e
 using public.financial_recurrences r
 where e.recurrence_id = r.id
   and r.description = 'Mensalidade Salte'
   and e.status <> 'Pago'
   and e.due_date is not null;

-- -------------------------------------------------------------
-- 1b. "Adobe (segunda cobrança)" é o PREMIERE
--
-- Vem ANTES do bloco da fatura de propósito: se o nome velho ainda
-- estiver no banco, ele é corrigido primeiro e o bloco seguinte não
-- cria uma segunda linha achando que falta.
-- -------------------------------------------------------------
update public.financial_entries
   set description = 'Adobe Premiere', updated_at = now()
 where description = 'Adobe (segunda cobrança)';

-- -------------------------------------------------------------
-- 2. A fatura de outubro
-- -------------------------------------------------------------
do $$
declare
  cat_ferramentas uuid;
  cat_outros      uuid;
  item            record;
begin
  select id into cat_ferramentas
    from public.financial_categories
   where kind = 'Despesa' and name = 'Assinaturas e ferramentas digitais';

  select id into cat_outros
    from public.financial_categories
   where kind = 'Despesa' and name = 'Outros custos operacionais';

  -- Os valores que o cartão desmente.
  update public.financial_entries
     set amount = 572.00, updated_at = now()
   where reference_month = '2026-10' and description = 'Claude Max'
     and status <> 'Pago' and amount = 612.77;

  update public.financial_entries
     set amount = 103.90, updated_at = now()
   where reference_month = '2026-10' and description = 'ChatGPT Plus'
     and status <> 'Pago' and amount = 119.90;

  update public.financial_entries
     set amount = 35.00, updated_at = now()
   where reference_month = '2026-10' and description = 'Canva'
     and status <> 'Pago' and amount = 32.00;

  -- A Mentoria saiu do cartão da Vitória, e não deste. Fica
  -- anotado para ninguém procurar de novo na fatura errada.
  update public.financial_entries
     set payment_method = 'Cartão da Vitória', updated_at = now()
   where reference_month = '2026-10'
     and description = 'Mentoria Ultralize'
     and payment_method is distinct from 'Cartão da Vitória';

  -- O que faltava.
  if cat_ferramentas is not null then
    for item in
      select *
        from (values
          ('ElevenLabs',                      33.57),
          ('Adobe Premiere',                  65.00),
          ('IOF das compras internacionais',  24.83)
        ) as t(descricao, valor)
    loop
      if not exists (
        select 1 from public.financial_entries
         where reference_month = '2026-10' and description = item.descricao
      ) then
        insert into public.financial_entries
          (reference_month, kind, category_id, description, amount,
           status, due_date)
        values
          ('2026-10', 'Despesa', cat_ferramentas, item.descricao,
           item.valor, 'Pendente', '2026-11-20');
      end if;
    end loop;
  end if;

  if cat_outros is not null
     and not exists (
       select 1 from public.financial_entries
        where reference_month = '2026-10'
          and description = 'Pilates (parcela 1/3)'
     ) then
    insert into public.financial_entries
      (reference_month, kind, category_id, description, amount,
       status, due_date)
    values
      ('2026-10', 'Despesa', cat_outros, 'Pilates (parcela 1/3)',
       493.00, 'Pendente', '2026-11-20');
  end if;
end $$;

-- =============================================================
-- destravar_fixos
-- =============================================================
delete from public.financial_entries
 where reference_month = '2026-10'
   and description = 'Softbox Octabox e Aputure Amaran (Parcela 3/4)'
   and status <> 'Pago';

-- -------------------------------------------------------------
-- 2. Linha repetida no mesmo mês
--
-- Mesmo mês, mesmo nome, mesmo valor: fica uma só. Some apenas o
-- que está EM ABERTO — o que já foi pago nunca é apagado.
--
-- Isto limpa o estrago de rodadas anteriores (o Softbox apareceu
-- duas vezes, e o Premiere também). Se um dia houver duas cobranças
-- iguais de verdade no mesmo mês, diferencie pelo nome ("Adobe" e
-- "Adobe Premiere"), que é o que elas são.
-- -------------------------------------------------------------
delete from public.financial_entries e
 where e.status <> 'Pago'
   and exists (
     select 1
       from public.financial_entries x
      where x.reference_month = e.reference_month
        and x.description = e.description
        and x.amount = e.amount
        and x.id < e.id
   );

-- -------------------------------------------------------------
-- 3. As recorrências começam quando a empresa começou
--
-- Menos a Salte, que é nova: o contrato é de novembro.
-- -------------------------------------------------------------
update public.financial_recurrences r
   set start_month = s.opening_month, updated_at = now()
  from public.financial_settings s
 where s.id = true
   and r.start_month > s.opening_month
   and r.description <> 'Mensalidade Salte';

-- -------------------------------------------------------------
-- 4. Ligar cada lançamento à recorrência que o representa
--
-- Pelo nome e pelo tipo, e só onde aquele mês ainda não tem
-- nenhum lançamento ligado àquela recorrência — o par
-- (recorrência, mês) é único no banco.
-- -------------------------------------------------------------
with alvo as (
  select distinct on (r.id, e.reference_month)
         e.id as lancamento, r.id as recorrencia
    from public.financial_entries e
    join public.financial_recurrences r
      on r.description = e.description
     and r.kind = e.kind
   where e.recurrence_id is null
     and not exists (
       select 1
         from public.financial_entries x
        where x.recurrence_id = r.id
          and x.reference_month = e.reference_month
     )
   order by r.id, e.reference_month, e.id
)
update public.financial_entries e
   set recurrence_id = a.recorrencia, updated_at = now()
  from alvo a
 where e.id = a.lancamento;
