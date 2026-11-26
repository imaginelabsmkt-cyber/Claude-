-- =============================================================
-- META DE FATURAMENTO DO ANO
--
-- Guarda quanto a Favie quer faturar no ano. Fica em branco até
-- alguém preencher em Financeiro > Configurações, e então aparece
-- no Dashboard: quanto já veio, quanto falta e quanto por mês.
--
--   Supabase > SQL Editor > New query > colar > Run.
--
-- Pode rodar quantas vezes quiser.
-- =============================================================

alter table public.financial_settings
  add column if not exists annual_revenue_goal numeric(14, 2);

comment on column public.financial_settings.annual_revenue_goal is
  'Meta de faturamento do ano, em reais. Null = sem meta.';
