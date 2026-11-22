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
--      Quente — veio pedindo ajuda: indicação, procurou a FAVIE,
--               pediu valores ou respondeu rápido querendo reunião.
--      Morno  — tem interesse, conversa, mas ainda não tem urgência
--               ou está comparando.
--      Frio   — a FAVIE foi atrás: social selling, lista, evento sem
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
--    chegar cliente que ficavam todos em "Outro" — e "Outro" não
--    responde em que canal vale gastar a próxima hora.
alter type lead_channel add value if not exists 'Instagram orgânico' after 'Tráfego pago';
alter type lead_channel add value if not exists 'Grupos e WhatsApp'  after 'Evento';
alter type lead_channel add value if not exists 'Visita presencial'  after 'Parceria';
