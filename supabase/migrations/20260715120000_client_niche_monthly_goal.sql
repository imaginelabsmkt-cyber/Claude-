-- =============================================================
-- Atualização do cadastro de clientes
-- - Adiciona: niche (nicho) e monthly_goal (meta de conteúdos por mês)
-- - Remove: posting_frequency (medição por semana foi substituída pela
--   meta mensal + contagem real de conteúdos)
-- Idempotente: pode rodar sem erro mesmo se reexecutada.
-- =============================================================

alter table public.clients add column if not exists niche text;
alter table public.clients add column if not exists monthly_goal integer;
alter table public.clients drop column if exists posting_frequency;
