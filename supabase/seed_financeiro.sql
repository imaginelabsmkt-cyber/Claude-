-- =============================================================
-- Carga inicial do financeiro — planilha "Fluxo de Caixa Imagine
-- Labs 2026", versão de 05/11/2026 lida direto do Google Drive.
--
-- RECORTE
--
--   * HISTÓRICO: abril a OUTUBRO/2026. Novembro e dezembro ficam de
--     fora: na planilha eles ainda são a cópia da carteira antiga,
--     com 14 clientes que em sua maioria não renovaram, tudo como
--     "Pendente". Esses meses se montam aqui pelo "Gerar do plano
--     fixo", com a carteira real.
--
--   * CARTEIRA ATIVA (7 clientes, R$ 13,150.00/mês), pelos valores
--     de outubro: Studio Bambu, Dra. Hemilayne, Izabela Schipitoski, Kiku Sushi, Laura Chioquetta, Malukies Cookies & Co, Natural Concept.
--     Os 9 que saíram entram como INATIVOS — o histórico fica,
--     mas não geram mensalidade.
--
--   * RECORRÊNCIAS a partir de 2026-11: as 7 mensalidades e
--     4 custos fixos (R$ 14,272.32/mês).
--
-- CONFERÊNCIA FEITA ANTES DE GERAR: a receita de cada mês bate com o
-- Resumo Anual da planilha, e o saldo encadeado de abril a outubro
-- reproduz exatamente os saldos iniciais de cada aba.
--
-- O QUE PRECISA DA SUA ATENÇÃO
--
--   Em 07/2026, 08/2026, 09/2026, 10/2026 a soma das CATEGORIAS de despesa do Resumo Anual
--   não fecha com o TOTAL do próprio Resumo. A diferença entrou
--   como um lançamento por mês, em 'Outros custos operacionais',
--   descrito como A CLASSIFICAR — para o total do mês e o saldo
--   continuarem batendo com a planilha:
--
--     2026-07  R$  1,239.80
--     2026-08  R$  1,534.80
--     2026-09  R$  1,166.04
--     2026-10  R$  2,837.74
--
--   Abra o Financeiro, edite esses lançamentos e escolha a
--   categoria certa. São 4 edições, uma vez só.
--
-- Execute DEPOIS do schema. É seguro: não faz nada se já houver
-- lançamentos cadastrados.
-- =============================================================

do $$
begin

if exists (select 1 from public.financial_entries) then
  raise notice 'Financeiro já possui lançamentos — carga inicial ignorada.';
  return;
end if;

-- -------------------------------------------------------------
-- 1. Saldo inicial e mês de partida
-- -------------------------------------------------------------
update public.financial_settings
   set opening_balance = 0,
       opening_month   = '2026-04'
 where id = true;

-- -------------------------------------------------------------
-- 2. Clientes
-- -------------------------------------------------------------
insert into public.clients (name, active)
select 'Studio Bambu', true
where not exists (select 1 from public.clients where name = 'Studio Bambu');
insert into public.clients (name, active)
select 'Dra. Hemilayne', true
where not exists (select 1 from public.clients where name = 'Dra. Hemilayne');
insert into public.clients (name, active)
select 'Izabela Schipitoski', true
where not exists (select 1 from public.clients where name = 'Izabela Schipitoski');
insert into public.clients (name, active)
select 'Kiku Sushi', true
where not exists (select 1 from public.clients where name = 'Kiku Sushi');
insert into public.clients (name, active)
select 'Laura Chioquetta', true
where not exists (select 1 from public.clients where name = 'Laura Chioquetta');
insert into public.clients (name, active)
select 'Malukies Cookies & Co', true
where not exists (select 1 from public.clients where name = 'Malukies Cookies & Co');
insert into public.clients (name, active)
select 'Natural Concept', true
where not exists (select 1 from public.clients where name = 'Natural Concept');
insert into public.clients (name, active)   -- não renovou
select 'Beatriz Cristina', false
where not exists (select 1 from public.clients where name = 'Beatriz Cristina');
insert into public.clients (name, active)   -- não renovou
select 'Briller', false
where not exists (select 1 from public.clients where name = 'Briller');
insert into public.clients (name, active)   -- não renovou
select 'Danielle Bergaman', false
where not exists (select 1 from public.clients where name = 'Danielle Bergaman');
insert into public.clients (name, active)   -- não renovou
select 'Julia Brito', false
where not exists (select 1 from public.clients where name = 'Julia Brito');
insert into public.clients (name, active)   -- não renovou
select 'Laysa Rocha', false
where not exists (select 1 from public.clients where name = 'Laysa Rocha');
insert into public.clients (name, active)   -- não renovou
select 'Osteo&Fit', false
where not exists (select 1 from public.clients where name = 'Osteo&Fit');
insert into public.clients (name, active)   -- não renovou
select 'Vieira Franco Advogados', false
where not exists (select 1 from public.clients where name = 'Vieira Franco Advogados');
insert into public.clients (name, active)   -- não renovou
select 'Wanessa', false
where not exists (select 1 from public.clients where name = 'Wanessa');
insert into public.clients (name, active)   -- não renovou
select 'Yasmin', false
where not exists (select 1 from public.clients where name = 'Yasmin');

