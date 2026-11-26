-- =============================================================
-- A Salte e o Studio Salte são o mesmo estúdio
--
-- "O cliente Salte está duplicado com o Studio Salte (é o mesmo
--  estúdio)."
--
-- Passa tudo que está pendurado na "Salte" para o "Studio Salte" e
-- apaga a duplicata, o cliente e a oportunidade do comercial.
--
-- Roda quantas vezes quiser: na segunda não acha mais a duplicata e
-- não faz nada.
--
-- TRÊS TABELAS NÃO ACEITAM TRANSFERÊNCIA CEGA, e é por isso que este
-- arquivo é maior do que um `update`:
--
--   plannings          tem unique (client_id, reference_month)
--   client_onboarding  tem client_id como CHAVE PRIMÁRIA
--   client_contracts   um contrato por cliente, na prática
--
-- Em todas, se o destino já tiver a linha daquele mês, mandar a da
-- duplicata por cima estoura a restrição e o arquivo inteiro para no
-- meio. Então: transfere o que não colide, e o que colide fica para
-- trás e some junto com a duplicata, o destino já tem o dele.
-- =============================================================

do $$
declare
  v_origem  uuid;
  v_lead    uuid := 'b84764bb-66f2-479a-a6ee-f5526862a381';  -- oportunidade "Salte"
  v_destino uuid;
begin
  -- A duplicata é o cliente chamado "Salte", qualquer que seja o id.
  --
  -- Procurar pelo NOME, e não pelo id que a Fran mandou
  -- (54c73443-...), é o que faz este arquivo se curar sozinho: outro
  -- trecho do ATUALIZAR cria a Salte a partir da planilha de
  -- novembro, e se ele criar de novo, com id novo, este aqui junta
  -- de novo. Com o id fixo, a duplicata voltaria e ficaria.
  select id into v_origem
    from public.clients
   where lower(btrim(name)) = 'salte'
   order by created_at
   limit 1;

  if v_origem is null then
    raise notice 'Não há cliente "Salte" separado. Nada a fazer.';
    return;
  end if;

  select id into v_destino
    from public.clients
   where lower(btrim(name)) = 'studio salte'
     and id <> v_origem
   order by created_at
   limit 1;

  -- Se o "Studio Salte" não existir, não dá para transferir para
  -- lugar nenhum, e apagar perderia o histórico. Então a duplicata
  -- só muda de nome, e o resultado é o mesmo: um cliente só, com o
  -- nome certo.
  if v_destino is null then
    update public.clients set name = 'Studio Salte' where id = v_origem;
    raise notice 'Não havia "Studio Salte". A "Salte" foi renomeada.';
    return;
  end if;

  -- ---------------------------------------------------------
  -- 1. O dinheiro. É o que não pode se perder.
  -- ---------------------------------------------------------
  update public.financial_entries      set client_id = v_destino where client_id = v_origem;
  update public.financial_recurrences  set client_id = v_destino where client_id = v_origem;

  -- ---------------------------------------------------------
  -- 2. O trabalho.
  -- ---------------------------------------------------------
  update public.contents               set client_id = v_destino where client_id = v_origem;
  update public.client_files           set client_id = v_destino where client_id = v_origem;
  update public.client_reports         set client_id = v_destino where client_id = v_origem;
  update public.client_diagnostics     set client_id = v_destino where client_id = v_origem;
  update public.commercial_activities  set client_id = v_destino where client_id = v_origem;
  update public.commercial_leads       set client_id = v_destino where client_id = v_origem;

  -- ---------------------------------------------------------
  -- 3. As três que colidem. Transfere só o que falta no destino.
  -- ---------------------------------------------------------
  update public.plannings p
     set client_id = v_destino
   where p.client_id = v_origem
     and not exists (
       select 1 from public.plannings d
        where d.client_id = v_destino
          and d.reference_month = p.reference_month
     );

  update public.client_onboarding
     set client_id = v_destino
   where client_id = v_origem
     and not exists (
       select 1 from public.client_onboarding
        where client_id = v_destino
     );

  update public.client_contracts c
     set client_id = v_destino
   where c.client_id = v_origem
     and not exists (
       select 1 from public.client_contracts d where d.client_id = v_destino
     );

  -- ---------------------------------------------------------
  -- 4. A oportunidade duplicada do comercial.
  --
  -- O histórico de etapas e as atividades dela vão junto (o banco
  -- apaga em cascata). É o que foi pedido: "manter só o Studio
  -- Salte".
  -- ---------------------------------------------------------
  delete from public.commercial_leads where id = v_lead;

  -- ---------------------------------------------------------
  -- 5. A duplicata.
  --
  -- A esta altura não sobrou nada pendurado nela, menos as linhas
  -- que colidiam, e essas o destino já tinha.
  -- ---------------------------------------------------------
  delete from public.clients where id = v_origem;

  raise notice 'A "Salte" foi juntada ao "Studio Salte".';
end $$;
