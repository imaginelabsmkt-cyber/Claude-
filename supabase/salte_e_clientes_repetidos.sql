-- -------------------------------------------------------------
-- A Salte entra pelo funil, e cliente repetido sai da relação
--
-- A Fran: "o Salte está aparecendo duas vezes no administrativo, e
-- ele só pode aparecer depois que ele sai de prospecção como
-- fechado". E, depois: "o Salte a gente já fechou".
--
-- DUAS COISAS, nessa ordem.
--
-- 1. CLIENTE REPETIDO. A relação de clientes mostra uma linha por
--    registro. Se o mesmo nome entrou duas vezes — e entrou, porque a
--    Salte foi inserida direto da planilha de novembro, por nome, em
--    mais de uma passada — a relação mostra o nome duas vezes, e não
--    há tela que resolva isso: é dado duplicado.
--
--    A limpeza é CONSERVADORA de propósito: só apaga a cópia que não
--    tem NADA apontando para ela, em nenhuma das onze tabelas que
--    referenciam cliente. Uma cópia com lançamento, conteúdo ou
--    contrato atrás não é lixo, é fusão de cadastro — e fusão a gente
--    não faz calado.
--
-- 2. A SALTE NO FUNIL. Ela virou cliente sem passar pelo comercial,
--    então não existe a oportunidade que a originou: o histórico
--    começa no meio. Aqui ela entra como oportunidade GANHA, ligada
--    ao cliente que já existe, com a data do contrato (novembro). A
--    partir de agora a regra dela vale: cliente nasce de um ganho no
--    funil.
-- -------------------------------------------------------------

-- 1. A cópia órfã de qualquer cliente repetido por nome.
delete from public.clients c
 where exists (
   select 1 from public.clients outro
    where outro.name = c.name
      and outro.created_at < c.created_at
 )
   and not exists (select 1 from public.financial_entries      x where x.client_id = c.id)
   and not exists (select 1 from public.financial_recurrences  x where x.client_id = c.id)
   and not exists (select 1 from public.client_contracts       x where x.client_id = c.id)
   and not exists (select 1 from public.client_files           x where x.client_id = c.id)
   and not exists (select 1 from public.client_reports         x where x.client_id = c.id)
   and not exists (select 1 from public.client_diagnostics     x where x.client_id = c.id)
   and not exists (select 1 from public.client_onboarding      x where x.client_id = c.id)
   and not exists (select 1 from public.contents               x where x.client_id = c.id)
   and not exists (select 1 from public.plannings              x where x.client_id = c.id)
   and not exists (select 1 from public.commercial_leads       x where x.client_id = c.id)
   and not exists (select 1 from public.commercial_activities  x where x.client_id = c.id);

-- 2. A oportunidade da Salte, já ganha, ligada ao cliente.
do $$
declare
  id_salte uuid;
begin
  select id into id_salte from public.clients where name = 'Salte' limit 1;
  if id_salte is null then
    return;  -- sem cliente Salte, não há o que registrar
  end if;

  if exists (select 1 from public.commercial_leads where client_id = id_salte) then
    return;  -- já tem a oportunidade dela
  end if;

  insert into public.commercial_leads
    (name, channel, stage, max_stage, estimated_monthly, client_id, created_at)
  values
    ('Salte', 'Indicação', 'Fechado', 'Fechado', 1300.00, id_salte, '2026-11-01');
end
$$;
