-- =============================================================
-- Demandas internas: as tarefas que não são de ninguém de fora
--
-- A Fran: "eu queria adicionar um sistema de demandas também
-- administrativo: tarefas avulsas da empresa que não são de cliente
-- nem de lead."
--
-- POR QUE UMA TABELA NOVA, E NÃO UMA DAS QUE JÁ EXISTEM
--
--   commercial_activities  tem a trava `commercial_activities_tem_dono`,
--                          que obriga lead_id OU client_id. Uma tarefa
--                          da empresa não tem nenhum dos dois. Afrouxar
--                          a trava deixaria entrar atividade órfã de
--                          cliente por engano, que é justamente o que
--                          ela protege.
--
--   company_obligations    é prazo contábil que se repete (DAS, DEFIS),
--                          e mora na tela de Impostos. "Pesquisar cartão
--                          de crédito com milhas" não é obrigação e não
--                          se repete.
--
-- A ÁREA DÁ A COR. O valor casa com os ids de `lib/interno/areas.ts`,
-- então a demanda aparece na fila com a mesma tarja das outras linhas,
-- e dá para varrer a tela de olho sem ler de onde cada coisa vem.
--
-- RESPONSÁVEL NULO QUER DIZER "AS DUAS". Não é ausência de dado: é a
-- resposta mais comum numa empresa de duas sócias, e obrigar a
-- escolher uma faria escolher errado.
--
-- Idempotente.
-- =============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'company_task_area') then
    create type company_task_area as enum (
      'administrativo',
      'comercial',
      'financeiro'
    );
  end if;
end
$$;

create table if not exists public.company_tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (btrim(title) <> '' and length(title) <= 140),
  area        company_task_area not null default 'administrativo',
  -- Null = as duas.
  assigned_to uuid references public.profiles(id) on delete set null,
  due_date    date,
  notes       text,
  -- Quando foi concluída. Null = ainda aberta.
  done_at     timestamptz,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.company_tasks is
  'Demandas internas da empresa: tarefas que não são de cliente nem de lead.';
comment on column public.company_tasks.assigned_to is
  'Responsável. Null quer dizer "as duas", que é o caso mais comum.';
comment on column public.company_tasks.done_at is
  'Quando foi concluída. Null = aberta. Desfazer a conclusão é voltar para null.';

-- A fila lê por prazo, e separa aberta de concluída. O índice parcial
-- cobre as abertas, que são as que a tela busca a cada carregamento.
create index if not exists idx_company_tasks_abertas
  on public.company_tasks (due_date)
  where done_at is null;
create index if not exists idx_company_tasks_done
  on public.company_tasks (done_at desc)
  where done_at is not null;

drop trigger if exists trg_company_tasks_updated_at on public.company_tasks;
create trigger trg_company_tasks_updated_at
  before update on public.company_tasks
  for each row execute function public.set_updated_at();

-- Dado da empresa: as duas sócias veem o mesmo, desde que liberadas.
alter table public.company_tasks enable row level security;

drop policy if exists "company_tasks_liberado" on public.company_tasks;
create policy "company_tasks_liberado"
  on public.company_tasks for all
  to authenticated
  using (public.usuario_aprovado())
  with check (public.usuario_aprovado());

revoke all on public.company_tasks from anon;

-- -------------------------------------------------------------
-- As demandas que já estão decididas
--
-- Entram pelo TÍTULO: se já existir uma com o mesmo, não duplica.
-- Assim o arquivo pode rodar quantas vezes for preciso, e o que as
-- duas editarem na tela não é desfeito na rodada seguinte.
-- -------------------------------------------------------------
insert into public.company_tasks (title, area, assigned_to, due_date, notes)
select
  'Pesquisar cartão de crédito com milhas',
  'financeiro'::company_task_area,
  (select id from public.profiles
    where lower(btrim(name)) like 'fran%' order by created_at limit 1),
  date '2026-12-15',
  'vamos usar muito as milhas em 2027 e queremos começar a acumular agora'
where not exists (
  select 1 from public.company_tasks
   where lower(btrim(title)) = lower('Pesquisar cartão de crédito com milhas')
);

-- "Eu quero que em final de dezembro, pode ser ali dia 20 de
-- dezembro, a Vitória refaça todos os contratos de todos os clientes
-- para começar um ano, e eu quero que os contratos sejam de um ano."
insert into public.company_tasks (title, area, assigned_to, due_date, notes)
select
  'Refazer os contratos de todos os clientes, com vigência de 1 ano',
  'administrativo'::company_task_area,
  (select id from public.profiles
    where lower(btrim(name)) like 'vit%' order by created_at limit 1),
  date '2026-12-20',
  'Começar 2027 com todos os contratos novos e de um ano. Depois de refazer, atualizar a vigência de cada um em Administrativo > Clientes.'
where not exists (
  select 1 from public.company_tasks
   where lower(btrim(title)) = lower('Refazer os contratos de todos os clientes, com vigência de 1 ano')
);
