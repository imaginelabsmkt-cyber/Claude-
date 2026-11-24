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
--   7. vencimento_das_receitas — receita vence no próprio mês, menos
--      a Malukies, que vence no seguinte.
--   8. funil_da_reuniao — o funil ganha "Reunião marcada", a proposta
--      passa a ser APRESENTADA (não enviada) e entra o canal
--      "Tráfego pago".
--   9. comercial_historico_e_atividades — o comercial passa a guardar
--      cada mudança de etapa (com data) e ganha as atividades:
--      tarefa, reunião, ligação e WhatsApp presas ao cliente.
--  10. salte_e_clientes_repetidos — apaga a cópia órfã de cliente
--      repetido por nome e registra a Salte no funil como ganha.
-- 11. comercial_do_prototipo — temperatura do lead e as origens que
--      faltavam, vindas do protótipo que a Vitória montou.
--  12. juntar_salte — a "Salte" e o "Studio Salte" são o mesmo
--      estúdio. Passa tudo para um e apaga a duplicata.
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
  --
  -- Procura pelos DOIS nomes. A Fran: "o cliente Salte está
  -- duplicado com o Studio Salte (é o mesmo estúdio)". Este bloco
  -- procurava só por "Salte" e, depois que a duplicata foi apagada,
  -- criava ela de novo na rodada seguinte — a duplicata voltava
  -- sozinha, toda vez que o arquivo rodasse.
  --
  -- Se não existir nenhum dos dois, nasce com o nome certo.
  select id into cliente_salte
    from public.clients
   where lower(btrim(name)) in ('salte', 'studio salte')
   order by (lower(btrim(name)) = 'studio salte') desc, created_at
   limit 1;

  if cliente_salte is null then
    insert into public.clients (name, active)
         values ('Studio Salte', true)
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

-- =============================================================
-- vencimento_das_receitas
-- =============================================================
update public.financial_recurrences r
   set vencimento_meses = 0, updated_at = now()
  from public.financial_categories c
 where c.id = r.category_id
   and c.kind = 'Receita'
   and r.vencimento_meses is distinct from 0
   and r.description <> 'Mensalidade Malukies Cookies & Co';

-- ...menos a Malukies, que paga no mês seguinte...
update public.financial_recurrences
   set vencimento_meses = 1, updated_at = now()
 where description = 'Mensalidade Malukies Cookies & Co'
   and vencimento_meses is distinct from 1;

-- Reescreve o vencimento do que ainda está EM ABERTO, pela regra de
-- cada recorrência. O que já foi recebido não é tocado.
update public.financial_entries e
   set due_date = (
         (date_trunc('month', (e.reference_month || '-01')::date)
            + (coalesce(r.vencimento_meses, 1) || ' month')::interval)::date
         + (least(
              r.due_day,
              extract(day from (
                date_trunc('month', (e.reference_month || '-01')::date)
                  + ((coalesce(r.vencimento_meses, 1) + 1) || ' month')::interval
                  - interval '1 day'))::int
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
                  + ((coalesce(r.vencimento_meses, 1) + 1) || ' month')::interval
                  - interval '1 day'))::int
            ) - 1)
       );

-- =============================================================
-- funil_da_reuniao
-- =============================================================
alter type lead_stage add value if not exists 'Reunião marcada'
  before 'Proposta enviada';

-- 2. "Proposta enviada" vira "Proposta apresentada".
--    `rename value` não é idempotente, então pergunta antes.
do $$
begin
  if exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
     where t.typname = 'lead_stage' and e.enumlabel = 'Proposta enviada'
  ) then
    alter type lead_stage rename value 'Proposta enviada' to 'Proposta apresentada';
  end if;
end
$$;

-- 3. A proposta também não é mais "Enviada": é "Apresentada".
do $$
begin
  if exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
     where t.typname = 'proposal_status' and e.enumlabel = 'Enviada'
  ) then
    alter type proposal_status rename value 'Enviada' to 'Apresentada';
  end if;
end
$$;

-- 4. O canal que faltava.
alter type lead_channel add value if not exists 'Tráfego pago' after 'Social selling';

