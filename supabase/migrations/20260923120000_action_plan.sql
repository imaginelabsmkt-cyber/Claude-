-- =============================================================
-- Plano de ação do cliente (estratégias)
--
-- Para clientes que compram um "plano de ação" (ranqueamento no Google,
-- tráfego pago, auditoria de WhatsApp, treinamento de atendimento, etc.) em
-- vez do planejamento de conteúdo tradicional. Cada estratégia é um item, com
-- status, descrição, arquivo (PDF/rotina), prazo e responsável. Os vídeos e
-- artes continuam nos Conteúdos normais. Idempotente.
-- =============================================================

create table if not exists public.action_plan_items (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients (id) on delete cascade,
  title        text not null,
  type         text,                       -- Ranqueamento / Tráfego / WhatsApp…
  status       text not null default 'A fazer', -- A fazer | Fazendo | Feito
  description  text,
  file_path    text,                       -- Storage (bucket client-files)
  file_name    text,
  due_date     date,
  assignee_id  uuid references public.profiles (id) on delete set null,
  position     integer not null default 0, -- ordem manual
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists action_plan_items_client_idx
  on public.action_plan_items (client_id);

comment on table public.action_plan_items is
  'Estratégias do plano de ação por cliente (ranqueamento, tráfego, WhatsApp, treinamento…).';

alter table public.action_plan_items enable row level security;
drop policy if exists "action_plan_items_all" on public.action_plan_items;
create policy "action_plan_items_all" on public.action_plan_items
  for all to authenticated using (true) with check (true);
