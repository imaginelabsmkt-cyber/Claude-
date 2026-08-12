/**
 * =============================================================
 * TIPOS PRINCIPAIS DA APLICAÇÃO
 * =============================================================
 * Reexporta os tipos do banco (fonte única em ./database) e adiciona
 * metadados de apresentação (rótulos/tons em pt-BR) usados na UI.
 * =============================================================
 */

export * from "./database";

import type {
  Client,
  Content,
  ContentPriority,
  ContentStatus,
  Profile,
  UserRole,
} from "./database";

// -------------------------------------------------------------
// Tipos de apresentação (com relacionamentos resolvidos)
// -------------------------------------------------------------

/** Conteúdo com relacionamentos resolvidos, para exibição em telas. */
export interface ContentWithRelations extends Content {
  client: Client | null;
  planner: Profile | null;
  recorder: Profile | null;
  editor: Profile | null;
  publisher: Profile | null;
}

// -------------------------------------------------------------
// Tom visual dos badges (deve casar com os tons de components/ui/badge)
// -------------------------------------------------------------
export type BadgeTone =
  | "cinza"
  | "azul"
  | "verde"
  | "amarelo"
  | "laranja"
  | "vermelho"
  | "roxo";

// -------------------------------------------------------------
// Opções e rótulos (ordem canônica para selects/filtros)
// -------------------------------------------------------------

export const STATUS_OPTIONS: ContentStatus[] = [
  "Planejamento",
  "Roteiro pronto",
  "Aguardando gravação",
  "Gravado",
  "Fila de edição",
  "Em edição",
  "Revisão interna",
  "Aprovação do cliente",
  "Ajustes",
  "Aprovado",
  "Agendado",
  "Publicado",
  "Pausado",
  "Cancelado",
];

export const PRIORITY_OPTIONS: ContentPriority[] = [
  "Urgente",
  "Alta",
  "Média",
  "Baixa",
];

/** Formatos de conteúdo (campo texto no banco; lista fixa para a UI). */
export const FORMAT_OPTIONS: string[] = [
  "Reel",
  "Carrossel",
  "Story",
  "Post estático",
  "Vídeo longo",
  "Outro",
];

/** Semanas previstas do mês (1 a 5). */
export const WEEK_OPTIONS: number[] = [1, 2, 3, 4, 5];

export const ROLE_LABELS: Record<UserRole, string> = {
  planner: "Planejamento",
  producer: "Produção",
  admin: "Administrador",
};

// Os rótulos de status/prioridade já são o próprio valor do ENUM (pt-BR),
// então não há mapa de rótulos — usa-se o valor diretamente.

export const STATUS_TONE: Record<ContentStatus, BadgeTone> = {
  Planejamento: "cinza",
  "Roteiro pronto": "azul",
  "Aguardando gravação": "amarelo",
  Gravado: "azul",
  "Fila de edição": "amarelo",
  "Em edição": "amarelo",
  "Revisão interna": "roxo",
  "Aprovação do cliente": "roxo",
  Ajustes: "vermelho",
  Aprovado: "verde",
  Agendado: "azul",
  Publicado: "verde",
  Pausado: "cinza",
  Cancelado: "vermelho",
};

export const PRIORITY_TONE: Record<ContentPriority, BadgeTone> = {
  Urgente: "vermelho",
  Alta: "laranja",
  Média: "amarelo",
  Baixa: "cinza",
};