-- -------------------------------------------------------------
-- 3. Lançamentos de abril a outubro/2026
-- -------------------------------------------------------------

-- 2026-04
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Receita', c.id, cl.id, 'Mensalidade Beatriz Cristina', 1800.00, 'Pago', '2026-04-10', '2026-04-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Beatriz Cristina';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Receita', c.id, cl.id, 'Mensalidade Julia Brito', 2250.00, 'Pago', '2026-04-10', '2026-04-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Julia Brito';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Receita', c.id, cl.id, 'Mensalidade Kiku Sushi', 2000.00, 'Pago', '2026-04-10', '2026-04-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Kiku Sushi';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Receita', c.id, cl.id, 'Mensalidade Laura Chioquetta', 1000.00, 'Pago', '2026-04-10', '2026-04-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Laura Chioquetta';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Receita', c.id, cl.id, 'Mensalidade Laysa Rocha', 1821.00, 'Pago', '2026-04-10', '2026-04-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Laysa Rocha';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Receita', c.id, cl.id, 'Mensalidade Malukies Cookies & Co', 1700.00, 'Pago', '2026-04-10', '2026-04-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Malukies Cookies & Co';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Receita', c.id, cl.id, 'Mensalidade Natural Concept', 1700.00, 'Pago', '2026-04-10', '2026-04-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Natural Concept';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Receita', c.id, cl.id, 'Mensalidade Osteo&Fit', 2000.00, 'Pago', '2026-04-10', '2026-04-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Osteo&Fit';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Receita', c.id, 'Projeto avulso', 1000.00, 'Pago', '2026-04-15', '2026-04-15'
  from public.financial_categories c
 where c.kind = 'Receita' and c.name = 'Projetos avulsos';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Despesa', c.id, 'Pró-labore (sócias)', 11000.00, 'Pago', '2026-04-05', '2026-04-05'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-04', 'Despesa', c.id, 'Assinaturas e ferramentas digitais', 548.03, 'Pago', '2026-04-10', '2026-04-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais';

-- 2026-05
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Receita', c.id, cl.id, 'Mensalidade Beatriz Cristina', 2000.00, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Beatriz Cristina';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Receita', c.id, cl.id, 'Mensalidade Briller', 1550.00, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Briller';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Receita', c.id, cl.id, 'Mensalidade Danielle Bergaman', 800.00, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Danielle Bergaman';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Receita', c.id, cl.id, 'Mensalidade Dra. Hemilayne', 1897.00, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Dra. Hemilayne';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Receita', c.id, cl.id, 'Mensalidade Julia Brito', 2000.00, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Julia Brito';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Receita', c.id, cl.id, 'Mensalidade Kiku Sushi', 2200.00, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Kiku Sushi';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Receita', c.id, cl.id, 'Mensalidade Laura Chioquetta', 1550.00, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Laura Chioquetta';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Receita', c.id, cl.id, 'Mensalidade Laysa Rocha', 1821.00, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Laysa Rocha';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Receita', c.id, cl.id, 'Mensalidade Natural Concept', 1700.00, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Natural Concept';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Receita', c.id, cl.id, 'Mensalidade Osteo&Fit', 2000.00, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Osteo&Fit';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Receita', c.id, cl.id, 'Mensalidade Vieira Franco Advogados', 1400.00, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Vieira Franco Advogados';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Receita', c.id, cl.id, 'Mensalidade Yasmin', 600.00, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Yasmin';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Receita', c.id, 'Projeto avulso', 1440.00, 'Pago', '2026-05-15', '2026-05-15'
  from public.financial_categories c
 where c.kind = 'Receita' and c.name = 'Projetos avulsos';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Pró-labore (sócias)', 13000.00, 'Pago', '2026-05-05', '2026-05-05'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Tráfego pago (gestão)', 304.76, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Tráfego pago (gestão)';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Transporte / deslocamento', 400.00, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Transporte / deslocamento';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Contabilidade / MEI', 159.90, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Contabilidade / MEI';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'DAS - Simples Nacional', 86.05, 'Pago', '2026-05-20', '2026-05-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'DAS - Simples Nacional';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Equipamentos', 666.27, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Outros custos operacionais', 528.57, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Outros custos operacionais';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-05', 'Despesa', c.id, 'Assinaturas e ferramentas digitais', 1078.56, 'Pago', '2026-05-10', '2026-05-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais';

