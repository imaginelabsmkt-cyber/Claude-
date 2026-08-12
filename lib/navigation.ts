import type { UserRole } from "@/types";

/**
 * Definição central da navegação da aplicação.
 * Fonte única de verdade para a Sidebar e para os títulos das páginas —
 * evita rotas/rótulos duplicados espalhados pelo código.
 *
 * `papeis` controla quais perfis enxergam o item (RBAC de UI).
 * Quando `papeis` é omitido, o item aparece para todos.
 */
export interface ItemNavegacao {
  href: string;
  label: string;
  descricao: string;
  /** Nome do ícone (a Sidebar mapeia para o SVG correspondente). */
  icone: string;
  papeis?: UserRole[];
}

export const NAVEGACAO: ItemNavegacao[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    descricao: "Visão geral da produção",
    icone: "dashboard",
  },
  {
    href: "/conteudos",
    label: "Conteúdos",
    descricao: "Pautas, roteiros e pipeline de produção",
    icone: "conteudos",
  },
  {
    href: "/quadro",
    label: "Quadro",
    descricao: "Kanban da produção por fase",
    icone: "quadro",
  },
  {
    href: "/clientes",
    label: "Clientes",
    descricao: "Cadastro e gestão de clientes",
    icone: "clientes",
    papeis: ["planner", "admin"],
  },
  {
    href: "/gravacoes",
    label: "Gravações",
    descricao: "Conteúdos em captação",
    icone: "gravacoes",
    papeis: ["producer", "admin"],
  },
  {
    href: "/fila-edicao",
    label: "Fila de edição",
    descricao: "Conteúdos aguardando edição",
    icone: "edicao",
    papeis: ["producer", "admin"],
  },
  {
    href: "/postagens",
    label: "Postagens",
    descricao: "Agendamento e publicação",
    icone: "postagens",
  },
  {
    href: "/minhas-tarefas",
    label: "Minhas tarefas",
    descricao: "Tarefas atribuídas a você",
    icone: "tarefas",
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    descricao: "Perfil e sessão",
    icone: "configuracoes",
  },
];

/** Filtra os itens de navegação visíveis para um determinado papel. */
export function navegacaoPara(papel: UserRole | null): ItemNavegacao[] {
  if (!papel) return NAVEGACAO;
  return NAVEGACAO.filter((item) => !item.papeis || item.papeis.includes(papel));
}

/**
 * Tela inicial conforme o papel: a produtora começa nas tarefas dela, a
 * planejadora nos conteúdos, e o admin na visão geral.
 */
export function rotaInicial(papel: UserRole | null): string {
  if (papel === "producer") return "/minhas-tarefas";
  if (papel === "planner") return "/conteudos";
  return "/dashboard";
}