-- 5. A posição de cada etapa, com o degrau novo.
--
--    Compara `e::text`, e não o literal do enum, de propósito: um
--    valor recém-criado por `add value` não pode ser resolvido como
--    literal na mesma transação, e o SQL Editor do Supabase roda
--    tudo numa transação só. Em texto, funciona na primeira passada.
create or replace function public.posicao_da_etapa(e lead_stage)
returns int
language sql
immutable
as $$
  select case e::text
    when 'Contato feito'        then 1
    when 'Diagnóstico'          then 2
    when 'Reunião marcada'      then 3
    when 'Proposta apresentada' then 4
    when 'Negociação'           then 5
    when 'Fechado'              then 6
    else 0                                  -- Perdido: não é degrau
  end;
$$;

-- 6. A data da reunião.
--
--    "Reunião marcada" sem data é só uma palavra: não dá para saber
--    quem tem reunião esta semana nem quem tem reunião que já passou
--    e ninguém mexeu.
alter table public.commercial_leads
  add column if not exists meeting_at timestamptz;

comment on column public.commercial_leads.meeting_at is
  'Quando é a reunião de apresentação. Usado na etapa "Reunião marcada".';

-- =============================================================
-- comercial_historico_e_atividades
-- =============================================================
create table if not exists public.commercial_stage_history (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.commercial_leads(id) on delete cascade,
  -- Nula na primeira linha: a oportunidade nasceu nesta etapa.
  de          lead_stage,
  para        lead_stage not null,
  em          timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

comment on table public.commercial_stage_history is
  'Cada mudança de etapa de uma oportunidade, com data. É o que permite medir tempo de ciclo.';

create index if not exists idx_stage_history_lead
  on public.commercial_stage_history (lead_id, em);

-- O gatilho que já marcava `stage_changed_at` passa a gravar a linha.
create or replace function public.marcar_mudanca_etapa()
returns trigger
language plpgsql
as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_changed_at = now();
    insert into public.commercial_stage_history (lead_id, de, para, em)
    values (new.id, old.stage, new.stage, now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_leads_stage_changed on public.commercial_leads;
create trigger trg_leads_stage_changed
  before update on public.commercial_leads
  for each row execute function public.marcar_mudanca_etapa();

-- E a primeira linha, de quando a oportunidade nasce.
create or replace function public.nascer_na_etapa()
returns trigger
language plpgsql
as $$
begin
  insert into public.commercial_stage_history (lead_id, de, para, em)
  values (new.id, null, new.stage, coalesce(new.created_at, now()));
  return new;
end;
$$;

drop trigger if exists trg_leads_nasceu on public.commercial_leads;
create trigger trg_leads_nasceu
  after insert on public.commercial_leads
  for each row execute function public.nascer_na_etapa();

-- As oportunidades que já existiam ganham a linha de nascimento, para
-- a linha do tempo não começar no vazio. Só quem ainda não tem.
insert into public.commercial_stage_history (lead_id, de, para, em)
select l.id, null, l.stage, coalesce(l.created_at, now())
  from public.commercial_leads l
 where not exists (
   select 1 from public.commercial_stage_history h where h.lead_id = l.id
 );

-- 2. ATIVIDADES ----------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'activity_kind') then
    create type activity_kind as enum (
      'Tarefa',
      'Reunião',
      'Ligação',
      'WhatsApp'
    );
  end if;
end
$$;

create table if not exists public.commercial_activities (
  id           uuid primary key default gen_random_uuid(),
  kind         activity_kind not null default 'Tarefa',
  subject      text not null,
  -- A atividade se prende a uma oportunidade OU a um cliente. Uma das
  -- duas, nunca nenhuma: atividade solta não aparece em ficha nenhuma
  -- e vira lista de recado sem dono.
  lead_id      uuid references public.commercial_leads(id) on delete cascade,
  client_id    uuid references public.clients(id) on delete cascade,
  due_at       timestamptz,
  done_at      timestamptz,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint commercial_activities_tem_dono
    check (lead_id is not null or client_id is not null)
);

comment on table public.commercial_activities is
  'Tarefas, reuniões, ligações e WhatsApp presos a uma oportunidade ou a um cliente.';

create index if not exists idx_atividades_abertas
  on public.commercial_activities (due_at)
  where done_at is null;

create index if not exists idx_atividades_lead
  on public.commercial_activities (lead_id);

create index if not exists idx_atividades_cliente
  on public.commercial_activities (client_id);

drop trigger if exists trg_atividades_updated on public.commercial_activities;
create trigger trg_atividades_updated
  before update on public.commercial_activities
  for each row execute function public.set_updated_at();

-- 3. RLS, igual ao resto ------------------------------------------
alter table public.commercial_stage_history enable row level security;
alter table public.commercial_activities    enable row level security;

drop policy if exists "stage_history_all_authenticated" on public.commercial_stage_history;
create policy "stage_history_all_authenticated"
  on public.commercial_stage_history for all
  to authenticated using (true) with check (true);

drop policy if exists "atividades_all_authenticated" on public.commercial_activities;
create policy "atividades_all_authenticated"
  on public.commercial_activities for all
  to authenticated using (true) with check (true);

-- =============================================================
-- salte_e_clientes_repetidos
-- =============================================================
delete from public.clients c
 where exists (
   select 1 from public.clients outro
    where outro.name = c.name
      and outro.created_at < c.created_at
 )
   and not exists (select 1 from public.financial_entries      x where x.client_id = c.id)
   and not exists (select 1 from public.financial_recurrences  x where x.client_id = c.id)
   and not exists (select 1 from public.client_contracts       x where x.client_id = c.id)
   and not exists (select 1 from public.client_files           x where x.client_id = c.id)
   and not exists (select 1 from public.client_reports         x where x.client_id = c.id)
   and not exists (select 1 from public.client_diagnostics     x where x.client_id = c.id)
   and not exists (select 1 from public.client_onboarding      x where x.client_id = c.id)
   and not exists (select 1 from public.contents               x where x.client_id = c.id)
   and not exists (select 1 from public.plannings              x where x.client_id = c.id)
   and not exists (select 1 from public.commercial_leads       x where x.client_id = c.id)
   and not exists (select 1 from public.commercial_activities  x where x.client_id = c.id);

-- 2. A oportunidade da Salte, já ganha, ligada ao cliente.
do $$
declare
  id_salte uuid;
begin
  -- Pelos dois nomes: "Salte" e "Studio Salte" são o mesmo estúdio.
  select id into id_salte
    from public.clients
   where lower(btrim(name)) in ('salte', 'studio salte')
   order by (lower(btrim(name)) = 'studio salte') desc, created_at
   limit 1;
  if id_salte is null then
    return;  -- sem cliente Salte, não há o que registrar
  end if;

  if exists (select 1 from public.commercial_leads where client_id = id_salte) then
    return;  -- já tem a oportunidade dela
  end if;

  insert into public.commercial_leads
    (name, channel, stage, max_stage, estimated_monthly, client_id, created_at)
  values
    ('Salte', 'Indicação', 'Fechado', 'Fechado', 1300.00, id_salte, '2026-11-01');
end
$$;

-- =============================================================
-- comercial_do_prototipo
-- =============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_temperature') then
    create type lead_temperature as enum ('Quente', 'Morno', 'Frio');
  end if;
end
$$;

alter table public.commercial_leads
  add column if not exists temperature lead_temperature;

comment on column public.commercial_leads.temperature is
  'Quente: veio pedindo ajuda. Morno: interesse sem urgência. Frio: a agência foi atrás.';

-- 2. AS ORIGENS QUE FALTAVAM ---------------------------------------
--
--    O protótipo tem nove; o nosso tinha seis. Instagram orgânico,
--    grupos de WhatsApp e visita presencial são três jeitos de
--    chegar cliente que ficavam todos em "Outro" — e "Outro" não
--    responde em que canal vale gastar a próxima hora.
alter type lead_channel add value if not exists 'Instagram orgânico' after 'Tráfego pago';
alter type lead_channel add value if not exists 'Grupos e WhatsApp'  after 'Evento';
alter type lead_channel add value if not exists 'Visita presencial'  after 'Parceria';

-- 3. AS ETAPAS DO PROTÓTIPO ----------------------------------------
--
--    O protótipo da Vitória tem sete etapas abertas; o nosso tinha
--    cinco. A diferença que importa é o começo: "Novo lead" (chegou e
--    ninguém falou com ele), "Primeiro contato" (mensagem enviada,
--    esperando resposta) e "Em conversa" (respondeu, mas ainda não
--    marcou reunião) eram tudo uma coisa só aqui — e são três
--    situações com ações completamente diferentes.
--
--    MAS NÃO É CÓPIA. Copiar ao pé da letra desfaria duas correções
--    que a Fran deu em voz alta:
--
--      "A gente não envia a proposta, a gente já apresenta na
--       primeira reunião."     -> continua "Proposta apresentada",
--                                 e não "Proposta enviada" como no
--                                 protótipo.
--
--      "O diagnóstico a gente faz justamente antes de encontrar o
--       cliente."              -> "Diagnóstico" fica, embora o
--                                 protótipo não tenha a etapa.
--
--    E "Reunião feita" do protótipo não entra: na reunião a proposta
--    é apresentada, então as duas são o mesmo momento. Ficam sete
--    etapas abertas, o mesmo número do protótipo.
--
--        Novo lead -> Primeiro contato -> Em conversa -> Diagnóstico
--        -> Reunião marcada -> Proposta apresentada -> Negociação
--        -> Fechado / Perdido

-- "Contato feito" vira "Primeiro contato": é a mesma coisa, com o
-- nome que diz o que está acontecendo (esperando resposta).
do $$
begin
  if exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
     where t.typname = 'lead_stage' and e.enumlabel = 'Contato feito'
  ) then
    alter type lead_stage rename value 'Contato feito' to 'Primeiro contato';
  end if;
