/**
 * De qual ASSUNTO é cada categoria financeira.
 *
 * O financeiro é a origem da maior parte dos números da empresa, e as
 * outras telas são recortes dele: Equipe é o pró-labore e os freelas,
 * Prazos é o DAS e a contabilidade, Contratos são as ferramentas e os
 * equipamentos. Fazer esse mapa aqui, em vez de duplicar tabelas, é o
 * que mantém um número só para a empresa inteira: mudou no Dinheiro,
 * mudou em todas as telas.
 *
 * ASSUNTO NÃO É ÁREA DO MENU, e já foi. Enquanto as duas coisas usavam
 * o mesmo tipo, cada recorte de categoria precisava de um item de menu
 * próprio, e foi assim que o menu chegou a sete itens mostrando o
 * mesmo dado de quatro ângulos. Agora Equipe, Prazos e Contratos são
 * três assuntos dentro de UMA área ("Empresa"), e o mapa não decide
 * mais a navegação.
 *
 * Categoria que não estiver no mapa é tratada como do próprio dinheiro.
 */

import type { AreaId } from "@/lib/interno/areas";

/** Recortes de categoria. Três deles moram na área "Empresa". */
export type Assunto =
  | "dinheiro"
  | "clientes"
  | "equipe"
  | "prazos"
  | "contratos";

/** Categoria (pelo nome, como está no banco) -> assunto dono dela. */
const POR_CATEGORIA: Record<string, Assunto> = {
  "Pró-labore (sócias)": "equipe",
  "Freelancers / colaboradores": "equipe",
  "Contabilidade / MEI": "prazos",
  "DAS - Simples Nacional": "prazos",
  "Assinaturas e ferramentas digitais": "contratos",
  Equipamentos: "contratos",
  "Mensalidades / clientes recorrentes": "clientes",
  "Projetos avulsos": "clientes",
  "Produtos / cursos": "clientes",
};

/** Assunto responsável por uma categoria financeira. */
export function assuntoDaCategoria(
  nomeCategoria: string | null | undefined,
): Assunto {
  if (!nomeCategoria) return "dinheiro";
  return POR_CATEGORIA[nomeCategoria] ?? "dinheiro";
}

/** Nomes de categoria que pertencem a um assunto. */
export function categoriasDoAssunto(assunto: Assunto): string[] {
  return Object.entries(POR_CATEGORIA)
    .filter(([, a]) => a === assunto)
    .map(([nome]) => nome);
}

/** Em que ÁREA do menu um assunto aparece, para a tarja colorida. */
export function areaDoAssunto(assunto: Assunto): AreaId {
  switch (assunto) {
    case "clientes":
      return "administrativo";
    case "equipe":
      return "administrativo";
    case "prazos":
    case "contratos":
      return "financeiro";
    default:
      return "financeiro";
  }
}
