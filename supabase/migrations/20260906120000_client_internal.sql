-- Cliente "interno": a própria agência (favie). Usa todo o fluxo de conteúdo,
-- mas fica separado dos clientes reais (não conta nas métricas de cliente e não
-- aparece na lista de Clientes — vive em "Nosso conteúdo"). Idempotente.
alter table public.clients
  add column if not exists is_internal boolean not null default false;
