#!/usr/bin/env bash
# Junta os SQL pendentes num arquivo só, na ordem certa.
#
# A Fran tinha quatro arquivos para rodar e rodou nenhum ou alguns —
# por isso outubro ficou agrupado e o Captions continuou em novembro.
# Um arquivo só resolve: ela abre o SQL Editor, cola, roda.
#
#   bash scripts/montar-atualizar.sh
set -euo pipefail
cd "$(dirname "$0")/.."

ORDEM=(
  00_colunas_novas
  ajustar_planilha_novembro
  vencimentos_por_cliente
  meta_de_faturamento
  detalhar_historico
  antecipado_e_fatura_outubro
  destravar_fixos
  vencimento_das_receitas
)

{
  cat <<'CAB'
-- =============================================================
-- ATUALIZAR O SISTEMA — rode este arquivo, só ele
--
-- GERADO por scripts/montar-atualizar.sh. Não editar à mão: mexa
-- nos arquivos de origem e rode o script de novo.
--
-- Junta, na ordem certa, tudo que ainda falta aplicar no banco:
--
--   0. 00_colunas_novas — as colunas que o sistema passou a precisar.
--      Vem primeiro porque os blocos seguintes usam elas.
--   1. ajustar_planilha_novembro — tira o Captions e a
--      Contabilidade / MEI, põe o Canva em R$ 35,00, entra a Salte,
--      e acerta o dia do pró-labore (10) e do cartão (20).
--   2. vencimentos_por_cliente — o dia de cada cliente.
--   3. meta_de_faturamento — cria o campo da meta do ano.
--   4. detalhar_historico — abre os meses passados item por item,
--      no lugar das linhas-bloco e do "A CLASSIFICAR".
--   5. antecipado_e_fatura_outubro — o Studio Bambu paga adiantado,
--      a Salte fica sem dia até fechar o contrato, e a fatura do
--      cartão de outubro entra com o que faltava.
--   6. destravar_fixos — as recorrências passam a valer desde o
--      começo da série, cada lançamento passado se liga à sua
--      recorrência (é o que faz aparecer a caixinha de pago nos
--      meses anteriores), o Softbox duplicado sai e a "segunda
--      cobrança do Adobe" vira "Adobe Premiere".
--   7. vencimento_das_receitas — receita vence no próprio mês (menos
--      a Malukies, no seguinte, e o Studio Bambu, antecipado).
--
-- COMO RODAR
--
--   Supabase > SQL Editor > New query > colar tudo > Run.
--
-- Pode rodar quantas vezes quiser: nada aqui mexe no que já está
-- certo, e nada toca no que já foi pago.
-- =============================================================

CAB
  for nome in "${ORDEM[@]}"; do
    echo ""
    echo "-- ============================================================="
    echo "-- $nome"
    echo "-- ============================================================="
    # tira o cabeçalho de comentário de cada arquivo: ele já está acima
    awk 'BEGIN{corpo=0} /^[^-]/{corpo=1} corpo{print}' "supabase/$nome.sql"
  done
} > supabase/ATUALIZAR.sql

echo "supabase/ATUALIZAR.sql: $(wc -l < supabase/ATUALIZAR.sql) linhas"
