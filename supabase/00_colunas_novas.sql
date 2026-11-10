-- =============================================================
-- AS COLUNAS NOVAS — isto roda ANTES de tudo
--
-- Por que existe este arquivo: o ATUALIZAR.sql quebrou na máquina da
-- Fran com "column r.vencimento_meses does not exist". A coluna era
-- criada no quinto bloco e usada no segundo.
--
-- Aqui ficam todas as colunas que o sistema passou a precisar, no
-- começo da fila. `add column if not exists` é seguro de repetir e
-- não mexe em nada que já exista.
-- =============================================================

-- Quantos meses depois da competência a conta vence. +1 é o normal
-- ("as contas de outubro eu fecho em novembro"); -1 é quem paga
-- antecipado (o Studio Bambu paga novembro no dia 25 de outubro).
alter table public.financial_recurrences
  add column if not exists vencimento_meses smallint not null default 1;

comment on column public.financial_recurrences.vencimento_meses is
  'Quantos meses depois da competência a conta vence. +1 é o normal; -1 é quem paga antecipado (Studio Bambu).';

-- Meta de faturamento do ano, em reais. Null = sem meta.
alter table public.financial_settings
  add column if not exists annual_revenue_goal numeric(14, 2);

comment on column public.financial_settings.annual_revenue_goal is
  'Meta de faturamento do ano, em reais. Null = sem meta.';