end
$$;

alter type lead_stage add value if not exists 'Novo lead'   before 'Primeiro contato';
alter type lead_stage add value if not exists 'Em conversa' after  'Primeiro contato';

-- A posição de cada etapa, de novo. Compara `e::text` pelo mesmo
-- motivo de sempre: valor recém-criado não pode ser resolvido como
-- literal na mesma transação, e o SQL Editor roda tudo numa só.
create or replace function public.posicao_da_etapa(e lead_stage)
returns int
language sql
immutable
as $$
  select case e::text
    when 'Novo lead'            then 1
    when 'Primeiro contato'     then 2
    when 'Em conversa'          then 3
    when 'Diagnóstico'          then 4
    when 'Reunião marcada'      then 5
    when 'Proposta apresentada' then 6
    when 'Negociação'           then 7
    when 'Fechado'              then 8
    else 0                                  -- Perdido: não é degrau
  end;
$$;

-- 4. PRÓXIMO CONTATO -----------------------------------------------
--
--    É o motor da tela "Hoje" do protótipo: toda etapa aberta tem uma
--    data de próximo contato, e quem passou da data aparece em
--    vermelho. O nosso tinha só o "parado há N dias", que é alarme
--    DEPOIS do fato — não existia o compromisso marcado.
alter table public.commercial_leads
  add column if not exists next_contact_on date;

