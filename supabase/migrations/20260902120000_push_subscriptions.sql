-- Inscrições de notificação push (Web Push) por dispositivo/navegador.
-- Cada usuário pode ter várias (celular, desktop…). Idempotente.
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  subscription jsonb not null,     -- objeto PushSubscription completo (keys etc.)
  user_agent  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Mesma política do restante do sistema (equipe pequena, tudo autenticado).
drop policy if exists "push_subscriptions_all" on public.push_subscriptions;
create policy "push_subscriptions_all" on public.push_subscriptions
  for all to authenticated using (true) with check (true);
