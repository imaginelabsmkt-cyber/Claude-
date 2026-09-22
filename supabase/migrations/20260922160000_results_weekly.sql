-- =============================================================
-- Resultados de tráfego por SEMANA (antes era por mês)
--
-- A planilha do Meta é semanal, então os resultados passam a ser por semana
-- (âncora = segunda-feira, igual ao relatório semanal). Mantém a coluna month
-- (agora opcional) para não perder o que já foi salvo. Idempotente.
-- =============================================================

alter table public.client_monthly_results
  add column if not exists week_start text;

alter table public.client_monthly_results
  alter column month drop not null;

create unique index if not exists client_monthly_results_client_week_key
  on public.client_monthly_results (client_id, week_start)
  where week_start is not null;

comment on column public.client_monthly_results.week_start is
  'Segunda-feira da semana (YYYY-MM-DD). Chave semanal dos resultados.';
