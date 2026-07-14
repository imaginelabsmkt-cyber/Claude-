-- =============================================================
-- SEED OPCIONAL — usuários de exemplo (Fran e Vitória)
--
-- ATENÇÃO:
-- - Uso apenas em ambiente de DESENVOLVIMENTO/local.
-- - NÃO define senhas reais: encrypted_password fica vazio, então estes
--   usuários NÃO conseguem fazer login até que uma senha seja definida
--   via Supabase Auth (Dashboard > Authentication, ou "Enviar convite/
--   redefinir senha"). Ver supabase/README.md.
-- - Depende da migration inicial já aplicada.
--
-- Executar (Supabase local):  supabase db reset   (roda migration + seed)
-- Ou manualmente:            psql "$DATABASE_URL" -f supabase/seed.sql
-- =============================================================

-- UUIDs fixos para reprodutibilidade
-- Vitória: 11111111-1111-1111-1111-111111111111 (planner)
-- Fran:    22222222-2222-2222-2222-222222222222 (producer)

-- -------------------------------------------------------------
-- Usuários no Auth (o trigger handle_new_user cria o profile).
-- O upsert em profiles logo abaixo garante os dados mesmo que o
-- trigger não esteja ativo no ambiente.
-- -------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'vitoria@agencia.local',
    '', now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Vitória","role":"planner"}',
    now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated', 'fran@agencia.local',
    '', now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Fran","role":"producer"}',
    now(), now(),
    '', '', '', ''
  )
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Perfis (garante nome/papel corretos, independentemente do trigger)
-- -------------------------------------------------------------
insert into public.profiles (id, name, email, role)
values
  ('11111111-1111-1111-1111-111111111111', 'Vitória', 'vitoria@agencia.local', 'planner'),
  ('22222222-2222-2222-2222-222222222222', 'Fran',    'fran@agencia.local',    'producer')
on conflict (id) do update
  set name  = excluded.name,
      email = excluded.email,
      role  = excluded.role;

-- -------------------------------------------------------------
-- (Opcional) Cliente de exemplo para facilitar testes de tela.
-- Descomente se desejar.
-- -------------------------------------------------------------
-- insert into public.clients (name, active, color, posting_frequency, notes)
-- values ('Cliente Exemplo', true, '#4f46e5', '3x por semana', 'Registro de teste')
-- on conflict do nothing;
