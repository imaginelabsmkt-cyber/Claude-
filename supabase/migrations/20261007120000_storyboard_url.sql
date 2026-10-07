-- Link do storyboard (Canva/Drive/Pinterest) de um ensaio/produção.
-- Mostrado pro cliente no painel, junto das orientações do ensaio.
alter table public.contents
  add column if not exists storyboard_url text;
