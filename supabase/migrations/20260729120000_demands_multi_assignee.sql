-- Demandas: passa de UMA responsável (assignee_id) para VÁRIAS (assignee_ids).
-- Idempotente: seguro rodar mesmo que a tabela ainda não exista ou já esteja
-- no formato novo.

-- 1) Garante a coluna nova (lista de responsáveis).
alter table public.demands
  add column if not exists assignee_ids uuid[] not null default '{}';

-- 2) Se ainda existir a coluna antiga (assignee_id), leva o valor para a lista
--    e remove a coluna antiga.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'demands'
      and column_name = 'assignee_id'
  ) then
    update public.demands
      set assignee_ids = array[assignee_id]
      where assignee_id is not null
        and (assignee_ids is null or assignee_ids = '{}');
    alter table public.demands drop column assignee_id;
  end if;
end $$;

create index if not exists idx_demands_assignees
  on public.demands using gin (assignee_ids);
