-- Demandas: arquivar em vez de apagar (nada é perdido; alimenta o relatório
-- do que foi feito por cliente). Idempotente.
alter table public.demands add column if not exists archived_at timestamptz;
