-- =============================================================
-- Análise do relatório gerada por IA
--
-- Guarda o resumo "mastigado" (JSON) que a IA produz a partir do relatório,
-- para não reprocessar toda vez. Idempotente.
-- =============================================================

alter table public.client_reports
  add column if not exists analysis text;
