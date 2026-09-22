-- =============================================================
-- Arquivo anexo no relatório semanal (Excel, PDF, print…)
--
-- Além do texto, a equipe pode subir o relatório em arquivo. Guardado no
-- Storage (bucket client-files); o cliente baixa pelo painel. Idempotente.
-- =============================================================

alter table public.client_weekly_notes
  add column if not exists file_path text,
  add column if not exists file_name text;

comment on column public.client_weekly_notes.file_path is
  'Caminho no Storage (bucket client-files) do arquivo do relatório da semana.';
comment on column public.client_weekly_notes.file_name is
  'Nome original do arquivo do relatório (para exibir/baixar).';
