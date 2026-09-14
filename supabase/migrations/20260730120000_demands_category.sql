-- Demandas: adiciona a "área" (categoria) para organizar por tipo de ação
-- (Conteúdo, Google Meu Negócio, Facebook, Relatório, Estratégia, etc.).
-- Idempotente.
alter table public.demands add column if not exists category text;
