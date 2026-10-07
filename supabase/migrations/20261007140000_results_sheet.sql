-- Planilha de resultados por cliente (Google Sheets), criada e preenchida
-- automaticamente pelo sistema no Drive da conta conectada.
alter table public.clients
  add column if not exists results_sheet_id text,
  add column if not exists results_sheet_url text;
