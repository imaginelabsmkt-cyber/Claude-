-- =============================================================
-- Diagnóstico do cliente em PDF (além do HTML)
--
-- Na prática a análise costuma vir em PDF. Antes só aceitávamos HTML inline
-- (coluna html). Agora o diagnóstico pode ser:
--   - HTML inline (como antes): html preenchido, path/mime_type nulos.
--   - Arquivo (PDF, imagem…): guardado no Storage (bucket client-files),
--     com path + mime_type preenchidos e html nulo.
--
-- Por isso html deixa de ser obrigatório e ganhamos path/mime_type.
-- Idempotente.
-- =============================================================

alter table public.client_diagnostics
  add column if not exists path text,
  add column if not exists mime_type text;

alter table public.client_diagnostics
  alter column html drop not null;

comment on column public.client_diagnostics.path is
  'Caminho no Storage (bucket client-files) quando o diagnóstico é um arquivo (PDF etc.). Nulo para HTML inline.';
comment on column public.client_diagnostics.mime_type is
  'Tipo do arquivo quando guardado no Storage (ex.: application/pdf).';
