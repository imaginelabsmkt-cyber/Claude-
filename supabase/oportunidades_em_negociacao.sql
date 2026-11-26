-- =============================================================
-- As quatro oportunidades que estão em negociação
--
-- Da planilha da Fran, aba Clientes, bloco "Em negociação no
-- Comercial". Elas existiam só lá, e por isso o bloco "De onde vêm
-- os clientes novos" das Metas aparecia vazio.
--
-- NENHUMA ENTRA COMO FECHADA, e isso é decisão, não descuido.
--
-- Duas delas estão com "contrato pronto". Pronto não é assinado: no
-- sistema, mover para Fechado cria o cliente no Administrativo E a
-- mensalidade no Financeiro. Marcar as duas aqui somaria R$ 4.000
-- por mês de receita que ainda não foi contratada, e o financeiro
-- passaria a mentir sem ninguém ter digitado nada.
--
-- Quando fechar de verdade, a Fran move no funil e o sistema cria o
-- cliente e a cobrança na hora certa.
--
-- A ORIGEM DE TODAS FICOU "Outro", porque a planilha não diz de onde
-- cada uma veio e eu não invento. Está escrito na observação de cada
-- uma: sem a origem, o Painel de canais não consegue dizer onde vale
-- gastar a próxima hora.
--
-- A TEMPERATURA só entra onde a situação prova. "Contrato pronto" é
-- quente sem discussão. Nas outras duas fica em branco, e a tela
-- mostra um traço até alguém preencher.
--
-- Idempotente: casa pelo nome.
-- =============================================================

insert into public.commercial_leads
  (name, channel, stage, max_stage, estimated_monthly, temperature,
   next_contact_on, notes, created_at)
select * from (values
  (
    'Dra. Ana Gessyca',
    'Outro'::lead_channel,
    'Negociação'::lead_stage,
    'Negociação'::lead_stage,
    2000.00::numeric,
    'Quente'::lead_temperature,
    date '2026-12-05',
    'Contrato pronto, 1º pagamento combinado para 05/12. 4 vídeos por mês. Confirmar a origem: hoje está como Outro.',
    timestamptz '2026-11-01 12:00:00-04'
  ),
  (
    'Vértice Arquitetura',
    'Outro'::lead_channel,
    'Negociação'::lead_stage,
    'Negociação'::lead_stage,
    2000.00::numeric,
    'Quente'::lead_temperature,
    null::date,
    'Contrato pronto. Passa a R$ 2.500 em março/27, lembrar de reajustar o contrato quando fechar. 4 vídeos por mês. Confirmar a origem: hoje está como Outro.',
    timestamptz '2026-11-01 12:00:00-04'
  ),
  (
    'Dra. Bruna Arantes',
    'Outro'::lead_channel,
    'Primeiro contato'::lead_stage,
    'Primeiro contato'::lead_stage,
    2000.00::numeric,
    null::lead_temperature,
    null::date,
    'Vídeos estimados em 4 por mês. Confirmar a origem e a temperatura.',
    timestamptz '2026-11-15 12:00:00-04'
  ),
  (
    'Rafaela Nutricionista',
    'Outro'::lead_channel,
    'Negociação'::lead_stage,
    'Negociação'::lead_stage,
    2000.00::numeric,
    null::lead_temperature,
    null::date,
    'Vídeos estimados em 4 por mês. Confirmar a origem e a temperatura.',
    timestamptz '2026-11-10 12:00:00-04'
  )
) as t(name, channel, stage, max_stage, estimated_monthly, temperature,
       next_contact_on, notes, created_at)
where not exists (
  select 1 from public.commercial_leads l
   where lower(btrim(l.name)) = lower(btrim(t.name))
);
