-- =============================================================
-- Conteúdos: campos de roteiro e legenda
-- - script:  roteiro completo (cenas/falas/stories), vindo do planejamento
-- - caption: legenda do post
-- Idempotente.
-- =============================================================

alter table public.contents add column if not exists script text;
alter table public.contents add column if not exists caption text;
