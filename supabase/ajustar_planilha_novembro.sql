-- =============================================================
-- A PLANILHA MANDA: acertar os fixos pelo que a Fran falou
--
-- O QUE ESTE ARQUIVO FAZ
--
-- Quatro coisas, todas vindas da planilha do Drive
-- (Fluxo_Caixa_Imagine_Labs_2026) e do que a Fran corrigiu:
--
--   1. O DIA DE VENCIMENTO, que estava inventado:
--        pró-labore ............... dia 5  ->  dia 10
--        assinaturas (o cartão) ... dia 10 ->  dia 20
--        DAS do Simples ........... dia 20     (já estava certo)
--
--      "a gente se paga dia 10" e "o cartão, que tem as
--      assinaturas, vence dia 20".
--
--   2. TIRA o que ela já tirou da planilha: Captions (R$ 51,90) e
--      Contabilidade / MEI (R$ 159,90). A aba Outubro já não tem
--      nenhum dos dois; a aba Novembro ficou com os dois para trás.
--
--   3. O item de R$ 53,00 passa a R$ 35,00. Atenção: na planilha
--      quem está em R$ 53,00 é o CANVA (o CapCut está em R$ 32,90
--      nas duas abas). Mudando o Canva.
--
--   4. ENTRA a Salte, R$ 1.300,00 por mês, que está na aba
--      Novembro e nunca tinha vindo para o sistema.
--
-- O que já foi PAGO não é tocado em nenhum dos quatro passos: só
-- recorrência e lançamento em aberto.
--
-- COMO RODAR
--
--   Supabase > SQL Editor > New query > colar tudo > Run.
--
-- Pode rodar quantas vezes quiser: tudo aqui só mexe no que ainda
-- está diferente do esperado.
-- =============================================================

-- -------------------------------------------------------------
-- 1. O dia de vencimento de cada fixo
-- -------------------------------------------------------------
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
