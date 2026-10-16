-- Quantos viraram cliente, separado por origem: tráfego (anúncio) x orgânico.
-- Permite medir o retorno só dos anúncios. closed_count segue como o total.
alter table public.client_monthly_results
  add column if not exists closed_traffic integer,
  add column if not exists closed_organic integer;
