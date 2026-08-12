-- Vincula uma CAPA (arte) ao vídeo de origem, para gerar a demanda de capa
-- automaticamente quando o vídeo é editado (e evitar capas duplicadas).
alter table public.contents
  add column if not exists cover_source_id uuid references public.contents(id) on delete set null;

create index if not exists idx_contents_cover_source
  on public.contents(cover_source_id);
