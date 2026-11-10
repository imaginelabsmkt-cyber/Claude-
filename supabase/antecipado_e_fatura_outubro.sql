-- =============================================================
-- QUEM PAGA ANTECIPADO, E A FATURA DO CARTÃO DE OUTUBRO
--
-- DUAS COISAS
--
-- 1. O Studio Bambu paga ADIANTADO.
--
--    "O Bambu pagou setembro e outubro todo dia 25. Eles pagam
--    antecipado: eles pagam o próximo mês."
--
--    Então a mensalidade de novembro vence em 25/OUTUBRO, e não em
--    25/novembro. Para isso a recorrência ganhou um campo novo,
--    `vencimento_meses`: quantos meses depois da competência a conta
--    vence. +1 é o normal aqui, -1 é quem paga adiantado.
--
--    A Salte fica SEM dia: o contrato ainda não foi fechado.
--
-- 2. A fatura do cartão que vence em novembro (as compras de
--    outubro), lida do print que a Fran mandou.
--
--    O que ENTRA, porque não existia no sistema:
--      · ElevenLabs .......................... R$  33,57
--      · Jim.Com (o Pilates), parcela 1/3 .... R$ 493,00
--      · Adobe, a segunda cobrança ........... R$  65,00
--      · IOF das compras internacionais ...... R$  24,83
--        (3,64 + 20,02 + 1,17)
--
--    O que MUDA de valor, porque o cartão manda:
--      · Claude ....... R$ 612,77 -> R$ 572,00
--      · ChatGPT ...... R$ 119,90 -> R$ 103,90
--      · Canva ........ R$  32,00 -> R$  35,00
--
--    O que a Fran confirmou depois:
--      · O Mercado Livre é a parcela 4/4 mesmo, R$ 671,03 (a
--        planilha ainda diz 3/4, R$ 671,04). Corrigido na origem,
--        em scripts/detalhar-historico.py.
--      · A Mentoria Ultralize foi paga no CARTÃO DA VITÓRIA, por
--        isso não aparece nesta fatura. Continua como despesa de
--        outubro, agora com a forma de pagamento anotada.
--
--    O print está cortado em cima e embaixo: se houver compra antes
--    de 09/11 ou depois de 14/10, ela não está aqui.
--
--   Supabase > SQL Editor > New query > colar > Run.
--
-- Pode rodar quantas vezes quiser.
-- =============================================================

-- -------------------------------------------------------------
-- 1. O campo do pagamento antecipado
-- -------------------------------------------------------------
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
          ('Adobe (segunda cobrança)',        65.00),
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