comment on column public.commercial_leads.next_contact_on is
  'Quando falar com este lead de novo. Sugerido pela etapa ao mover.';

create index if not exists idx_leads_proximo_contato
  on public.commercial_leads (next_contact_on)
  where stage not in ('Fechado', 'Perdido');

-- Quem já está no funil e nunca teve data ganha uma, pela etapa:
-- sem isso a fila nasce vazia e a tela não prova que funciona.
update public.commercial_leads
   set next_contact_on = (current_date + case stage::text
         when 'Novo lead'            then 0
         when 'Primeiro contato'     then 1
         when 'Em conversa'          then 2
         when 'Diagnóstico'          then 3
         when 'Reunião marcada'      then 0
         when 'Proposta apresentada' then 2
         when 'Negociação'           then 3
         else 0 end)
 where next_contact_on is null
   and stage not in ('Fechado', 'Perdido');

-- O PADRÃO DA COLUNA NÃO MUDA AQUI, de propósito.
--
-- `alter column stage set default 'Novo lead'` usa o valor recém
-- criado como literal, e o Postgres recusa isso na mesma transação:
--
--     ERROR: unsafe use of new value "Novo lead" of enum type
--
-- O SQL Editor do Supabase roda o arquivo inteiro numa transação só,
-- então o arquivo quebraria na cara dela — foi o que aconteceu no meu
-- teste, e é o mesmo erro que já quebrou uma vez. O padrão só vale
-- para quem insere direto no banco; o sistema sempre manda a etapa, e
-- a instalação do zero já nasce com o padrão certo.