-- 2026-06
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Receita', c.id, cl.id, 'Mensalidade Beatriz Cristina', 2000.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Beatriz Cristina';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Receita', c.id, cl.id, 'Mensalidade Briller', 1550.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Briller';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Receita', c.id, cl.id, 'Mensalidade Dra. Hemilayne', 1897.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Dra. Hemilayne';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Receita', c.id, cl.id, 'Mensalidade Julia Brito', 2000.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Julia Brito';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Receita', c.id, cl.id, 'Mensalidade Kiku Sushi', 2200.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Kiku Sushi';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Receita', c.id, cl.id, 'Mensalidade Laura Chioquetta', 1550.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Laura Chioquetta';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Receita', c.id, cl.id, 'Mensalidade Laysa Rocha', 1821.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Laysa Rocha';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Receita', c.id, cl.id, 'Mensalidade Malukies Cookies & Co', 1700.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Malukies Cookies & Co';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Receita', c.id, cl.id, 'Mensalidade Natural Concept', 1700.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Natural Concept';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Receita', c.id, cl.id, 'Mensalidade Osteo&Fit', 2000.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Osteo&Fit';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Receita', c.id, cl.id, 'Mensalidade Vieira Franco Advogados', 1400.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Vieira Franco Advogados';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Receita', c.id, cl.id, 'Mensalidade Wanessa', 600.00, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Wanessa';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'Pró-labore (sócias)', 13000.00, 'Pago', '2026-06-05', '2026-06-05'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'Contabilidade / MEI', 159.90, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Contabilidade / MEI';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'DAS - Simples Nacional', 86.05, 'Pago', '2026-06-20', '2026-06-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'DAS - Simples Nacional';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'Equipamentos', 387.33, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-06', 'Despesa', c.id, 'Assinaturas e ferramentas digitais', 1133.88, 'Pago', '2026-06-10', '2026-06-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais';

-- 2026-07
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Receita', c.id, cl.id, 'Mensalidade Briller', 1550.00, 'Pago', '2026-07-10', '2026-07-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Briller';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Receita', c.id, cl.id, 'Mensalidade Dra. Hemilayne', 1897.00, 'Pago', '2026-07-10', '2026-07-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Dra. Hemilayne';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Receita', c.id, cl.id, 'Mensalidade Julia Brito', 2500.00, 'Pago', '2026-07-10', '2026-07-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Julia Brito';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Receita', c.id, cl.id, 'Mensalidade Kiku Sushi', 2200.00, 'Pago', '2026-07-10', '2026-07-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Kiku Sushi';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Receita', c.id, cl.id, 'Mensalidade Laura Chioquetta', 1550.00, 'Pago', '2026-07-10', '2026-07-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Laura Chioquetta';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Receita', c.id, cl.id, 'Mensalidade Malukies Cookies & Co', 1700.00, 'Pago', '2026-07-10', '2026-07-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Malukies Cookies & Co';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Receita', c.id, cl.id, 'Mensalidade Natural Concept', 1700.00, 'Pago', '2026-07-10', '2026-07-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Natural Concept';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Receita', c.id, cl.id, 'Mensalidade Osteo&Fit', 2000.00, 'Pago', '2026-07-10', '2026-07-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Osteo&Fit';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Receita', c.id, cl.id, 'Mensalidade Vieira Franco Advogados', 1400.00, 'Pago', '2026-07-10', '2026-07-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Vieira Franco Advogados';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Receita', c.id, 'Acompanhamento de parto — Brenda', 800.00, 'Pago', '2026-07-15', '2026-07-15'
  from public.financial_categories c
 where c.kind = 'Receita' and c.name = 'Projetos avulsos';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Receita', c.id, 'Acompanhamento de parto — Josiele', 1100.00, 'Pago', '2026-07-15', '2026-07-15'
  from public.financial_categories c
 where c.kind = 'Receita' and c.name = 'Projetos avulsos';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Receita', c.id, 'Vídeo de aniversário — Marcela', 350.00, 'Pago', '2026-07-15', '2026-07-15'
  from public.financial_categories c
 where c.kind = 'Receita' and c.name = 'Projetos avulsos';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'Pró-labore (sócias)', 13000.00, 'Pago', '2026-07-05', '2026-07-05'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'Contabilidade / MEI', 159.90, 'Pago', '2026-07-10', '2026-07-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Contabilidade / MEI';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'DAS - Simples Nacional', 86.05, 'Pago', '2026-07-20', '2026-07-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'DAS - Simples Nacional';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-07', 'Despesa', c.id, 'Assinaturas e ferramentas digitais', 1081.27, 'Pago', '2026-07-10', '2026-07-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date, notes)
