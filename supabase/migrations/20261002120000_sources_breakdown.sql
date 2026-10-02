-- =============================================================
-- Resultados: de onde vieram os contatos, por fonte (com contagem)
--
-- Em vez de texto livre, o cliente informa quantas pessoas vieram de cada
-- fonte (Anúncio, Instagram, Link da bio, Indicação, Google, Outro). Guardamos
-- como { "Anúncio": 3, "Link da bio": 2 }. O campo antigo `sources` (texto)
-- continua existindo e recebe um resumo legível, pra compatibilidade.
-- Idempotente.
-- =============================================================

alter table public.client_monthly_results
  add column if not exists sources_breakdown jsonb not null default '{}'::jsonb;

comment on column public.client_monthly_results.sources_breakdown is
  'De onde vieram os contatos, por fonte: { "Anúncio": 3, "Link da bio": 2 }.';