-- 5. MOTIVO DA PERDA EM LISTA --------------------------------------
--
--    Era texto livre, e eu normalizava na hora de somar — tirando
--    acento, ponto final e maiúscula — para "Achou caro", "achou
--    caro" e "achou caro." virarem o mesmo motivo. Funciona até
--    alguém escrever "preço alto", e aí a conta mente.
--
--    A lista é a do protótipo. Continua existindo o texto livre, na
--    observação, para o caso que não cabe em nenhuma delas.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lost_reason_kind') then
    create type lost_reason_kind as enum (
      'Sem resposta',
      'Achou caro',
      'Fechou com outra agência',
      'Não é o momento',
      'Fora do perfil',
      'Outro'
    );
  end if;
end
$$;

alter table public.commercial_leads
  add column if not exists lost_reason_kind lost_reason_kind;

comment on column public.commercial_leads.lost_reason_kind is
  'O motivo da perda, da lista. O texto livre fica em lost_reason.';

-- O que já estava escrito à mão entra na lista onde dá para ter
-- certeza. O que não casar fica sem categoria e com o texto
-- preservado — chutar a categoria de uma perda é pior do que não ter.
update public.commercial_leads
   set lost_reason_kind = case
         when lost_reason ilike '%sem resposta%'  then 'Sem resposta'
         when lost_reason ilike '%sumiu%'         then 'Sem resposta'
         when lost_reason ilike '%caro%'          then 'Achou caro'
         when lost_reason ilike '%preç%'          then 'Achou caro'
         when lost_reason ilike '%concorren%'     then 'Fechou com outra agência'
         when lost_reason ilike '%outra agência%' then 'Fechou com outra agência'
         when lost_reason ilike '%momento%'       then 'Não é o momento'
         when lost_reason ilike '%perfil%'        then 'Fora do perfil'
       end::lost_reason_kind
 where stage = 'Perdido'
   and lost_reason_kind is null
   and lost_reason is not null;

