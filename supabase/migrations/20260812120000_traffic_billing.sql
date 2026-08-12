-- =============================================================
-- Migration — Cobranças de Tráfego (Boletos/Pix + WhatsApp)
--
-- Objetivo: automatizar o envio semanal do Pix de tráfego de cada
-- cliente pelo WhatsApp, acompanhar quem pagou (marcação manual, pois o
-- pagamento cai direto no Facebook) e disparar lembretes automáticos
-- para quem não pagou.
--
-- Ordem: enum -> colunas em clients -> tabelas -> índices -> triggers ->
-- seed de settings -> RLS. Blocos DO/if not exists garantem reexecução
-- segura (idempotente), no mesmo padrão da migration inicial.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Tipo ENUM — status de uma cobrança
--    'Atrasado' NÃO é armazenado: é derivado (Enviado/Pendente vencido).
-- -------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'charge_status') then
    create type charge_status as enum (
      'Pendente',   -- criada, ainda não enviada ao cliente
      'Enviado',    -- Pix enviado no WhatsApp, aguardando pagamento
      'Pago',       -- pagamento confirmado (marcado manualmente)
      'Cancelado'   -- cobrança cancelada
    );
  end if;
end
$$;

-- -------------------------------------------------------------
-- 2. Colunas de cobrança de tráfego em clients
-- -------------------------------------------------------------
alter table public.clients
  add column if not exists whatsapp text,                 -- número do cliente (DDI+DDD+número)
  add column if not exists traffic_billing_active boolean not null default false,
  add column if not exists traffic_value numeric(10, 2),  -- valor fixo semanal do tráfego
  add column if not exists traffic_pix_code text;         -- código Pix copia-e-cola atual

comment on column public.clients.whatsapp is 'WhatsApp do cliente (apenas dígitos, com DDI 55).';
comment on column public.clients.traffic_billing_active is 'Se o cliente entra na cobrança semanal de tráfego.';
comment on column public.clients.traffic_value is 'Valor fixo semanal do tráfego (R$).';
comment on column public.clients.traffic_pix_code is 'Código Pix copia-e-cola usado na cobrança do cliente.';

-- -------------------------------------------------------------
-- 3. Tabela traffic_charges — uma cobrança por cliente por semana
-- -------------------------------------------------------------
create table if not exists public.traffic_charges (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients (id) on delete cascade,

  reference_week   date not null,           -- segunda-feira de referência da semana
  amount           numeric(10, 2) not null, -- valor cobrado (snapshot do traffic_value)
  pix_code         text,                    -- Pix usado (snapshot)
  status           charge_status not null default 'Pendente',
  due_date         date,                    -- vencimento (base para atraso/lembrete)

  sent_at          timestamptz,             -- quando foi enviada no WhatsApp
  paid_at          timestamptz,             -- quando foi marcada como paga
  reminder_count   integer not null default 0,   -- quantos lembretes já foram enviados
  last_reminder_at timestamptz,             -- último lembrete enviado
  send_error       text,                    -- último erro de envio (se houver)

  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Evita duplicar a cobrança da mesma semana para o mesmo cliente.
  constraint uq_traffic_charge_client_week unique (client_id, reference_week)
);

comment on table public.traffic_charges is 'Cobranças semanais de tráfego enviadas por WhatsApp.';

-- -------------------------------------------------------------
-- 4. Tabela traffic_settings — configuração única (1 linha) do módulo
-- -------------------------------------------------------------
create table if not exists public.traffic_settings (
  id                 boolean primary key default true,  -- trava a tabela em 1 linha
  reminder_days      integer not null default 2,        -- dias após o vencimento p/ 1º lembrete
  reminder_interval  integer not null default 2,        -- dias entre lembretes seguintes
  reminder_max       integer not null default 3,        -- máximo de lembretes por cobrança
  due_offset_days    integer not null default 0,        -- vencimento = semana + N dias
  charge_template    text not null,                     -- modelo da mensagem de cobrança
  reminder_template  text not null,                     -- modelo da mensagem de lembrete
  updated_at         timestamptz not null default now(),
  constraint traffic_settings_singleton check (id = true)
);

comment on table public.traffic_settings is 'Configuração única do módulo de cobrança de tráfego.';

-- -------------------------------------------------------------
-- 5. Índices
-- -------------------------------------------------------------
create index if not exists idx_traffic_charges_client_id      on public.traffic_charges (client_id);
create index if not exists idx_traffic_charges_reference_week on public.traffic_charges (reference_week);
create index if not exists idx_traffic_charges_status         on public.traffic_charges (status);
create index if not exists idx_traffic_charges_due_date       on public.traffic_charges (due_date);
create index if not exists idx_clients_traffic_billing_active on public.clients (traffic_billing_active);

-- -------------------------------------------------------------
-- 6. Triggers de updated_at (reusa public.set_updated_at())
-- -------------------------------------------------------------
drop trigger if exists trg_traffic_charges_updated_at on public.traffic_charges;
create trigger trg_traffic_charges_updated_at
  before update on public.traffic_charges
  for each row execute function public.set_updated_at();

drop trigger if exists trg_traffic_settings_updated_at on public.traffic_settings;
create trigger trg_traffic_settings_updated_at
  before update on public.traffic_settings
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- 7. Seed da linha única de settings (com modelos padrão de mensagem)
--    Placeholders disponíveis: {cliente}, {valor}, {pix}, {semana}, {vencimento}
-- -------------------------------------------------------------
insert into public.traffic_settings (id, charge_template, reminder_template)
values (
  true,
  E'Olá, {cliente}! 👋\n\nSegue a cobrança do tráfego desta semana no valor de *{valor}*.\n\nPix copia e cola:\n{pix}\n\nQualquer dúvida, é só chamar. Obrigado! 🙏',
  E'Oi, {cliente}! Passando para lembrar da cobrança do tráfego ({valor}) que ainda está em aberto.\n\nPix copia e cola:\n{pix}\n\nAssim que possível, me avisa quando pagar. Obrigado! 🙏'
)
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- 8. Row Level Security — mesmo padrão do MVP: authenticated pode tudo
-- -------------------------------------------------------------
alter table public.traffic_charges  enable row level security;
alter table public.traffic_settings enable row level security;

drop policy if exists "traffic_charges_all_authenticated" on public.traffic_charges;
create policy "traffic_charges_all_authenticated"
  on public.traffic_charges for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "traffic_settings_all_authenticated" on public.traffic_settings;
create policy "traffic_settings_all_authenticated"
  on public.traffic_settings for all
  to authenticated
  using (true)
  with check (true);
