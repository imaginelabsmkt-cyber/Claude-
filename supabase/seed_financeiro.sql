-- =============================================================
-- Carga inicial do financeiro a partir da planilha
-- "Fluxo de Caixa Imagine Labs 2026".
--
-- RECORTE (definido com a agência em setembro/2026):
--
--   * HISTÓRICO: abril a setembro/2026 — 149 lançamentos.
--     Outubro a dezembro NÃO entram: na planilha eles eram cópia da
--     carteira antiga, com 15 clientes que em sua maioria não
--     renovaram. Esses meses ficam limpos, para serem montados pelo
--     botão "Gerar do plano fixo" com a carteira real.
--
--   * CARTEIRA ATIVA (6 clientes, R$ 11,150.00/mês):
--     Izabela, Kiku Sushi, Laura Chioquetta, Malukies Cookies & Co, Natural Concept, Osteo&Fit.
--     Os outros 9 clientes são criados como INATIVOS — o
--     histórico deles é preservado, mas não geram mensalidade.
--
--   * RECORRÊNCIAS: as 6 mensalidades vigentes + 12 custos fixos,
--     valendo a partir de 2026-10. Total de custo fixo: R$ 14,186.55/mês.
--
-- CONFERIR: "Contabilidade / MEI" (R$ 159.90) entrou nas
-- recorrências com o valor de agosto — na aba de setembro essa linha
-- estava quebrada (#REF!) na planilha original.
--
-- Execute DEPOIS da migration 20260908120000_financeiro.sql.
-- É seguro: não faz nada se já houver lançamentos cadastrados.
-- =============================================================

do $$
begin

if exists (select 1 from public.financial_entries) then
  raise notice 'Financeiro já possui lançamentos — carga inicial ignorada.';
  return;
end if;

-- -------------------------------------------------------------
-- 1. Saldo inicial (Configurações!C3 da planilha) e mês de partida
-- -------------------------------------------------------------
update public.financial_settings
   set opening_balance = 0,
       opening_month   = '2026-04'
 where id = true;

-- -------------------------------------------------------------
-- 2. Clientes da planilha
--    Só cria quem ainda não existe; clientes já cadastrados no módulo
--    de produção não são alterados por esta carga.
-- -------------------------------------------------------------
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
select 'Dra. Hemilayne', false
where not exists (select 1 from public.clients where name = 'Dra. Hemilayne');
insert into public.clients (name, active)   -- carteira ativa
select 'Izabela', true
where not exists (select 1 from public.clients where name = 'Izabela');
insert into public.clients (name, active)   -- não renovou
select 'Julia Brito', false
where not exists (select 1 from public.clients where name = 'Julia Brito');
insert into public.clients (name, active)   -- carteira ativa
select 'Kiku Sushi', true
where not exists (select 1 from public.clients where name = 'Kiku Sushi');
insert into public.clients (name, active)   -- carteira ativa
select 'Laura Chioquetta', true
where not exists (select 1 from public.clients where name = 'Laura Chioquetta');
insert into public.clients (name, active)   -- não renovou
select 'Laysa Rocha', false
where not exists (select 1 from public.clients where name = 'Laysa Rocha');
insert into public.clients (name, active)   -- carteira ativa
select 'Malukies Cookies & Co', true
where not exists (select 1 from public.clients where name = 'Malukies Cookies & Co');
insert into public.clients (name, active)   -- carteira ativa
select 'Natural Concept', true
where not exists (select 1 from public.clients where name = 'Natural Concept');
insert into public.clients (name, active)   -- carteira ativa
select 'Osteo&Fit', true
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
-- 3. Lançamentos de abril a setembro/2026
-- -------------------------------------------------------------

-- 2026-04
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Beatriz Cristina' limit 1),
  'Beatriz Cristina', 1800.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Julia Brito' limit 1),
  'Julia Brito', 2250.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Kiku Sushi' limit 1),
  'Kiku Sushi', 2000.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Laura Chioquetta' limit 1),
  'Laura Chioquetta', 1000.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Laysa Rocha' limit 1),
  'Laysa Rocha', 1821.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Malukies Cookies & Co' limit 1),
  'Malukies Cookies & Co', 1700.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Natural Concept' limit 1),
  'Natural Concept', 1700.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Osteo&Fit' limit 1),
  'Osteo&Fit', 2000.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Projetos avulsos' and kind = 'Receita'::financial_kind),
  null,
  'Mentoria São Jorge', 1000.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Pró-labore (sócias)' and kind = 'Despesa'::financial_kind),
  null,
  'Pró-labore Fran', 5500.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Pró-labore (sócias)' and kind = 'Despesa'::financial_kind),
  null,
  'Pró-labore Vitória', 5500.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Adobe', 95.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Asana', 124.43, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'CapCut', 32.9, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Captions', 51.9, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Claude (assinatura)', 110.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'iCloud Fran', 66.9, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-04', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'iCloud Vitória', 66.9, 'Pago'::financial_status);

-- 2026-05
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Beatriz Cristina' limit 1),
  'Beatriz Cristina', 2000.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Briller' limit 1),
  'Briller', 1550.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Danielle Bergaman' limit 1),
  'Danielle Bergaman', 800.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Dra. Hemilayne' limit 1),
  'Dra. Hemilayne', 1897.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Julia Brito' limit 1),
  'Julia Brito', 2000.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Kiku Sushi' limit 1),
  'Kiku Sushi', 2200.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Laura Chioquetta' limit 1),
  'Laura Chioquetta', 1550.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Laysa Rocha' limit 1),
  'Laysa Rocha', 1821.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Natural Concept' limit 1),
  'Natural Concept', 1700.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Osteo&Fit' limit 1),
  'Osteo&Fit', 2000.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Vieira Franco Advogados' limit 1),
  'Vieira Franco Advogados', 1400.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Yasmin' limit 1),
  'Yasmin', 600.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Projetos avulsos' and kind = 'Receita'::financial_kind),
  null,
  'Acompanhamento de Parto', 1040.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Projetos avulsos' and kind = 'Receita'::financial_kind),
  null,
  'Ensaio Fotográfico Cicliane', 400.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Pró-labore (sócias)' and kind = 'Despesa'::financial_kind),
  null,
  'Pró-labore Fran', 6500.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Pró-labore (sócias)' and kind = 'Despesa'::financial_kind),
  null,
  'Pró-labore Vitória', 6500.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Tráfego pago (gestão)' and kind = 'Despesa'::financial_kind),
  null,
  'Tráfego pago (gestão)', 304.76, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Transporte / deslocamento' and kind = 'Despesa'::financial_kind),
  null,
  'Gasolina - carro Fran', 200.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Transporte / deslocamento' and kind = 'Despesa'::financial_kind),
  null,
  'Gasolina - carro Vitória', 200.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Contabilidade / MEI' and kind = 'Despesa'::financial_kind),
  null,
  'Contabilidade / MEI', 159.9, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'DAS - Simples Nacional' and kind = 'Despesa'::financial_kind),
  null,
  'DAS - Simples Nacional', 86.05, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Equipamentos' and kind = 'Despesa'::financial_kind),
  null,
  'Microfone Hollyland Lark M2 (parcela 1/2)', 387.33, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Equipamentos' and kind = 'Despesa'::financial_kind),
  null,
  'Mouse', 99.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Equipamentos' and kind = 'Despesa'::financial_kind),
  null,
  'Capa Macbook Fran', 89.97, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Equipamentos' and kind = 'Despesa'::financial_kind),
  null,
  'Capa Macbook Vitória', 89.97, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Outros custos operacionais' and kind = 'Despesa'::financial_kind),
  null,
  'Pilates', 342.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Outros custos operacionais' and kind = 'Despesa'::financial_kind),
  null,
  'Janta comemoração meta', 151.57, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Outros custos operacionais' and kind = 'Despesa'::financial_kind),
  null,
  'Material ensaio cliente (cartolinas/fitas)', 35.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Adobe', 99.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'CapCut', 32.9, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Canva', 35.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Captions', 51.9, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'ChatGPT Plus', 119.9, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Claude (assinatura)', 118.5, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Claude Max', 487.56, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'iCloud Fran', 66.9, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-05', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'iCloud Vitória', 66.9, 'Pago'::financial_status);

