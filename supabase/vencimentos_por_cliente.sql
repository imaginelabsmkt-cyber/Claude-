-- =============================================================
-- O DIA DE VENCIMENTO DE CADA CLIENTE
--
-- Cada cliente paga num dia diferente, e a Fran disse quais:
--
--     Kiku Sushi ................ dia 10
--     Malukies Cookies & Co ..... dia 10
--     Laura Chioquetta .......... dia 25
--     Natural Concept ........... dia 25
--     Pró-labore (as duas) ...... dia 10
--     Ferramentas (o cartão) .... até o dia 20
--
-- Sempre no mês SEGUINTE ao da competência: "eu pago as coisas de
-- outubro em novembro".
--
-- NÃO estão aqui, porque ela ainda não disse ou vai conferir:
--   · Studio Bambu — vai ver no contrato
--   · Salte — não falamos
--   · Izabela Schipitoski — paga em DUAS parcelas, dia 10 e dia 25,
--     e eu não sei quanto é cada uma. Enquanto isso continua como
--     uma linha só de R$ 1.800,00.
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
        ('Mensalidade Natural Concept',       25)
      ) as t(descricao, dia)
  loop
    update public.financial_recurrences
       set due_day = item.dia, updated_at = now()
     where description = item.descricao
       and due_day is distinct from item.dia;
  end loop;
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
