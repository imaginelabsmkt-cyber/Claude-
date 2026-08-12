-- Calendários próprios da agência dentro da conta Google de cada usuário.
-- Guardamos o ID de cada calendário (criado sob demanda) para rotear os
-- eventos: Reuniões, Produção (gravações/fotos) e Postagens.
alter table public.google_accounts
  add column if not exists cal_reunioes text,
  add column if not exists cal_producao text,
  add column if not exists cal_postagens text;
