-- =============================================================
-- CORRIGIR OS VENCIMENTOS: a conta do mês vence no mês seguinte
--
-- O QUE ESTE ARQUIVO FAZ
--
-- O sistema vinha colocando o vencimento DENTRO do próprio mês de
-- competência: a mensalidade de outubro vencia em 10/10. Na Favie é
-- outra coisa, nas palavras da Fran:
--
--     "as contas de outubro eu fecho em novembro, e assim
--      sucessivamente"
--
-- Então a conta de outubro vence em NOVEMBRO. Com a regra errada, tudo
-- aparecia vencido um mês antes da hora.
--
-- Competência e vencimento são coisas diferentes: a competência diz a
-- que mês o dinheiro PERTENCE (e é ela que monta o fluxo de caixa); o
-- vencimento diz QUANDO ele é pago. Só o vencimento muda aqui, então
-- nenhum saldo, total ou gráfico se mexe.
--
-- COMO RODAR
--
--   Supabase > SQL Editor > New query > colar tudo > Run.
--
-- Pode rodar quantas vezes quiser: ele só mexe nas linhas que ainda
-- estão com o vencimento dentro do mês da competência, que são
-- exatamente as erradas. Rodar de novo não faz nada.
--
-- Se você já tiver corrigido alguma data na mão, ela NÃO é tocada.
-- =============================================================

update public.financial_entries e
   set due_date = (
         (date_trunc('month', (e.reference_month || '-01')::date)
            + interval '1 month')::date
         + (least(
              extract(day from e.due_date)::int,
              extract(day from (
                date_trunc('month', (e.reference_month || '-01')::date)
                  + interval '2 month' - interval '1 day'
              ))::int
            ) - 1)
       ),
       updated_at = now()
 where e.due_date is not null
   and to_char(e.due_date, 'YYYY-MM') = e.reference_month;

-- Conferência: deve devolver zero linhas com vencimento no próprio mês.
select count(*) as ainda_erradas
  from public.financial_entries
 where due_date is not null
   and to_char(due_date, 'YYYY-MM') = reference_month;
