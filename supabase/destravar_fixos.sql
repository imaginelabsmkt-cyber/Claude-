-- =============================================================
-- DESTRAVAR OS FIXOS NOS MESES PASSADOS
--
-- A Fran, abrindo "Fixos e ferramentas" em outubro: "tá tudo
-- travado pra mim, não consigo ajustar nada". E estava mesmo, por
-- dois motivos que eu criei:
--
-- 1. TODA recorrência nasceu com start_month = 2026-11. Em outubro
--    o sistema dizia, em cinza claro, "começa em Nov/26" — e sem
--    caixinha de marcar. Mas o Claude, o Canva e o pró-labore
--    existem desde abril. O começo certo é o começo da série.
--
-- 2. Os lançamentos dos meses passados não APONTAM para a
--    recorrência que os gerou (vieram do seed e do detalhamento da
--    planilha, com recurrence_id vazio). Sem esse vínculo a tela não
--    sabe qual linha do mês pertence a qual fixo, e por isso não
--    mostra a caixinha de pago.
--
-- Também arruma duas coisas que ela apontou:
--
-- 3. O Softbox apareceu DUAS vezes em outubro: a linha antiga
--    "(Parcela 3/4) R$ 671,04" e a corrigida "(Parcela 4/4)
--    R$ 671,03". A antiga sai.
--
-- 4. Linha repetida no mesmo mês (mesmo nome e mesmo valor) fica
--    uma só, apagando apenas o que está em aberto.
--
--   Supabase > SQL Editor > New query > colar > Run.
--
-- Pode rodar quantas vezes quiser.
-- =============================================================

-- -------------------------------------------------------------
-- 1. O Softbox duplicado
-- -------------------------------------------------------------
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
