/**
 * =============================================================
 * ÁREAS DO SISTEMA INTERNO
 * =============================================================
 * Fonte única das áreas administrativas da empresa (comercial,
 * financeiro, pessoas, contábil e administrativo).
 *
 * Cada área tem uma COR, e a cor tem função: ela diz de onde a
 * informação vem. Numa lista misturada (a tela Início), a tarja
 * colorida identifica a origem sem precisar ler.
 *
 * As cores em si vivem no CSS (`app/globals.css`, seletor
 * `[data-area]`), porque o tema troca por atributo. Aqui ficam
 * apenas os metadados e a ordem do menu.
 *
 * ATENÇÃO: este módulo é do sistema INTERNO. O sistema de gestão
 * de demandas (conteúdos, gravações, edição, postagens) é outro,
 * e sua navegação continua em `lib/navigation.ts`.
 * =============================================================
 */

export type AreaId =
  | "inicio"
  | "relatorio"
  | "comercial"
  | "financeiro"
  | "pessoas"
  | "contabil"
  | "administrativo";

export interface Area {
  id: AreaId;
  label: string;
  href: string;
  /** Aparece no cabeçalho da tela, ao lado do título. */
  contexto: string;
  /** A pergunta que a área responde — usada na porta de entrada. */
  pergunta: string;
  /** Cor da área em hex. Espelha `--area` no CSS; use só onde o CSS não alcança. */
  cor: string;
}

/** Ordem do menu: do dia a dia para o que tem prazo. */
export const AREAS: Area[] = [
  {
    id: "inicio",
    label: "Início",
    href: "/interno",
    contexto: "Cruzamento",
    pergunta: "Por onde eu começo hoje?",
    cor: "#3f3a3c",
  },
  {
    id: "relatorio",
    label: "Relatório do mês",
    href: "/interno/relatorio",
    contexto: "Fechamento",
    pergunta: "Como foi o mês que passou?",
    cor: "#3f3a3c",
  },
  {
    id: "comercial",
    label: "Comercial",
    href: "/interno/comercial",
    contexto: "Carteira e funil",
    pergunta: "De onde vem o próximo cliente?",
    cor: "#7a2740",
  },
  {
    id: "financeiro",
    label: "Financeiro",
    href: "/interno/financeiro",
    contexto: "Fluxo de caixa",
    pergunta: "Quanto sobra no fim do mês?",
    cor: "#0f5d52",
  },
  {
    id: "pessoas",
    label: "Pessoas",
    href: "/interno/pessoas",
    contexto: "Sócias e freelas",
    pergunta: "Quanto custa a equipe?",
    cor: "#6f4a9b",
  },
  {
    id: "contabil",
    label: "Contábil",
    href: "/interno/contabil",
    contexto: "Obrigações",
    pergunta: "O que tem prazo com o governo?",
    cor: "#1d5a9e",
  },
  {
    id: "administrativo",
    label: "Administrativo",
    href: "/interno/administrativo",
    contexto: "Contratos e ferramentas",
    pergunta: "O que a empresa assina e paga?",
    cor: "#8a5a16",
  },
];

/** Áreas do menu, exceto o Início (que abre o grupo). */
export const AREAS_MENU: Area[] = AREAS.filter((a) => a.id !== "inicio");

/** Busca uma área pelo id. */
export function area(id: AreaId): Area {
  return AREAS.find((a) => a.id === id) ?? AREAS[0];
}

/**
 * Descobre a área a partir da rota atual — usado pelo shell para
 * tingir a tela inteira com a cor certa.
 */
export function areaDaRota(pathname: string): AreaId {
  const encontrada = AREAS_MENU.find(
    (a) => pathname === a.href || pathname.startsWith(`${a.href}/`),
  );
  return encontrada?.id ?? "inicio";
}
