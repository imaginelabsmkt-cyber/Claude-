-- Demandas: guarda o id da tarefa criada no Google Tarefas (para atualizar/
-- concluir/apagar a mesma tarefa em vez de criar outra). Idempotente.
alter table public.demands add column if not exists google_task_id text;
