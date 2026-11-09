-- =============================================================
-- DETALHAR O HISTÓRICO: uma linha por item, como na planilha
--
-- GERADO por scripts/detalhar-historico.py a partir de
-- Fluxo_Caixa_Imagine_Labs_2026. Não editar à mão.
--
-- O sistema guardava os meses passados agrupados: uma linha
-- "Pró-labore (sócias) R$ 13.000,00", uma linha "Assinaturas e
-- ferramentas digitais R$ 1.026,37" e uma linha "A CLASSIFICAR"
-- só para o total fechar. A Fran, olhando outubro: "aqui precisa
-- sim estar detalhado, porque não tá em nenhum outro lugar".
--
-- Aqui vem cada item. O que ela já marcou como pago continua pago.
--
--   Supabase > SQL Editor > New query > colar tudo > Run.
--
-- Pode rodar quantas vezes quiser.
-- =============================================================

-- 1. Fora as linhas-bloco (descrição igual ao nome da categoria).
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
        and e.amount = 5500.00
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
        and e.amount = 5500.00
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
        and e.amount = 95.00
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
        and e.amount = 124.43
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
        and e.amount = 32.90
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
        and e.amount = 51.90
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
        and e.amount = 110.00
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
        and e.amount = 66.90
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
        and e.amount = 66.90
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
        and e.amount = 6500.00
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
        and e.amount = 6500.00
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
        and e.amount = 304.76
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
        and e.amount = 200.00
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
        and e.amount = 200.00
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
        and e.amount = 159.90
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
        and e.amount = 86.05
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
        and e.amount = 387.33
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
        and e.amount = 99.00
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
        and e.amount = 89.97
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
        and e.amount = 89.97
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
        and e.amount = 342.00
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
        and e.amount = 151.57
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
        and e.amount = 35.00
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
        and e.amount = 99.00
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
        and e.amount = 32.90
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
        and e.amount = 35.00
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
        and e.amount = 51.90
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
        and e.amount = 119.90
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
        and e.amount = 118.50
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
        and e.amount = 487.56
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
        and e.amount = 66.90
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
        and e.amount = 66.90
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
        and e.amount = 6500.00
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
        and e.amount = 6500.00
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
        and e.amount = 159.90
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
        and e.amount = 86.05
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
        and e.amount = 387.33
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
        and e.amount = 160.00
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
        and e.amount = 32.90
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
        and e.amount = 35.00
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
        and e.amount = 51.90
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
        and e.amount = 107.51
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
        and e.amount = 612.77
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
        and e.amount = 66.90
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
        and e.amount = 66.90
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
        and e.amount = 6500.00
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
        and e.amount = 6500.00
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
        and e.amount = 159.90
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
        and e.amount = 86.05
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
        and e.amount = 200.00
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
        and e.amount = 671.04
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
        and e.amount = 368.76
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
        and e.amount = 95.00
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
        and e.amount = 32.90
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
        and e.amount = 35.00
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
        and e.amount = 51.90
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
        and e.amount = 119.90
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
        and e.amount = 612.77
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
        and e.amount = 66.90
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
        and e.amount = 66.90
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
        and e.amount = 6500.00
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
        and e.amount = 6500.00
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
        and e.amount = 250.00
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
        and e.amount = 86.05
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
        and e.amount = 495.00
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
        and e.amount = 671.04
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
        and e.amount = 368.76
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
        and e.amount = 95.00
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
        and e.amount = 32.90
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
        and e.amount = 35.00
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
        and e.amount = 119.90
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
        and e.amount = 612.77
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
        and e.amount = 66.90
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
        and e.amount = 66.90
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
        and e.amount = 6500.00
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
        and e.amount = 6500.00
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
        and e.amount = 495.00
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
        and e.amount = 86.05
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
        and e.amount = 671.04
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
        and e.amount = 368.76
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
        and e.amount = 2166.70
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
        and e.amount = 95.00
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
        and e.amount = 32.90
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
        and e.amount = 32.00
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
        and e.amount = 119.90
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
        and e.amount = 612.77
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
        and e.amount = 66.90
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
        and e.amount = 66.90
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
        and e.amount = 6500.00
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
        and e.amount = 6500.00
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
        and e.amount = 86.05
   );
insert into public.financial_entries
  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Despesa', c.id, 'Softbox Octabox e Aputure Amaran (Parcela 3/4)', 671.04, 'Pendente', '2026-11-10', null
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos'
   and not exists (
     select 1 from public.financial_entries e
      where e.reference_month = '2026-10'
        and e.description = 'Softbox Octabox e Aputure Amaran (Parcela 3/4)'
        and e.amount = 671.04
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
        and e.amount = 2166.70
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
        and e.amount = 95.00
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
        and e.amount = 32.90
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
        and e.amount = 32.00
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
        and e.amount = 119.90
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
        and e.amount = 612.77
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
        and e.amount = 66.90
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
        and e.amount = 66.90
   );
