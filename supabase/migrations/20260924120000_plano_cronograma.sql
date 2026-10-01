-- =============================================================
-- Plano de ação como CRONOGRAMA (roadmap do mês)
--
-- O plano de ação deixa de ser só uma lista de estratégias e passa a ser um
-- cronograma: cada item tem uma ETAPA do mês (Preparar/Produzir/Lançar/
-- Acompanhar), um RESPONSÁVEL macro (FAVIE ou Cliente), uma previsão de data
-- em texto (ex.: "05 a 09/10", "toda semana") além da data real p/ ordenar, e
-- pode estar LIGADO à demanda ou ao conteúdo que ele gerou (ensaio, vídeo,
-- auditoria…). Também preparamos as DEMANDAS para terem ETAPAS (subtarefas),
-- usado quando um item do plano vira demanda com passos (ensaio: marcar ->
-- agenda -> editar; auditoria: analisar -> montar PDF -> treinar).
--
-- Tudo idempotente (add column if not exists).
-- =============================================================

-- 1) Cronograma no plano de ação -----------------------------------------
alter table public.action_plan_items
  add column if not exists owner       text not null default 'FAVIE'; -- FAVIE | Cliente
alter table public.action_plan_items
  add column if not exists stage       text;          -- Preparar | Produzir | Lançar | Acompanhar
alter table public.action_plan_items
  add column if not exists date_label  text;          -- previsão em texto: "05 a 09/10", "toda semana"
alter table public.action_plan_items
  add column if not exists linked_demand_id  uuid references public.demands (id) on delete set null;
alter table public.action_plan_items
  add column if not exists linked_content_id uuid references public.contents (id) on delete set null;

comment on column public.action_plan_items.owner is
  'Quem faz: FAVIE (vira trabalho da equipe) ou Cliente (vai p/ "O que precisamos de você" no painel).';
comment on column public.action_plan_items.stage is
  'Etapa do mês: Preparar | Produzir | Lançar | Acompanhar.';
comment on column public.action_plan_items.date_label is
  'Previsão em texto (o plano usa faixas e datas soltas: "05 a 09/10", "toda semana", "a confirmar").';

-- 2) Demandas com etapas (subtarefas) ------------------------------------
alter table public.demands
  add column if not exists steps jsonb not null default '[]'::jsonb;

comment on column public.demands.steps is
  'Etapas/subtarefas da demanda: [{ "label": "Marcar a data", "done": false }, ...].';