-- 6. INVESTIMENTO POR CANAL ----------------------------------------
--
--    A maior falta do nosso Painel de canais: ele dizia quantos
--    fecharam por canal, e NÃO quanto cada canal custou. Sem o custo,
--    "indicação converte 50%" e "tráfego converte 8%" parecem a
--    mesma informação — quando um é de graça e o outro consome
--    R$ 500 por mês.
--
--    O protótipo da Vitória lança o gasto por mês e por origem, e
--    calcula custo por cliente (investido ÷ fechados) e retorno em
--    12 meses (receita mensal × 12 ÷ investido).
create table if not exists public.commercial_investments (
  id          uuid primary key default gen_random_uuid(),
  -- Competência, "YYYY-MM", como no resto do sistema.
  mes         text not null check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  channel     lead_channel not null,
  amount      numeric(12, 2) not null check (amount >= 0),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.commercial_investments is
  'Quanto foi investido em cada canal, por mês: tráfego, ingresso de evento, comissão de parceiro, bônus de indicação.';

create index if not exists idx_investimentos_mes
  on public.commercial_investments (mes, channel);

drop trigger if exists trg_investimentos_updated on public.commercial_investments;
create trigger trg_investimentos_updated
  before update on public.commercial_investments
  for each row execute function public.set_updated_at();

alter table public.commercial_investments enable row level security;

drop policy if exists "investimentos_all_authenticated" on public.commercial_investments;
create policy "investimentos_all_authenticated"
  on public.commercial_investments for all
  to authenticated using (true) with check (true);

-- =============================================================
-- juntar_salte
-- =============================================================
do $$
declare
  v_origem  uuid;
  v_lead    uuid := 'b84764bb-66f2-479a-a6ee-f5526862a381';  -- oportunidade "Salte"
  v_destino uuid;
begin
  -- A duplicata é o cliente chamado "Salte", qualquer que seja o id.
  --
  -- Procurar pelo NOME, e não pelo id que a Fran mandou
  -- (54c73443-...), é o que faz este arquivo se curar sozinho: outro
  -- trecho do ATUALIZAR cria a Salte a partir da planilha de
  -- novembro, e se ele criar de novo, com id novo, este aqui junta
  -- de novo. Com o id fixo, a duplicata voltaria e ficaria.
  select id into v_origem
    from public.clients
   where lower(btrim(name)) = 'salte'
   order by created_at
   limit 1;

  if v_origem is null then
    raise notice 'Não há cliente "Salte" separado. Nada a fazer.';
    return;
  end if;

  select id into v_destino
    from public.clients
   where lower(btrim(name)) = 'studio salte'
     and id <> v_origem
   order by created_at
   limit 1;

  -- Se o "Studio Salte" não existir, não dá para transferir para
  -- lugar nenhum — e apagar perderia o histórico. Então a duplicata
  -- só muda de nome, e o resultado é o mesmo: um cliente só, com o
  -- nome certo.
  if v_destino is null then
    update public.clients set name = 'Studio Salte' where id = v_origem;
    raise notice 'Não havia "Studio Salte". A "Salte" foi renomeada.';
    return;
  end if;

  -- ---------------------------------------------------------
  -- 1. O dinheiro. É o que não pode se perder.
  -- ---------------------------------------------------------
  update public.financial_entries      set client_id = v_destino where client_id = v_origem;
  update public.financial_recurrences  set client_id = v_destino where client_id = v_origem;

  -- ---------------------------------------------------------
  -- 2. O trabalho.
  -- ---------------------------------------------------------
  update public.contents               set client_id = v_destino where client_id = v_origem;
  update public.client_files           set client_id = v_destino where client_id = v_origem;
  update public.client_reports         set client_id = v_destino where client_id = v_origem;
  update public.client_diagnostics     set client_id = v_destino where client_id = v_origem;
  update public.commercial_activities  set client_id = v_destino where client_id = v_origem;
  update public.commercial_leads       set client_id = v_destino where client_id = v_origem;

  -- ---------------------------------------------------------
  -- 3. As três que colidem. Transfere só o que falta no destino.
  -- ---------------------------------------------------------
  update public.plannings p
     set client_id = v_destino
   where p.client_id = v_origem
     and not exists (
       select 1 from public.plannings d
        where d.client_id = v_destino
          and d.reference_month = p.reference_month
     );

  update public.client_onboarding
     set client_id = v_destino
   where client_id = v_origem
     and not exists (
       select 1 from public.client_onboarding
        where client_id = v_destino
     );

  update public.client_contracts c
     set client_id = v_destino
   where c.client_id = v_origem
     and not exists (
       select 1 from public.client_contracts d where d.client_id = v_destino
     );

  -- ---------------------------------------------------------
  -- 4. A oportunidade duplicada do comercial.
  --
  -- O histórico de etapas e as atividades dela vão junto (o banco
  -- apaga em cascata). É o que foi pedido: "manter só o Studio
  -- Salte".
  -- ---------------------------------------------------------
  delete from public.commercial_leads where id = v_lead;

  -- ---------------------------------------------------------
  -- 5. A duplicata.
  --
  -- A esta altura não sobrou nada pendurado nela, menos as linhas
  -- que colidiam — e essas o destino já tinha.
  -- ---------------------------------------------------------
  delete from public.clients where id = v_origem;

  raise notice 'A "Salte" foi juntada ao "Studio Salte".';
end $$;
