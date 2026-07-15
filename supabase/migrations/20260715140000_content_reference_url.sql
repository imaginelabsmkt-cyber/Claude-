-- =============================================================
-- Conteúdos: link de referência (Instagram/TikTok)
-- Usado como inspiração na hora de gravar/editar. Vem do planejamento
-- (campo "REFERÊNCIA:" / "LINK:").
-- Idempotente.
-- =============================================================

alter table public.contents add column if not exists reference_url text;