select '2026-07', 'Despesa', c.id, 'A CLASSIFICAR — diferença da planilha', 1239.80, 'Pago', '2026-07-28', '2026-07-28',
       'No Resumo Anual da planilha, as categorias de despesa deste mês somam R$ 1,239.80 a menos que o TOTAL do próprio Resumo. Lançado aqui para o mês fechar; edite e escolha a categoria certa.'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Outros custos operacionais';

-- 2026-08
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Receita', c.id, cl.id, 'Mensalidade Briller', 1550.00, 'Pago', '2026-08-10', '2026-08-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Briller';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Receita', c.id, cl.id, 'Mensalidade Izabela Schipitoski', 1800.00, 'Pago', '2026-08-10', '2026-08-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Izabela Schipitoski';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Receita', c.id, cl.id, 'Mensalidade Kiku Sushi', 2200.00, 'Pago', '2026-08-10', '2026-08-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Kiku Sushi';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Receita', c.id, cl.id, 'Mensalidade Laura Chioquetta', 1550.00, 'Pago', '2026-08-10', '2026-08-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Laura Chioquetta';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Receita', c.id, cl.id, 'Mensalidade Malukies Cookies & Co', 1700.00, 'Pago', '2026-08-10', '2026-08-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Malukies Cookies & Co';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Receita', c.id, cl.id, 'Mensalidade Natural Concept', 1700.00, 'Pago', '2026-08-10', '2026-08-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Natural Concept';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Receita', c.id, cl.id, 'Mensalidade Osteo&Fit', 2200.00, 'Pago', '2026-08-10', '2026-08-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Osteo&Fit';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Receita', c.id, cl.id, 'Mensalidade Vieira Franco Advogados', 1400.00, 'Pago', '2026-08-10', '2026-08-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Vieira Franco Advogados';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Receita', c.id, 'Acompanhamento de parto — Sheila', 1100.00, 'Pago', '2026-08-15', '2026-08-15'
  from public.financial_categories c
 where c.kind = 'Receita' and c.name = 'Projetos avulsos';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Receita', c.id, 'Ensaio do Benício', 300.00, 'Pago', '2026-08-15', '2026-08-15'
  from public.financial_categories c
 where c.kind = 'Receita' and c.name = 'Projetos avulsos';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'Pró-labore (sócias)', 13000.00, 'Pago', '2026-08-05', '2026-08-05'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'Tráfego pago (gestão)', 250.00, 'Pago', '2026-08-10', '2026-08-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Tráfego pago (gestão)';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'DAS - Simples Nacional', 86.05, 'Pago', '2026-08-20', '2026-08-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'DAS - Simples Nacional';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-08', 'Despesa', c.id, 'Assinaturas e ferramentas digitais', 1029.37, 'Pago', '2026-08-10', '2026-08-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date, notes)
select '2026-08', 'Despesa', c.id, 'A CLASSIFICAR — diferença da planilha', 1534.80, 'Pago', '2026-08-28', '2026-08-28',
       'No Resumo Anual da planilha, as categorias de despesa deste mês somam R$ 1,534.80 a menos que o TOTAL do próprio Resumo. Lançado aqui para o mês fechar; edite e escolha a categoria certa.'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Outros custos operacionais';

