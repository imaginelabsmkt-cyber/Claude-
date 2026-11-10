-- =============================================================
-- O DIA DE VENCIMENTO DE CADA CLIENTE
--
-- Cada cliente paga num dia diferente, e a Fran disse quais:
--
--     Kiku Sushi ................ dia 10
--     Malukies Cookies & Co ..... dia 10
--     Laura Chioquetta .......... dia 25
--     Natural Concept ........... dia 25
--     Studio Bambu .............. dia 25  (Cláusula 5 do contrato)
--     Izabela Schipitoski ....... DUAS parcelas de R$ 900,00,
--                                 dia 10 e dia 25
--     Pró-labore (as duas) ...... dia 10
--     Ferramentas (o cartão) .... até o dia 20
--
-- Sempre no mês SEGUINTE ao da competência: "eu pago as coisas de
-- outubro em novembro".
--
-- O dia do Studio Bambu veio do contrato que está no Drive
-- (Contrato_FAVIE_Studio_Bambu_2026, Cláusula 5): R$ 1.300,00 com
-- "vencimento todo dia 25 de cada mês". ATENÇÃO: a mesma cláusula
-- diz "mensalmente, de forma ANTECIPADA". Aqui ele entrou como os
-- outros — a mensalidade de um mês vence no dia 25 do mês seguinte.
-- Se na prática ele paga adiantado, me diz que eu inverto só esse.
--
-- NÃO estão aqui:
--   · Salte — não falamos o dia.
--   · Dra. Hemilayne — ela disse que já está paga (adiantou o
--     parcelamento). Isso se resolve marcando a caixinha na tela,
--     sem SQL.
--
--   Supabase > SQL Editor > New query > colar > Run.
--
-- Pode rodar quantas vezes quiser.
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
