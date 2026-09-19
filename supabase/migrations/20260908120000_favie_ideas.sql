-- Espaço da favie (conteúdo próprio da agência) + banco de ideias.

-- 1) Marca um "cliente" como interno (a favie). Fica escondido da lista de
--    Clientes e das métricas, mas usa todo o motor de produção. Provisionado
--    automaticamente (a pessoa nunca cadastra isso na mão). Idempotente.
alter table public.clients
  add column if not exists is_internal boolean not null default false;

-- 2) Banco de ideias: captura rápida de ideias de conteúdo (nasce com formato
--    e pilar). Ao "produzir", vira um conteúdo no fluxo normal.
create table if not exists public.content_ideas (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  title        text not null,
  format       text,
  pillar       text,
  notes        text,
  status       text not null default 'Ideia', -- Ideia | Escolhida
  promoted_content_id uuid references public.contents(id) on delete set null,
  created_by   uuid references auth.users(id) on delete set null,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists content_ideas_client_idx
  on public.content_ideas (client_id);

alter table public.content_ideas enable row level security;
drop policy if exists "content_ideas_all" on public.content_ideas;
create policy "content_ideas_all" on public.content_ideas
  for all to authenticated using (true) with check (true);