-- 2026-09
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Receita', c.id, cl.id, 'Mensalidade Dra. Hemilayne', 2000.00, 'Pago', '2026-09-10', '2026-09-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Dra. Hemilayne';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Receita', c.id, cl.id, 'Mensalidade Izabela Schipitoski', 1800.00, 'Pago', '2026-09-10', '2026-09-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Izabela Schipitoski';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Receita', c.id, cl.id, 'Mensalidade Kiku Sushi', 2200.00, 'Pago', '2026-09-10', '2026-09-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Kiku Sushi';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Receita', c.id, cl.id, 'Mensalidade Laura Chioquetta', 1550.00, 'Pago', '2026-09-10', '2026-09-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Laura Chioquetta';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Receita', c.id, cl.id, 'Mensalidade Malukies Cookies & Co', 2200.00, 'Pago', '2026-09-10', '2026-09-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Malukies Cookies & Co';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Receita', c.id, cl.id, 'Mensalidade Natural Concept', 1700.00, 'Pago', '2026-09-10', '2026-09-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Natural Concept';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Receita', c.id, cl.id, 'Mensalidade Osteo&Fit', 2200.00, 'Pago', '2026-09-10', '2026-09-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Osteo&Fit';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Receita', c.id, cl.id, 'Mensalidade Studio Bambu', 1300.00, 'Pago', '2026-09-10', '2026-09-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Studio Bambu';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Receita', c.id, 'Fotos do Benício', 300.00, 'Pago', '2026-09-15', '2026-09-15'
  from public.financial_categories c
 where c.kind = 'Receita' and c.name = 'Projetos avulsos';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Receita', c.id, 'Cobertura da festa da Bea', 400.00, 'Pago', '2026-09-15', '2026-09-15'
  from public.financial_categories c
 where c.kind = 'Receita' and c.name = 'Projetos avulsos';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'Pró-labore (sócias)', 13000.00, 'Pago', '2026-09-05', '2026-09-05'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'DAS - Simples Nacional', 86.05, 'Pago', '2026-09-20', '2026-09-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'DAS - Simples Nacional';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'Equipamentos', 368.76, 'Pago', '2026-09-10', '2026-09-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Equipamentos';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'Outros custos operacionais', 2166.70, 'Pago', '2026-09-10', '2026-09-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Outros custos operacionais';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-09', 'Despesa', c.id, 'Assinaturas e ferramentas digitais', 1026.37, 'Pago', '2026-09-10', '2026-09-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date, notes)
select '2026-09', 'Despesa', c.id, 'A CLASSIFICAR — diferença da planilha', 1166.04, 'Pago', '2026-09-28', '2026-09-28',
       'No Resumo Anual da planilha, as categorias de despesa deste mês somam R$ 1,166.04 a menos que o TOTAL do próprio Resumo. Lançado aqui para o mês fechar; edite e escolha a categoria certa.'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Outros custos operacionais';

-- 2026-10
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Receita', c.id, cl.id, 'Mensalidade Dra. Hemilayne', 2000.00, 'Pago', '2026-10-10', '2026-10-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Dra. Hemilayne';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Receita', c.id, cl.id, 'Mensalidade Izabela Schipitoski', 1800.00, 'Pago', '2026-10-10', '2026-10-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Izabela Schipitoski';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Receita', c.id, cl.id, 'Mensalidade Kiku Sushi', 2200.00, 'Pago', '2026-10-10', '2026-10-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Kiku Sushi';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Receita', c.id, cl.id, 'Mensalidade Laura Chioquetta', 1550.00, 'Pago', '2026-10-10', '2026-10-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Laura Chioquetta';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Receita', c.id, cl.id, 'Mensalidade Malukies Cookies & Co', 2600.00, 'Pendente', '2026-10-10', null
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Malukies Cookies & Co';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Receita', c.id, cl.id, 'Mensalidade Natural Concept', 1700.00, 'Pago', '2026-10-10', '2026-10-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Natural Concept';
insert into public.financial_entries (reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Receita', c.id, cl.id, 'Mensalidade Studio Bambu', 1300.00, 'Pago', '2026-10-10', '2026-10-10'
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Studio Bambu';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Receita', c.id, 'Cobertura de aniversário', 700.00, 'Pago', '2026-10-15', '2026-10-15'
  from public.financial_categories c
 where c.kind = 'Receita' and c.name = 'Projetos avulsos';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Receita', c.id, 'Fotos do Benício', 300.00, 'Pago', '2026-10-15', '2026-10-15'
  from public.financial_categories c
 where c.kind = 'Receita' and c.name = 'Projetos avulsos';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Despesa', c.id, 'Pró-labore (sócias)', 13000.00, 'Pago', '2026-10-05', '2026-10-05'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Despesa', c.id, 'DAS - Simples Nacional', 86.05, 'Pago', '2026-10-20', '2026-10-20'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'DAS - Simples Nacional';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date)
