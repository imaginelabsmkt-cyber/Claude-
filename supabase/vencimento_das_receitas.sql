-- =============================================================
-- RECEITA VENCE NO PRÓPRIO MÊS
--
-- "As entradas dos clientes, das receitas de novembro, vencem em
-- novembro. Menos a da Malux, que vence o mês posterior."
--
-- Eu tinha posto TUDO para vencer no mês seguinte, porque é assim
-- que as DESPESAS funcionam aqui ("as contas de outubro eu fecho em
-- novembro"). Com as receitas é diferente: a mensalidade de novembro
-- é cobrada em novembro mesmo.
--
-- Fica assim, pelo campo `vencimento_meses` de cada recorrência:
--
--     Mensalidades ............... 0   (mesmo mês)
--     Malukies Cookies & Co ...... +1  (mês seguinte)
--     Pró-labore, cartão, DAS .... +1  (como já estava)
--
-- O STUDIO BAMBU TAMBÉM É 0. Esteve como -1 (dia 25 do mês ANTERIOR)
-- por causa da cláusula 5 do contrato, que diz "de forma antecipada".
-- Lido assim, a mensalidade de novembro vencia em 25/10 e aparecia
-- como vencida há quase um mês, na folha e na fila — alarme falso
-- todo mês. A Fran: "o Estúdio Bambu só vence no final do mês, você
-- tá bem errado". "Antecipado" ali quer dizer que ele paga antes de o
-- serviço do mês acabar, não que paga no mês anterior.
--
--   Supabase > SQL Editor > New query > colar > Run.
--
-- Pode rodar quantas vezes quiser. Só mexe no que ainda não foi pago.
-- =============================================================

-- Toda mensalidade passa a vencer dentro do próprio mês...
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
