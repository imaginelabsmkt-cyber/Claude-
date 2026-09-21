-- =============================================================
-- Painel do cliente (acesso por link secreto, sem login)
--
-- Cada cliente pode ter um link exclusivo (/portal/<token>) onde acompanha,
-- de forma limpa, o que vai ser postado, o que está em produção e as demandas
-- da semana. O token é um segredo aleatório; regenerar o token revoga o link
-- antigo. portal_enabled liga/desliga o acesso.
--
-- Também cria a tabela de feedback do cliente (aprovar/comentar), usada na
-- etapa 2. Idempotente.
-- =============================================================

alter table public.clients
  add column if not exists portal_token   uuid,
  add column if not exists portal_enabled boolean not null default false;

create unique index if not exists clients_portal_token_key
  on public.clients (portal_token)
  where portal_token is not null;

comment on column public.clients.portal_token is
  'Token secreto do link do painel do cliente (/portal/<token>). Nulo = sem link gerado.';
comment on column public.clients.portal_enabled is
  'Se o painel do cliente está ativo (link acessível).';

-- Feedback do cliente sobre um conteúdo (aprovar / pedir ajuste / comentar).
create table if not exists public.content_feedback (
  id          uuid primary key default gen_random_uuid(),
  content_id  uuid not null references public.contents (id) on delete cascade,
  client_id   uuid not null references public.clients (id) on delete cascade,
  decision    text,          -- 'aprovado' | 'ajuste' | null (só comentário)
  message     text,
  created_at  timestamptz not null default now()
);

create index if not exists content_feedback_content_idx
  on public.content_feedback (content_id);
create index if not exists content_feedback_client_idx
  on public.content_feedback (client_id);

alter table public.content_feedback enable row level security;
-- Escrita/leitura pelo servidor via service role (o portal não usa sessão).
-- A política autenticada cobre o time dentro do sistema.
drop policy if exists "content_feedback_all" on public.content_feedback;
create policy "content_feedback_all" on public.content_feedback
  for all to authenticated using (true) with check (true);
