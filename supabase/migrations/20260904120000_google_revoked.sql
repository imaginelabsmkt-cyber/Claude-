-- Marca quando a conexão com o Google caiu (token revogado/expirado), em vez
-- de apagar a conta. Assim o sistema lembra que a pessoa PRECISA reconectar e
-- mostra o aviso. Reconectar limpa o campo. Idempotente.
alter table public.google_accounts
  add column if not exists revoked_at timestamptz;
