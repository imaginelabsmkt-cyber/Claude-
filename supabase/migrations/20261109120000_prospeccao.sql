-- =============================================================
-- Prospecção — de onde vem cada oportunidade
--
-- A Vitória trabalha a captação por CANAL (social selling,
-- indicação, eventos, parcerias). Até aqui o funil sabia em que
-- etapa cada oportunidade está, mas não de onde ela veio — então
-- não dava para responder a única pergunta que decide onde investir
-- tempo: "qual canal realmente vira cliente?".
--
-- Uma coluna resolve. Nada de tabela nova: canal é um atributo da
-- oportunidade, não uma entidade.
--
-- Idempotente.
-- =============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_channel') then
    create type lead_channel as enum (
      'Social selling',
      'Indicação',
      'Evento',
      'Parceria',
      'Outro'
    );
  end if;
end
$$;

alter table public.commercial_leads
  add column if not exists channel lead_channel not null default 'Outro';

comment on column public.commercial_leads.channel is
  'Canal de prospecção de onde a oportunidade veio.';

-- A consulta da tela de prospecção parte sempre de (canal, etapa).
create index if not exists idx_commercial_leads_channel
  on public.commercial_leads (channel, stage);

-- -------------------------------------------------------------
-- 2. Até onde a oportunidade chegou
--
-- O funil precisa responder "de 40 contatos, quantos chegaram à
-- proposta?". Só com a etapa ATUAL isso é impossível: uma
-- oportunidade perdida na negociação vira "Perdido" e some do funil
-- inteiro, como se nunca tivesse passado por lugar nenhum. O funil
-- ficaria otimista justamente onde dói.
--
-- `max_stage` guarda a etapa mais avançada já alcançada. O gatilho
-- que já existia (marcar_mudanca_etapa) passa a mantê-la: ela só
-- anda para a frente, nunca para trás.
--
-- 'Fechado' e 'Perdido' não são "mais avançados" que 'Negociação'
-- para este fim — são as saídas. Fechado avança (é o fim bom do
-- funil); Perdido não mexe, preservando o último degrau real.
-- -------------------------------------------------------------
alter table public.commercial_leads
  add column if not exists max_stage lead_stage not null default 'Contato feito';

comment on column public.commercial_leads.max_stage is
  'Etapa mais avançada já alcançada. Só avança. Alimenta o funil acumulado.';

create or replace function public.posicao_da_etapa(e lead_stage)
returns int
language sql
immutable
as $$
  select case e
    when 'Contato feito'    then 1
    when 'Diagnóstico'      then 2
    when 'Proposta enviada' then 3
    when 'Negociação'       then 4
    when 'Fechado'          then 5
    else 0                                  -- Perdido: não é degrau
  end;
$$;

create or replace function public.marcar_mudanca_etapa()
returns trigger
language plpgsql
as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_changed_at = now();
  end if;

  -- max_stage só anda para a frente.
  if public.posicao_da_etapa(new.stage)
     > public.posicao_da_etapa(new.max_stage) then
    new.max_stage = new.stage;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_leads_stage_changed on public.commercial_leads;
create trigger trg_leads_stage_changed
  before update on public.commercial_leads
  for each row execute function public.marcar_mudanca_etapa();

-- Na inserção, a etapa inicial já é a máxima.
create or replace function public.definir_etapa_maxima_inicial()
returns trigger
language plpgsql
as $$
begin
  if public.posicao_da_etapa(new.stage) > 0 then
    new.max_stage = new.stage;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_leads_max_stage_insert on public.commercial_leads;
create trigger trg_leads_max_stage_insert
  before insert on public.commercial_leads
  for each row execute function public.definir_etapa_maxima_inicial();

-- Para as oportunidades que já existem: a etapa atual é o que se sabe.
update public.commercial_leads
   set max_stage = stage
 where public.posicao_da_etapa(stage) > public.posicao_da_etapa(max_stage);

-- -------------------------------------------------------------
-- 3. Aproveita o que já estava escrito em `source`
--
-- Antes desta migration o único registro de origem era `source`, um
-- texto escolhido numa lista ("Indicação", "Instagram", "Evento"...).
-- Em vez de jogar fora, mapeia para o canal e deixa o texto original
-- no lugar — ele passa a ser o detalhe ("quem indicou", "qual
-- evento"), que o canal não guarda.
-- -------------------------------------------------------------
update public.commercial_leads
   set channel = case
         when source ilike 'indica%'                      then 'Indicação'
         when source ilike 'evento%'                      then 'Evento'
         when source ilike 'instagram%'
           or source ilike 'prospec%'                     then 'Social selling'
         when source ilike 'parceri%'                     then 'Parceria'
         else 'Outro'
       end::lead_channel
 where channel = 'Outro'
   and source is not null;
