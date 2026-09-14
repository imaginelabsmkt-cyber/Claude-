-- Demandas gerais: tarefas do time que NÃO são conteúdo (administrativo,
-- operacional, etc.). Compartilhadas entre as usuárias, como clients/contents.

create table if not exists public.demands (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  assignee_ids uuid[] not null default '{}', -- responsáveis (pode ser mais de uma)
  client_id    uuid references public.clients(id) on delete set null,
  due_date     date,
  status       text not null default 'A fazer', -- 'A fazer' | 'Fazendo' | 'Feita'
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.demands is 'Demandas gerais (tarefas fora do fluxo de conteúdo).';

create index if not exists idx_demands_status on public.demands (status);
create index if not exists idx_demands_assignees on public.demands using gin (assignee_ids);

alter table public.demands enable row level security;

drop policy if exists "demands_all_authenticated" on public.demands;
create policy "demands_all_authenticated"
  on public.demands for all
  to authenticated
  using (true)
  with check (true);

drop trigger if exists trg_demands_updated_at on public.demands;
create trigger trg_demands_updated_at
  before update on public.demands
  for each row execute function public.set_updated_at();
