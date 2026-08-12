-- =============================================================
-- Conteúdos: horário da gravação (HH:MM)
-- A data já existe (recording_date); a hora permite agendar "terça às 9h"
-- e virar tarefa/evento no Google Agenda no horário certo.
-- Idempotente.
-- =============================================================

alter table public.contents add column if not exists recording_time text;
