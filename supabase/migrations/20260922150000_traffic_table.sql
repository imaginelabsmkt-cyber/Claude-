-- =============================================================
-- Planilha de tráfego extraída do arquivo (Excel/CSV)
--
-- Em vez de digitar número por número, a equipe sobe a planilha do Meta e o
-- sistema extrai o conteúdo, guardado como uma grade (linhas x colunas) e
-- mostrado como tabela no painel do cliente. Idempotente.
-- =============================================================

alter table public.client_monthly_results
  add column if not exists traffic_table     jsonb,
  add column if not exists traffic_file_name text;

comment on column public.client_monthly_results.traffic_table is
  'Planilha de tráfego extraída (linhas x colunas de texto). 1a linha = cabeçalho.';
