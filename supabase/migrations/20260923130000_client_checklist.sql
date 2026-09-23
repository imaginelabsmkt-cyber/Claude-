-- =============================================================
-- Checklists do cliente (onboarding + acessos do plano de ação)
--
-- Ao criar um cliente, nasce automaticamente um checklist de onboarding
-- (contrato, Google Forms, reunião de alinhamento, grupo de WhatsApp…) e um
-- checklist do plano de ação (acessos: Google, Facebook Ads, Instagram…).
-- kind separa os dois. Idempotente.
-- =============================================================

create table if not exists public.client_checklist_items (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  kind        text not null,               -- 'onboard' | 'plano'
  label       text not null,
  done        boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists client_checklist_items_client_idx
  on public.client_checklist_items (client_id, kind);

comment on table public.client_checklist_items is
  'Checklists por cliente: onboarding (kind=onboard) e acessos do plano (kind=plano).';

alter table public.client_checklist_items enable row level security;
drop policy if exists "client_checklist_items_all" on public.client_checklist_items;
create policy "client_checklist_items_all" on public.client_checklist_items
  for all to authenticated using (true) with check (true);