-- 2026-06
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Beatriz Cristina' limit 1),
  'Beatriz Cristina', 2000.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Briller' limit 1),
  'Briller', 1550.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Dra. Hemilayne' limit 1),
  'Dra. Hemilayne', 1897.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Julia Brito' limit 1),
  'Julia Brito', 2000.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Kiku Sushi' limit 1),
  'Kiku Sushi', 2200.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Laura Chioquetta' limit 1),
  'Laura Chioquetta', 1550.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Laysa Rocha' limit 1),
  'Laysa Rocha', 1821.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Malukies Cookies & Co' limit 1),
  'Malukies Cookies & Co', 1700.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Natural Concept' limit 1),
  'Natural Concept', 1700.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Osteo&Fit' limit 1),
  'Osteo&Fit', 2000.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Vieira Franco Advogados' limit 1),
  'Vieira Franco Advogados', 1400.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Wanessa' limit 1),
  'Wanessa', 600.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Pró-labore (sócias)' and kind = 'Despesa'::financial_kind),
  null,
  'Pró-labore Fran', 6500.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Pró-labore (sócias)' and kind = 'Despesa'::financial_kind),
  null,
  'Pró-labore Vitória', 6500.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Contabilidade / MEI' and kind = 'Despesa'::financial_kind),
  null,
  'Contabilidade / MEI', 159.9, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'DAS - Simples Nacional' and kind = 'Despesa'::financial_kind),
  null,
  'DAS - Simples Nacional', 86.05, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Equipamentos' and kind = 'Despesa'::financial_kind),
  null,
  'Microfone Hollyland Lark M2 (parcela 2/2)', 387.33, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Adobe', 160.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'CapCut', 32.9, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Canva', 35.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Captions', 51.9, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'ChatGPT Plus', 107.51, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Claude Max', 612.77, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'iCloud Fran', 66.9, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-06', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'iCloud Vitória', 66.9, 'Pago'::financial_status);

