-- =============================================================
-- DETALHAR OS FIXOS: uma linha por ferramenta, como na planilha
--
-- O QUE ESTE ARQUIVO FAZ
--
-- O sistema tinha duas linhas que escondiam tudo:
--
--     Assinaturas e ferramentas     R$ 1.026,37
--     Pró-labore das sócias         R$ 13.000,00
--
-- Com elas não dava para responder "quanto custa o Canva?" nem
-- "quanto cada sócia tira?". A planilha da Fran já responde: ela
-- lista cada ferramenta embaixo de "↳ Assinaturas e ferramentas
-- digitais", e separa o pró-labore de cada uma.
--
-- Este arquivo traz os valores de NOVEMBRO/2026 da planilha e
-- substitui as duas linhas-bloco pelas linhas de verdade.
--
-- O total muda de R$ 14.272,32 para R$ 14.186,55 por mês, que é
-- exatamente o TOTAL DESPESAS da aba Novembro. O valor antigo era o
-- de outubro; o Claude Max caiu de R$ 612,77 para R$ 454,10 e o
-- Canva subiu de R$ 32,00 para R$ 53,00.
--
-- COMO RODAR
--
--   Supabase > SQL Editor > New query > colar tudo > Run.
--
-- Pode rodar quantas vezes quiser: cada linha só é criada se ainda
-- não existir, e as linhas-bloco só são removidas se existirem.
-- Os lançamentos já gerados nos meses passados NÃO são tocados.
-- =============================================================

do $$
declare
  cat_ferramentas uuid;
  cat_prolabore   uuid;
  item            record;
begin
  select id into cat_ferramentas
    from public.financial_categories
   where kind = 'Despesa' and name = 'Assinaturas e ferramentas digitais';

  select id into cat_prolabore
    from public.financial_categories
   where kind = 'Despesa' and name = 'Pró-labore (sócias)';

  -- 1. Uma linha por ferramenta (valores de novembro/2026).
  if cat_ferramentas is not null then
    for item in
      select *
        from (values
          ('Claude Max',     454.10),
          ('ChatGPT Plus',   119.90),
          ('Adobe',           95.00),
          ('iCloud Fran',     66.90),
          ('iCloud Vitória',  66.90),
          ('Canva',           53.00),
          ('Captions',        51.90),
          ('CapCut',          32.90)
        ) as t(descricao, valor)
    loop
      insert into public.financial_recurrences
        (description, kind, category_id, amount, due_day, start_month, active)
      select item.descricao, 'Despesa', cat_ferramentas, item.valor, 10, '2026-11', true
       where not exists (
         select 1 from public.financial_recurrences
          where description = item.descricao
            and category_id = cat_ferramentas
       );
    end loop;

    -- A linha-bloco sai de cena. Os lançamentos que ela já gerou
    -- continuam no fluxo de caixa: a ligação é "on delete set null".
    delete from public.financial_recurrences
     where description = 'Assinaturas e ferramentas'
       and category_id = cat_ferramentas;
  end if;

  -- 2. Pró-labore separado por sócia, como na planilha.
  if cat_prolabore is not null then
    for item in
      select *
        from (values
          ('Pró-labore Fran',    6500.00),
          ('Pró-labore Vitória', 6500.00)
        ) as t(descricao, valor)
    loop
      insert into public.financial_recurrences
        (description, kind, category_id, amount, due_day, start_month, active)
      select item.descricao, 'Despesa', cat_prolabore, item.valor, 5, '2026-11', true
       where not exists (
         select 1 from public.financial_recurrences
          where description = item.descricao
            and category_id = cat_prolabore
       );
    end loop;

    delete from public.financial_recurrences
     where description = 'Pró-labore das sócias'
       and category_id = cat_prolabore;
  end if;
end $$;

-- Conferência: deve devolver R$ 14.186,55 em despesa fixa.
select
  sum(amount) filter (where kind = 'Despesa') as custo_fixo_mensal,
  sum(amount) filter (where kind = 'Receita') as receita_recorrente
  from public.financial_recurrences
 where active
   and start_month <= '2026-11'
   and (end_month is null or end_month >= '2026-11');
