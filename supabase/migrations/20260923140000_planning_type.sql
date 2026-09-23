-- =============================================================
-- Tipo do planejamento: conteúdo ou plano de ação
--
-- As reuniões agora também servem para criar planos de ação (não só o
-- planejamento de conteúdo). Um marcador por linha separa os dois.
-- Idempotente.
-- =============================================================

alter table public.plannings
  add column if not exists plan_type text not null default 'Conteúdo';

comment on column public.plannings.plan_type is
  'Tipo do planejamento: "Conteúdo" ou "Plano de ação".';