-- 2026-07
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Briller' limit 1),
  'Briller', 1550.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Dra. Hemilayne' limit 1),
  'Dra. Hemilayne', 1897.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Julia Brito' limit 1),
  'Julia Brito', 2500.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Kiku Sushi' limit 1),
  'Kiku Sushi', 2200.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Laura Chioquetta' limit 1),
  'Laura Chioquetta', 1550.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Malukies Cookies & Co' limit 1),
  'Malukies Cookies & Co', 1700.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Natural Concept' limit 1),
  'Natural Concept', 1700.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Osteo&Fit' limit 1),
  'Osteo&Fit', 2000.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Vieira Franco Advogados' limit 1),
  'Vieira Franco Advogados', 1400.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Projetos avulsos' and kind = 'Receita'::financial_kind),
  null,
  'Acompanhamento de Parto - Brenda', 800.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Projetos avulsos' and kind = 'Receita'::financial_kind),
  null,
  'Acompanhamento de Parto - Josiele', 1100.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Projetos avulsos' and kind = 'Receita'::financial_kind),
  null,
  'Vïdeo aniversário - Marcela', 350.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Pró-labore (sócias)' and kind = 'Despesa'::financial_kind),
  null,
  'Pró-labore Fran', 6500.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Pró-labore (sócias)' and kind = 'Despesa'::financial_kind),
  null,
  'Pró-labore Vitória', 6500.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Contabilidade / MEI' and kind = 'Despesa'::financial_kind),
  null,
  'Contabilidade / MEI', 159.9, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'DAS - Simples Nacional' and kind = 'Despesa'::financial_kind),
  null,
  'DAS - Simples Nacional', 86.05, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Transporte / deslocamento' and kind = 'Despesa'::financial_kind),
  null,
  'Gasolina - carro Fran', 200.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Equipamentos' and kind = 'Despesa'::financial_kind),
  null,
  'Softbox Octabox e Aputure Amaran (Parcela 1/4)', 671.04, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Equipamentos' and kind = 'Despesa'::financial_kind),
  null,
  'Tripé K&f (Parcela 1/2)', 368.76, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Adobe', 95.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'CapCut', 32.9, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Canva', 35.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Captions', 51.9, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'ChatGPT Plus', 119.9, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Claude Max', 612.77, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'iCloud Fran', 66.9, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-07', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'iCloud Vitória', 66.9, 'Pago'::financial_status);

-- 2026-08
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Briller' limit 1),
  'Briller', 1550.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Kiku Sushi' limit 1),
  'Kiku Sushi', 2200.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Laura Chioquetta' limit 1),
  'Laura Chioquetta', 1550.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Malukies Cookies & Co' limit 1),
  'Malukies Cookies & Co', 1700.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Natural Concept' limit 1),
  'Natural Concept', 1700.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Osteo&Fit' limit 1),
  'Osteo&Fit', 2200.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Vieira Franco Advogados' limit 1),
  'Vieira Franco Advogados', 1400.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Izabela' limit 1),
  'Izabela', 1800.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Projetos avulsos' and kind = 'Receita'::financial_kind),
  null,
  'Acompanhamento de Parto - Sheila', 1100.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Projetos avulsos' and kind = 'Receita'::financial_kind),
  null,
  'Ensaio Benicio', 300.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Pró-labore (sócias)' and kind = 'Despesa'::financial_kind),
  null,
  'Pró-labore Fran', 6500.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Pró-labore (sócias)' and kind = 'Despesa'::financial_kind),
  null,
  'Pró-labore Vitória', 6500.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Tráfego pago (gestão)' and kind = 'Despesa'::financial_kind),
  null,
  'Tráfego pago (gestão)', 250.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Contabilidade / MEI' and kind = 'Despesa'::financial_kind),
  null,
  'Contabilidade / MEI', 159.9, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'DAS - Simples Nacional' and kind = 'Despesa'::financial_kind),
  null,
  'DAS - Simples Nacional', 86.05, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Outros custos operacionais' and kind = 'Despesa'::financial_kind),
  null,
  'Pilates', 495.0, 'Pago'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Equipamentos' and kind = 'Despesa'::financial_kind),
  null,
  'Softbox Octabox e Aputure Amaran (Parcela 2/4)', 671.04, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Equipamentos' and kind = 'Despesa'::financial_kind),
  null,
  'Tripé K&f (Parcela 2/2)', 368.76, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Adobe', 95.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'CapCut', 32.9, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Canva', 35.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'ChatGPT Plus', 119.9, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Claude Max', 612.77, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'iCloud Fran', 66.9, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-08', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'iCloud Vitória', 66.9, 'Pendente'::financial_status);

