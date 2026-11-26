-- -------------------------------------------------------------
-- O comercial do protótipo da Vitória
--
-- Ela montou um comercial inteiro funcionando (telas Hoje, Funil,
-- Leads e clientes, Painel de canais e Como funciona) e a Fran mandou
-- o link. O que entra aqui é o que o nosso não tinha e não briga com
-- o que já existe.
--
-- O FUNIL NÃO MUDA. O protótipo tem sete etapas abertas; o nosso tem
-- cinco, escolhidas pela Fran anteontem. Mexer nisso pela terceira vez
-- em três dias, sem ela pedir, é o que ela já me chamou atenção:
-- "mudou um negócio que eu nem falei pra tu mudar".
-- -------------------------------------------------------------

-- 1. TEMPERATURA ---------------------------------------------------
--
--    Direto das definições que ela escreveu:
--      Quente, veio pedindo ajuda: indicação, procurou a FAVIE,
--               pediu valores ou respondeu rápido querendo reunião.
--      Morno, tem interesse, conversa, mas ainda não tem urgência
--               ou está comparando.
--      Frio , a FAVIE foi atrás: social selling, lista, evento sem
--               conversa longa. Ainda não demonstrou interesse.
--
--    É a informação que diz ONDE GASTAR A PRÓXIMA HORA, e o sistema
--    não tinha nada parecido: dois leads de R$ 2.500 pareciam iguais.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_temperature') then
    create type lead_temperature as enum ('Quente', 'Morno', 'Frio');
  end if;
end
$$;

alter table public.commercial_leads
  add column if not exists temperature lead_temperature;

comment on column public.commercial_leads.temperature is
  'Quente: veio pedindo ajuda. Morno: interesse sem urgência. Frio: a agência foi atrás.';

-- 2. AS ORIGENS QUE FALTAVAM ---------------------------------------
--
--    O protótipo tem nove; o nosso tinha seis. Instagram orgânico,
--    grupos de WhatsApp e visita presencial são três jeitos de
--    chegar cliente que ficavam todos em "Outro", e "Outro" não
--    responde em que canal vale gastar a próxima hora.
alter type lead_channel add value if not exists 'Instagram orgânico' after 'Tráfego pago';
alter type lead_channel add value if not exists 'Grupos e WhatsApp'  after 'Evento';
alter type lead_channel add value if not exists 'Visita presencial'  after 'Parceria';

-- 3. AS ETAPAS DO PROTÓTIPO ----------------------------------------
--
--    O protótipo da Vitória tem sete etapas abertas; o nosso tinha
--    cinco. A diferença que importa é o começo: "Novo lead" (chegou e
--    ninguém falou com ele), "Primeiro contato" (mensagem enviada,
--    esperando resposta) e "Em conversa" (respondeu, mas ainda não
--    marcou reunião) eram tudo uma coisa só aqui, e são três
--    situações com ações completamente diferentes.
--
--    MAS NÃO É CÓPIA. Copiar ao pé da letra desfaria duas correções
--    que a Fran deu em voz alta:
--
--      "A gente não envia a proposta, a gente já apresenta na
--       primeira reunião."     -> continua "Proposta apresentada",
--                                 e não "Proposta enviada" como no
--                                 protótipo.
--
--      "O diagnóstico a gente faz justamente antes de encontrar o
--       cliente."              -> "Diagnóstico" fica, embora o
--                                 protótipo não tenha a etapa.
--
--    E "Reunião feita" do protótipo não entra: na reunião a proposta
--    é apresentada, então as duas são o mesmo momento. Ficam sete
--    etapas abertas, o mesmo número do protótipo.
--
--        Novo lead -> Primeiro contato -> Em conversa -> Diagnóstico
--        -> Reunião marcada -> Proposta apresentada -> Negociação
--        -> Fechado / Perdido

-- "Contato feito" vira "Primeiro contato": é a mesma coisa, com o
-- nome que diz o que está acontecendo (esperando resposta).
do $$
begin
  if exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
     where t.typname = 'lead_stage' and e.enumlabel = 'Contato feito'
  ) then
    alter type lead_stage rename value 'Contato feito' to 'Primeiro contato';
  end if;
end
$$;

alter type lead_stage add value if not exists 'Novo lead'   before 'Primeiro contato';
alter type lead_stage add value if not exists 'Em conversa' after  'Primeiro contato';

-- A posição de cada etapa, de novo. Compara `e::text` pelo mesmo
-- motivo de sempre: valor recém-criado não pode ser resolvido como
-- literal na mesma transação, e o SQL Editor roda tudo numa só.
create or replace function public.posicao_da_etapa(e lead_stage)
returns int
language sql
immutable
as $$
  select case e::text
    when 'Novo lead'            then 1
    when 'Primeiro contato'     then 2
    when 'Em conversa'          then 3
    when 'Diagnóstico'          then 4
    when 'Reunião marcada'      then 5
    when 'Proposta apresentada' then 6
    when 'Negociação'           then 7
    when 'Fechado'              then 8
    else 0                                  -- Perdido: não é degrau
  end;
$$;

