#!/usr/bin/env bash
# Testa supabase/ATUALIZAR.sql do jeito que importa: num banco VELHO.
#
# POR QUE EXISTE
#
# Eu testava só a instalação do zero — schema de hoje, seed, e aí o
# ATUALIZAR. Passava sempre, porque o schema de hoje já traz as
# colunas novas. No banco da Fran, que foi criado meses atrás, o
# arquivo quebrou na cara dela:
#
#     ERROR: 42703: column r.vencimento_meses does not exist
#
# O caminho que conta é o de ATUALIZAÇÃO: banco antigo -> ATUALIZAR.
# Este script monta um banco a partir do schema de um commit antigo e
# roda o ATUALIZAR três vezes seguidas, conferindo que não dá erro e
# que o resultado não muda.
#
#   bash scripts/testar-atualizar.sh [commit-antigo] [porta]
set -euo pipefail
cd "$(dirname "$0")/.."

ANTIGO=${1:-2da8e63}   # antes das colunas novas existirem
PORTA=${2:-5433}
BANCO=teste_atualizar
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "Schema do commit $ANTIGO"
for arq in schema_completo seed_financeiro detalhar_fixos; do
  git show "$ANTIGO:supabase/$arq.sql" > "$TMP/$arq.sql"
done
cp supabase/ATUALIZAR.sql "$TMP/"
chmod 644 "$TMP"/*.sql
chmod 755 "$TMP"

rodar() { su postgres -c "psql -p $PORTA -d $BANCO -q -v ON_ERROR_STOP=1 -f $1" 2>&1 | grep -iv '^NOTICE' | grep -i error || true; }

su postgres -c "psql -p $PORTA -q -c 'drop database if exists $BANCO' -c 'create database $BANCO'" 2>&1 | grep -v NOTICE || true
su postgres -c "psql -p $PORTA -d $BANCO -q -c \"create extension if not exists pgcrypto; create schema if not exists auth; create schema if not exists storage; create table if not exists auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb); create or replace function auth.uid() returns uuid language sql stable as 'select null::uuid'; create or replace function auth.role() returns text language sql stable as 'select ''service_role''::text'; create table if not exists storage.buckets (id text primary key, name text, public boolean); create table if not exists storage.objects (id uuid default gen_random_uuid() primary key, bucket_id text, name text, owner uuid);\"" >/dev/null

for arq in schema_completo seed_financeiro detalhar_fixos; do
  su postgres -c "psql -p $PORTA -d $BANCO -q -f $TMP/$arq.sql" >/dev/null 2>&1 || true
done

falhou=0
anterior=""
for i in 1 2 3; do
  erro=$(rodar "$TMP/ATUALIZAR.sql")
  if [ -n "$erro" ]; then
    echo "RODADA $i: ERRO"
    echo "$erro"
    falhou=1
    break
  fi
  estado=$(su postgres -c "psql -p $PORTA -d $BANCO -At -c \"select reference_month||' '||sum(amount) from public.financial_entries where kind='Despesa' group by reference_month order by reference_month\"" | tr '\n' ' ')
  echo "rodada $i: $estado"
  if [ -n "$anterior" ] && [ "$estado" != "$anterior" ]; then
    echo "NÃO É IDEMPOTENTE: a rodada $i mudou o resultado."
    falhou=1
    break
  fi
  anterior=$estado
done

su postgres -c "psql -p $PORTA -q -c 'drop database if exists $BANCO'" >/dev/null 2>&1 || true
[ "$falhou" = 0 ] && echo "OK: roda num banco antigo, três vezes, sem mudar nada."
exit $falhou
