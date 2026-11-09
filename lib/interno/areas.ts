/**
 * =============================================================
 * ÁREAS DO SISTEMA INTERNO
 * =============================================================
 * Fonte única das etapas da empresa.
 *
 * SÃO TRÊS ETAPAS, E JÁ FORAM SETE ÁREAS E DEPOIS QUATRO.
 *
 * As sete (Comercial, Financeiro, Pessoas, Contábil, Administrativo,
 * Relatório, Meus gastos) pareciam organizadas e não eram: quatro
 * delas mostravam os MESMOS lançamentos, só filtrados por categoria.
 * Eu então propus cortar para quatro, e a Fran corrigiu o diagnóstico:
 * o problema nunca foi o número de áreas, foi eu ter enchido todas com
 * a mesma coisa. Sete faria sentido se cada uma tivesse função própria.
 *
 * A estrutura certa veio dela, e é mais enxuta do que qualquer uma das
 * minhas, porque segue o que está dentro do quê:
 *
 *   COMERCIAL       de onde vem o próximo cliente
 *                   funil e prospecção
 *
 *   ADMINISTRATIVO  como a empresa se organiza
 *                   clientes e seus contratos, equipe e contratação,
 *                   documentos societários, quem faz o quê
 *
 *   FINANCEIRO      quanto entra e quanto sai
 *                   lançamentos, fluxo de caixa, ferramentas (porque
 *                   o que importa delas é quanto custam), impostos e
 *                   contábil, relatório do mês
 *
 * RH não é etapa: contratar alguém é ato administrativo, e o valor
 * combinado vira lançamento no financeiro. Contábil não é etapa:
 * imposto é dinheiro saindo. Ferramenta não é etapa: é custo.
 *
 * A régua para criar uma etapa nova: ela precisa responder uma
 * pergunta que nenhuma das outras responde. Se a resposta já mora
 * dentro de outra, é aba, não etapa.
 *
 * Cada etapa tem uma COR, e a cor diz de onde a informação vem. Numa
 * lista misturada (a tela Início), a tarja colorida identifica a
 * origem sem precisar ler. As cores vivem em `app/globals.css`.
 * =============================================================
 */

export type AreaId =
  | "inicio"
  | "comercial"
  | "administrativo"
  | "financeiro"
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

/**
 * Ordem do menu: Início primeiro, porque é a porta de entrada e não
 * concorre com as outras; depois as etapas da empresa em ORDEM
 * ALFABÉTICA; e o pessoal por último, separado.
 *
 * Alfabética por pedido da Fran. É a ordem que não precisa ser
 * explicada: qualquer outra (por importância, por frequência de uso)
 * depende de concordar com o critério de quem ordenou.
 */
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
    id: "administrativo",
    label: "Administrativo",
    href: "/interno/administrativo",
    contexto: "Clientes, equipe e documentos",
    pergunta: "Como a empresa se organiza?",
    cor: "#1d5a9e",
    icone: "administrativo",
  },
  {
    id: "comercial",
    label: "Comercial",
    href: "/interno/comercial",
    contexto: "Funil e prospecção",
    pergunta: "De onde vem o próximo cliente?",
    cor: "#7a2740",
    icone: "comercial",
  },
  {
    id: "financeiro",
    label: "Financeiro",
    href: "/interno/financeiro",
    contexto: "Entradas, saídas e impostos",
    pergunta: "Quanto entra e quanto sai?",
    cor: "#0f5d52",
    icone: "financeiro",
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
).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

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
  ["/interno/relatorio", "financeiro"],
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
