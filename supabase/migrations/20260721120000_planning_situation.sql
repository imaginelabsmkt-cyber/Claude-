-- Situação MANUAL do planejamento (marcada pela planejadora, não automática).
-- Ex.: Pendente, Entregue, Atrasado, Reagendado.
alter table public.plannings
  add column if not exists situation text;
