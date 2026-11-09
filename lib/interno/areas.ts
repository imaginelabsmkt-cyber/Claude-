/**
 * =============================================================
 * ÁREAS DO SISTEMA INTERNO
 * =============================================================
 * Fonte única das áreas da empresa.
 *
 * O MENU TEM QUATRO ÁREAS, E JÁ TEVE SETE.
 *
 * As sete eram Comercial, Financeiro, Pessoas, Contábil,
 * Administrativo, Relatório e Meus gastos. Parecia organizado, e não
 * era: Pessoas, Contábil e Administrativo mostravam os MESMOS
 * lançamentos do Financeiro, só filtrados por categoria. Quatro
 * portas para o mesmo dado.
 *
 * Quem usava abria quatro lugares diferentes e via dinheiro em todos,
 * sem entender o que cada um tinha de diferente. A Fran resumiu:
 * "parece que tá tudo misturado". Estava mesmo.
 *
 * Agora cada área responde uma pergunta que as outras não respondem:
 *
 *   Dinheiro  quanto entra e quanto sai
 *   Clientes  quem paga hoje e quem pode pagar amanhã
 *   Empresa   o que a empresa tem, deve e precisa cumprir
 *   Meus gastos  o meu bolso, que ninguém mais vê
 *
 * Cada área tem uma COR, e a cor diz de onde a informação vem. Numa
 * lista misturada (a tela Início), a tarja colorida identifica a
 * origem sem precisar ler.
 *
 * As cores vivem no CSS (`app/globals.css`, seletor `[data-area]`),
 * porque o tema troca por atributo. Aqui ficam os metadados e a ordem.
 * =============================================================
 */

export type AreaId =
  | "inicio"
  | "dinheiro"
  | "clientes"
  | "empresa"
  | "pessoal";

export interface Area {
  id: AreaId;
  label: string;
  href: string;
  /** Aparece embaixo do título da tela. */
  contexto: string;
  /** A pergunta que só esta área responde. */
  pergunta: string;
  /** Cor da área em hex. Espelha `--area` no CSS. */
  cor: string;
  /** Nome do ícone em `components/interno/icone.tsx`. */
  icone: string;
}

/** Áreas cujo conteúdo é privado de cada login. */
export const AREAS_PRIVADAS: AreaId[] = ["pessoal"];

/** Ordem do menu: do dia a dia para o que tem prazo, e o pessoal por último. */
export const AREAS: Area[] = [
  {
    id: "inicio",
    label: "Início",
    href: "/interno",
    contexto: "O que precisa de você",
    pergunta: "Por onde eu começo hoje?",
    cor: "#3f3a3c",
    icone: "inicio",
  },
  {
    id: "dinheiro",
    label: "Dinheiro",
    href: "/interno/financeiro",
    contexto: "Entradas e saídas",
    pergunta: "Quanto entra e quanto sai?",
    cor: "#0f5d52",
    icone: "dinheiro",
  },
  {
    id: "clientes",
    label: "Clientes",
    href: "/interno/comercial",
    contexto: "Carteira e prospecção",
    pergunta: "Quem paga hoje e quem pode pagar amanhã?",
    cor: "#7a2740",
    icone: "clientes",
  },
  {
    id: "empresa",
    label: "Empresa",
    href: "/interno/empresa/equipe",
    contexto: "Equipe, prazos e contratos",
    pergunta: "O que a empresa tem, deve e precisa cumprir?",
    cor: "#1d5a9e",
    icone: "empresa",
  },
  {
    id: "pessoal",
    label: "Meus gastos",
    href: "/interno/meus-gastos",
    contexto: "Só você vê",
    pergunta: "Como está o MEU mês?",
    cor: "#a62a6a",
    icone: "pessoal",
  },
];

/** Áreas do menu, exceto o Início (que abre o grupo). */
export const AREAS_MENU: Area[] = AREAS.filter((a) => a.id !== "inicio");

/**
 * As áreas da EMPRESA: as duas sócias veem exatamente o mesmo dado
 * nelas, e isso é o esperado.
 */
export const AREAS_EMPRESA: Area[] = AREAS_MENU.filter(
  (a) => !AREAS_PRIVADAS.includes(a.id),
);

/**
 * As áreas PRIVADAS por login. Cada uma vê só o que é dela, garantido
 * pelo RLS do Postgres (`user_id = auth.uid()`), não pela tela. Ficam
 * separadas no menu por uma linha, porque a diferença importa: tudo
 * acima é "nosso", tudo aqui é "meu".
 */
export const AREAS_PESSOAIS: Area[] = AREAS_MENU.filter((a) =>
  AREAS_PRIVADAS.includes(a.id),
);

/** Busca uma área pelo id. */
export function area(id: AreaId): Area {
  return AREAS.find((a) => a.id === id) ?? AREAS[0];
}

/**
 * Rotas que pertencem a uma área mas não começam com o href dela.
 * O relatório é uma leitura do dinheiro; não merece item de menu
 * próprio, mas precisa da cor certa quando aberto.
 */
const ROTAS_EXTRAS: [string, AreaId][] = [
  ["/interno/relatorio", "dinheiro"],
  ["/interno/empresa", "empresa"],
];

/**
 * Descobre a área a partir da rota atual, para o shell tingir a tela
 * inteira com a cor certa.
 */
export function areaDaRota(pathname: string): AreaId {
  for (const [rota, id] of ROTAS_EXTRAS) {
    if (pathname === rota || pathname.startsWith(`${rota}/`)) return id;
  }
  const encontrada = AREAS_MENU.find(
    (a) => pathname === a.href || pathname.startsWith(`${a.href}/`),
  );
  if (encontrada) return encontrada.id;
  // /interno/comercial/... e /interno/financeiro/... já caem acima;
  // o que sobrar é a raiz.
  return "inicio";
}
