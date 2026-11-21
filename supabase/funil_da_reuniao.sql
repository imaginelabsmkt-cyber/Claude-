-- -------------------------------------------------------------
-- O funil como a agência vende de verdade
--
-- A Fran: "não faz sentido a gente ter um diagnóstico e proposta e
-- não ter a reunião marcada, porque a gente não envia a proposta, a
-- gente já apresenta a proposta na primeira reunião. O diagnóstico a
-- gente faz justamente antes de encontrar o cliente."
--
-- Então o funil era este, e estava errado no meio:
--
--   Contato feito -> Diagnóstico -> Proposta ENVIADA -> Negociação
--
-- e passa a ser:
--
--   Contato feito -> Diagnóstico -> Reunião marcada
--                 -> Proposta APRESENTADA -> Negociação -> Fechado
--
-- "Reunião marcada" é o degrau que faltava: dá para ver quem tem
-- reunião combinada que ainda não aconteceu, separado de quem já viu
-- a proposta. E "enviada" sai do vocabulário: a proposta é
-- apresentada na reunião, não mandada depois.
--
-- Também entra "Tráfego pago" na lista de canais — faltava, e é por
-- onde parte dos clientes chega.
--
-- NADA SE PERDE: as oportunidades que estavam em "Proposta enviada"
-- continuam onde estavam, com o nome novo (é renomear o valor do
-- enum, não trocar de valor).
-- -------------------------------------------------------------

-- 1. O degrau novo, no lugar certo da ordem.
alter type lead_stage add value if not exists 'Reunião marcada'
  before 'Proposta enviada';

-- 2. "Proposta enviada" vira "Proposta apresentada".
--    `rename value` não é idempotente, então pergunta antes.
do $$
begin
  if exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
     where t.typname = 'lead_stage' and e.enumlabel = 'Proposta enviada'
  ) then
    alter type lead_stage rename value 'Proposta enviada' to 'Proposta apresentada';
  end if;
end
$$;

-- 3. A proposta também não é mais "Enviada": é "Apresentada".
do $$
begin
  if exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
     where t.typname = 'proposal_status' and e.enumlabel = 'Enviada'
  ) then
    alter type proposal_status rename value 'Enviada' to 'Apresentada';
  end if;
end
$$;

-- 4. O canal que faltava.
alter type lead_channel add value if not exists 'Tráfego pago' after 'Social selling';

-- 5. A posição de cada etapa, com o degrau novo.
--
--    Compara `e::text`, e não o literal do enum, de propósito: um
--    valor recém-criado por `add value` não pode ser resolvido como
--    literal na mesma transação, e o SQL Editor do Supabase roda
--    tudo numa transação só. Em texto, funciona na primeira passada.
create or replace function public.posicao_da_etapa(e lead_stage)
returns int
language sql
immutable
as $$
  select case e::text
    when 'Contato feito'        then 1
    when 'Diagnóstico'          then 2
    when 'Reunião marcada'      then 3
    when 'Proposta apresentada' then 4
    when 'Negociação'           then 5
    when 'Fechado'              then 6
    else 0                                  -- Perdido: não é degrau
  end;
$$;