-- 2026-09
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-09', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Kiku Sushi' limit 1),
  'Kiku Sushi', 2200.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-09', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Laura Chioquetta' limit 1),
  'Laura Chioquetta', 1550.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-09', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Malukies Cookies & Co' limit 1),
  'Malukies Cookies & Co', 1700.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-09', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Natural Concept' limit 1),
  'Natural Concept', 1700.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-09', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Izabela' limit 1),
  'Izabela', 1800.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-09', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Osteo&Fit' limit 1),
  'Osteo&Fit', 2200.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-09', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Pró-labore (sócias)' and kind = 'Despesa'::financial_kind),
  null,
  'Pró-labore Fran', 6500.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-09', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Pró-labore (sócias)' and kind = 'Despesa'::financial_kind),
  null,
  'Pró-labore Vitória', 6500.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-09', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'DAS - Simples Nacional' and kind = 'Despesa'::financial_kind),
  null,
  'DAS - Simples Nacional', 86.05, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-09', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Adobe', 95.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-09', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'CapCut', 32.9, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-09', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Canva', 53.0, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-09', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Captions', 51.9, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-09', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'ChatGPT Plus', 119.9, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-09', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'Claude Max', 454.1, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-09', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'iCloud Fran', 66.9, 'Pendente'::financial_status);
insert into public.financial_entries
  (reference_month, kind, category_id, client_id, description, amount, status)
values (
  '2026-09', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  'iCloud Vitória', 66.9, 'Pendente'::financial_status);

-- -------------------------------------------------------------
-- 4. Recorrências vigentes, a partir de 2026-10
-- -------------------------------------------------------------

-- 4.1 Mensalidades da carteira ativa (R$ 11,150.00/mês)
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'Kiku Sushi', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Kiku Sushi' limit 1),
  2200.0, '2026-10', true);
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'Laura Chioquetta', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Laura Chioquetta' limit 1),
  1550.0, '2026-10', true);
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'Malukies Cookies & Co', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Malukies Cookies & Co' limit 1),
  1700.0, '2026-10', true);
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'Natural Concept', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Natural Concept' limit 1),
  1700.0, '2026-10', true);
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'Izabela', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Izabela' limit 1),
  1800.0, '2026-10', true);
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'Osteo&Fit', 'Receita'::financial_kind,
  (select id from public.financial_categories
    where name = 'Mensalidades / clientes recorrentes' and kind = 'Receita'::financial_kind),
  (select id from public.clients where name = 'Osteo&Fit' limit 1),
  2200.0, '2026-10', true);

-- 4.2 Custos fixos da agência (R$ 14,186.55/mês)
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'Pró-labore Fran', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Pró-labore (sócias)' and kind = 'Despesa'::financial_kind),
  null,
  6500.0, '2026-10', true);
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'Pró-labore Vitória', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Pró-labore (sócias)' and kind = 'Despesa'::financial_kind),
  null,
  6500.0, '2026-10', true);
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'DAS - Simples Nacional', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'DAS - Simples Nacional' and kind = 'Despesa'::financial_kind),
  null,
  86.05, '2026-10', true);
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'Adobe', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  95.0, '2026-10', true);
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'CapCut', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  32.9, '2026-10', true);
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'Canva', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  53.0, '2026-10', true);
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'Captions', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  51.9, '2026-10', true);
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'ChatGPT Plus', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  119.9, '2026-10', true);
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'Claude Max', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  454.1, '2026-10', true);
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'iCloud Fran', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  66.9, '2026-10', true);
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'iCloud Vitória', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Assinaturas e ferramentas digitais' and kind = 'Despesa'::financial_kind),
  null,
  66.9, '2026-10', true);
insert into public.financial_recurrences
  (description, kind, category_id, client_id, amount, start_month, active)
values (
  'Contabilidade / MEI', 'Despesa'::financial_kind,
  (select id from public.financial_categories
    where name = 'Contabilidade / MEI' and kind = 'Despesa'::financial_kind),
  null,
  159.9, '2026-10', true);

raise notice 'Carga inicial concluída: histórico de abril a setembro/2026.';

end
$$;