-- 4. PRÓXIMO CONTATO -----------------------------------------------
--
--    É o motor da tela "Hoje" do protótipo: toda etapa aberta tem uma
--    data de próximo contato, e quem passou da data aparece em
--    vermelho. O nosso tinha só o "parado há N dias", que é alarme
--    DEPOIS do fato, não existia o compromisso marcado.
alter table public.commercial_leads
  add column if not exists next_contact_on date;

comment on column public.commercial_leads.next_contact_on is
  'Quando falar com este lead de novo. Sugerido pela etapa ao mover.';

create index if not exists idx_leads_proximo_contato
  on public.commercial_leads (next_contact_on)
  where stage not in ('Fechado', 'Perdido');

-- Quem já está no funil e nunca teve data ganha uma, pela etapa:
-- sem isso a fila nasce vazia e a tela não prova que funciona.
update public.commercial_leads
   set next_contact_on = (current_date + case stage::text
         when 'Novo lead'            then 0
         when 'Primeiro contato'     then 1
         when 'Em conversa'          then 2
         when 'Diagnóstico'          then 3
         when 'Reunião marcada'      then 0
         when 'Proposta apresentada' then 2
         when 'Negociação'           then 3
         else 0 end)
 where next_contact_on is null
   and stage not in ('Fechado', 'Perdido');

-- O PADRÃO DA COLUNA NÃO MUDA AQUI, de propósito.
--
-- `alter column stage set default 'Novo lead'` usa o valor recém
-- criado como literal, e o Postgres recusa isso na mesma transação:
--
--     ERROR: unsafe use of new value "Novo lead" of enum type
--
-- O SQL Editor do Supabase roda o arquivo inteiro numa transação só,
-- então o arquivo quebraria na cara dela, foi o que aconteceu no meu
-- teste, e é o mesmo erro que já quebrou uma vez. O padrão só vale
-- para quem insere direto no banco; o sistema sempre manda a etapa, e
-- a instalação do zero já nasce com o padrão certo.

-- 5. MOTIVO DA PERDA EM LISTA --------------------------------------
--
--    Era texto livre, e eu normalizava na hora de somar, tirando
--    acento, ponto final e maiúscula, para "Achou caro", "achou
--    caro" e "achou caro." virarem o mesmo motivo. Funciona até
--    alguém escrever "preço alto", e aí a conta mente.
--
--    A lista é a do protótipo. Continua existindo o texto livre, na
--    observação, para o caso que não cabe em nenhuma delas.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lost_reason_kind') then
    create type lost_reason_kind as enum (
      'Sem resposta',
      'Achou caro',
      'Fechou com outra agência',
      'Não é o momento',
      'Fora do perfil',
      'Outro'
    );
  end if;
end
$$;

alter table public.commercial_leads
  add column if not exists lost_reason_kind lost_reason_kind;

comment on column public.commercial_leads.lost_reason_kind is
  'O motivo da perda, da lista. O texto livre fica em lost_reason.';

-- O que já estava escrito à mão entra na lista onde dá para ter
-- certeza. O que não casar fica sem categoria e com o texto
-- preservado, chutar a categoria de uma perda é pior do que não ter.
update public.commercial_leads
   set lost_reason_kind = case
         when lost_reason ilike '%sem resposta%'  then 'Sem resposta'
         when lost_reason ilike '%sumiu%'         then 'Sem resposta'
         when lost_reason ilike '%caro%'          then 'Achou caro'
         when lost_reason ilike '%preç%'          then 'Achou caro'
         when lost_reason ilike '%concorren%'     then 'Fechou com outra agência'
         when lost_reason ilike '%outra agência%' then 'Fechou com outra agência'
         when lost_reason ilike '%momento%'       then 'Não é o momento'
         when lost_reason ilike '%perfil%'        then 'Fora do perfil'
       end::lost_reason_kind
 where stage = 'Perdido'
   and lost_reason_kind is null
   and lost_reason is not null;

-- 6. INVESTIMENTO POR CANAL ----------------------------------------
--
--    A maior falta do nosso Painel de canais: ele dizia quantos
--    fecharam por canal, e NÃO quanto cada canal custou. Sem o custo,
--    "indicação converte 50%" e "tráfego converte 8%" parecem a
--    mesma informação, quando um é de graça e o outro consome
--    R$ 500 por mês.
--
--    O protótipo da Vitória lança o gasto por mês e por origem, e
--    calcula custo por cliente (investido ÷ fechados) e retorno em
--    12 meses (receita mensal × 12 ÷ investido).
create table if not exists public.commercial_investments (
  id          uuid primary key default gen_random_uuid(),
  -- Competência, "YYYY-MM", como no resto do sistema.
  mes         text not null check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  channel     lead_channel not null,
  amount      numeric(12, 2) not null check (amount >= 0),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.commercial_investments is
  'Quanto foi investido em cada canal, por mês: tráfego, ingresso de evento, comissão de parceiro, bônus de indicação.';

create index if not exists idx_investimentos_mes
  on public.commercial_investments (mes, channel);

drop trigger if exists trg_investimentos_updated on public.commercial_investments;
create trigger trg_investimentos_updated
  before update on public.commercial_investments
  for each row execute function public.set_updated_at();

alter table public.commercial_investments enable row level security;

drop policy if exists "investimentos_all_authenticated" on public.commercial_investments;
create policy "investimentos_all_authenticated"
  on public.commercial_investments for all
  to authenticated using (true) with check (true);