select '2026-10', 'Despesa', c.id, 'Assinaturas e ferramentas digitais', 1026.37, 'Pago', '2026-10-10', '2026-10-10'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais';
insert into public.financial_entries (reference_month, kind, category_id, description, amount, status, due_date, paid_date, notes)
select '2026-10', 'Despesa', c.id, 'A CLASSIFICAR — diferença da planilha', 2837.74, 'Pago', '2026-10-28', '2026-10-28',
       'No Resumo Anual da planilha, as categorias de despesa deste mês somam R$ 2,837.74 a menos que o TOTAL do próprio Resumo. Lançado aqui para o mês fechar; edite e escolha a categoria certa.'
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Outros custos operacionais';

-- -------------------------------------------------------------
-- 4. Recorrências a partir de novembro/2026
-- -------------------------------------------------------------
insert into public.financial_recurrences (description, kind, category_id, client_id, amount, due_day, start_month, active)
select 'Mensalidade Studio Bambu', 'Receita', c.id, cl.id, 1300.00, 10, '2026-11', true
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Studio Bambu';
insert into public.financial_recurrences (description, kind, category_id, client_id, amount, due_day, start_month, active)
select 'Mensalidade Dra. Hemilayne', 'Receita', c.id, cl.id, 2000.00, 10, '2026-11', true
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Dra. Hemilayne';
insert into public.financial_recurrences (description, kind, category_id, client_id, amount, due_day, start_month, active)
select 'Mensalidade Izabela Schipitoski', 'Receita', c.id, cl.id, 1800.00, 10, '2026-11', true
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Izabela Schipitoski';
insert into public.financial_recurrences (description, kind, category_id, client_id, amount, due_day, start_month, active)
select 'Mensalidade Kiku Sushi', 'Receita', c.id, cl.id, 2200.00, 10, '2026-11', true
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Kiku Sushi';
insert into public.financial_recurrences (description, kind, category_id, client_id, amount, due_day, start_month, active)
select 'Mensalidade Laura Chioquetta', 'Receita', c.id, cl.id, 1550.00, 10, '2026-11', true
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Laura Chioquetta';
insert into public.financial_recurrences (description, kind, category_id, client_id, amount, due_day, start_month, active)
select 'Mensalidade Malukies Cookies & Co', 'Receita', c.id, cl.id, 2600.00, 10, '2026-11', true
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Malukies Cookies & Co';
insert into public.financial_recurrences (description, kind, category_id, client_id, amount, due_day, start_month, active)
select 'Mensalidade Natural Concept', 'Receita', c.id, cl.id, 1700.00, 10, '2026-11', true
  from public.financial_categories c, public.clients cl
 where c.kind = 'Receita' and c.name = 'Mensalidades / clientes recorrentes'
   and cl.name = 'Natural Concept';
insert into public.financial_recurrences (description, kind, category_id, amount, due_day, start_month, active)
select 'Pró-labore das sócias', 'Despesa', c.id, 13000.00, 5, '2026-11', true
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Pró-labore (sócias)';
insert into public.financial_recurrences (description, kind, category_id, amount, due_day, start_month, active)
select 'Assinaturas e ferramentas', 'Despesa', c.id, 1026.37, 10, '2026-11', true
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Assinaturas e ferramentas digitais';
insert into public.financial_recurrences (description, kind, category_id, amount, due_day, start_month, active)
select 'Honorários da contabilidade', 'Despesa', c.id, 159.90, 10, '2026-11', true
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'Contabilidade / MEI';
insert into public.financial_recurrences (description, kind, category_id, amount, due_day, start_month, active)
select 'DAS do Simples Nacional', 'Despesa', c.id, 86.05, 20, '2026-11', true
  from public.financial_categories c
 where c.kind = 'Despesa' and c.name = 'DAS - Simples Nacional';

-- -------------------------------------------------------------
-- 5. A equipe
-- -------------------------------------------------------------
insert into public.team_members (name, kind, role, default_rate, active)
select 'Fran', 'Sócia', 'Produção e edição', 6500.00, true
where not exists (select 1 from public.team_members where name = 'Fran');
insert into public.team_members (name, kind, role, default_rate, active)
select 'Vitória', 'Sócia', 'Planejamento e comercial', 6500.00, true
where not exists (select 1 from public.team_members where name = 'Vitória');

raise notice 'Carga concluída: 110 lançamentos de abril a outubro/2026.';

end
$$;
