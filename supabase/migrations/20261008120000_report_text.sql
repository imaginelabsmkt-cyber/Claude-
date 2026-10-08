-- Texto do relatório da semana editado à mão (sobrepõe o gerado automático).
alter table public.client_monthly_results
  add column if not exists report_text text;
