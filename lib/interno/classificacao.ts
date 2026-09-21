/**
 * De qual ÁREA é cada categoria financeira.
 *
 * O financeiro é a origem da maior parte dos números da empresa, e as
 * outras áreas são recortes dele: Pessoas é o pró-labore e os freelas,
 * Contábil é o DAS e a contabilidade, Administrativo são as ferramentas
 * e os equipamentos.
 *
 * Fazer esse mapa aqui — em vez de duplicar tabelas — é o que mantém
 * um número só para a empresa inteira: mudou no financeiro, mudou em
 * todas as telas.
 *
 * Categoria que não estiver no mapa é tratada como do próprio financeiro.
 */

import type { AreaId } from "@/lib/interno/areas";

/** Categoria (pelo nome, como está no banco) -> área dona do assunto. */
const POR_CATEGORIA: Record<string, AreaId> = {
  "Pró-labore (sócias)": "pessoas",
  "Freelancers / colaboradores": "pessoas",
  "Contabilidade / MEI": "contabil",
  "DAS - Simples Nacional": "contabil",
  "Assinaturas e ferramentas digitais": "administrativo",
  Equipamentos: "administrativo",
  "Mensalidades / clientes recorrentes": "comercial",
  "Projetos avulsos": "comercial",
  "Produtos / cursos": "comercial",
};

/** Área responsável por uma categoria financeira. */
export function areaDaCategoria(nomeCategoria: string | null | undefined): AreaId {
  if (!nomeCategoria) return "financeiro";
  return POR_CATEGORIA[nomeCategoria] ?? "financeiro";
}

/** Nomes de categoria que pertencem a uma área. */
export function categoriasDaArea(id: AreaId): string[] {
  return Object.entries(POR_CATEGORIA)
    .filter(([, area]) => area === id)
    .map(([nome]) => nome);
}
