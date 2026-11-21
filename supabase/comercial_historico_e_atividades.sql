-- -------------------------------------------------------------
-- O comercial ganha MEMÓRIA e AGENDA
--
-- Vem do raio-X do Zoho CRM que a Vitória fez. Duas lições de lá:
--
--   "Datas gravadas desde o primeiro dia. Data de criação, data de
--    cada mudança de etapa e última atividade são o que permite
--    calcular tempo de ciclo e conversão depois."
--
--   "Atividade é tudo o que alguém precisa fazer com um cliente, e
--    toda atividade fica presa a um registro. O que não pode faltar é
--    o vínculo com o cliente e o alerta de atraso."
--
-- O sistema guardava só `stage_changed_at`: QUANDO entrou na etapa de
-- agora. Tudo antes disso era jogado fora a cada movimento, então não
-- havia como responder "quanto tempo leva do primeiro contato ao
-- sim?" — que é a conta que diz se o comercial está melhorando.
-- -------------------------------------------------------------

-- 1. HISTÓRICO DE ETAPAS -------------------------------------------
create table if not exists public.commercial_stage_history (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.commercial_leads(id) on delete cascade,
  -- Nula na primeira linha: a oportunidade nasceu nesta etapa.
  de          lead_stage,
  para        lead_stage not null,
  em          timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

comment on table public.commercial_stage_history is
  'Cada mudança de etapa de uma oportunidade, com data. É o que permite medir tempo de ciclo.';

create index if not exists idx_stage_history_lead
  on public.commercial_stage_history (lead_id, em);

-- O gatilho que já marcava `stage_changed_at` passa a gravar a linha.
create or replace function public.marcar_mudanca_etapa()
returns trigger
language plpgsql
as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_changed_at = now();
    insert into public.commercial_stage_history (lead_id, de, para, em)
    values (new.id, old.stage, new.stage, now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_leads_stage_changed on public.commercial_leads;
create trigger trg_leads_stage_changed
  before update on public.commercial_leads
  for each row execute function public.marcar_mudanca_etapa();

-- E a primeira linha, de quando a oportunidade nasce.
create or replace function public.nascer_na_etapa()
returns trigger
language plpgsql
as $$
begin
  insert into public.commercial_stage_history (lead_id, de, para, em)
  values (new.id, null, new.stage, coalesce(new.created_at, now()));
  return new;
end;
$$;

drop trigger if exists trg_leads_nasceu on public.commercial_leads;
create trigger trg_leads_nasceu
  after insert on public.commercial_leads
  for each row execute function public.nascer_na_etapa();

-- As oportunidades que já existiam ganham a linha de nascimento, para
-- a linha do tempo não começar no vazio. Só quem ainda não tem.
insert into public.commercial_stage_history (lead_id, de, para, em)
select l.id, null, l.stage, coalesce(l.created_at, now())
  from public.commercial_leads l
 where not exists (
   select 1 from public.commercial_stage_history h where h.lead_id = l.id
 );

-- 2. ATIVIDADES ----------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'activity_kind') then
    create type activity_kind as enum (
      'Tarefa',
      'Reunião',
      'Ligação',
      'WhatsApp'
    );
  end if;
end
$$;

create table if not exists public.commercial_activities (
  id           uuid primary key default gen_random_uuid(),
  kind         activity_kind not null default 'Tarefa',
  subject      text not null,
  -- A atividade se prende a uma oportunidade OU a um cliente. Uma das
  -- duas, nunca nenhuma: atividade solta não aparece em ficha nenhuma
  -- e vira lista de recado sem dono.
  lead_id      uuid references public.commercial_leads(id) on delete cascade,
  client_id    uuid references public.clients(id) on delete cascade,
  due_at       timestamptz,
  done_at      timestamptz,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint commercial_activities_tem_dono
    check (lead_id is not null or client_id is not null)
);

comment on table public.commercial_activities is
  'Tarefas, reuniões, ligações e WhatsApp presos a uma oportunidade ou a um cliente.';

create index if not exists idx_atividades_abertas
  on public.commercial_activities (due_at)
  where done_at is null;

create index if not exists idx_atividades_lead
  on public.commercial_activities (lead_id);

create index if not exists idx_atividades_cliente
  on public.commercial_activities (client_id);

drop trigger if exists trg_atividades_updated on public.commercial_activities;
create trigger trg_atividades_updated
  before update on public.commercial_activities
  for each row execute function public.set_updated_at();

-- 3. RLS, igual ao resto ------------------------------------------
alter table public.commercial_stage_history enable row level security;
alter table public.commercial_activities    enable row level security;

drop policy if exists "stage_history_all_authenticated" on public.commercial_stage_history;
create policy "stage_history_all_authenticated"
  on public.commercial_stage_history for all
  to authenticated using (true) with check (true);

drop policy if exists "atividades_all_authenticated" on public.commercial_activities;
create policy "atividades_all_authenticated"
  on public.commercial_activities for all
  to authenticated using (true) with check (true);
