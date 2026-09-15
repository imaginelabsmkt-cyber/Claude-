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

/** Etapas do processo de criação do planejamento (por cliente/mês). */
export const PLANNING_STATUS_OPTIONS: string[] = [
  "Marcar reunião",
  "Reunião marcada",
  "Em criação",
  "Enviado ao cliente",
  "Aprovado",
];

/** Status em que o planejamento já foi entregue (não conta como atrasado). */
export const PLANNING_ENTREGUE: string[] = ["Enviado ao cliente", "Aprovado"];

/**
 * Situação do planejamento — agora AUTOMÁTICA (derivada do status + prazo em
 * plannings-table). Mantida só a paleta de cores para o selo.
 */
export const PLANNING_SITUACAO_TONE: Record<string, string> = {
  Pendente: "bg-gray-100 text-gray-600",
  Entregue: "bg-green-100 text-green-700",
  Atrasado: "bg-red-100 text-red-700",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  planner: "Planejamento",
  producer: "Produção",
  admin: "Administrador",
};

// ---------------------------------------------------------------
// Demandas gerais (tarefas do time que não são conteúdo)
// ---------------------------------------------------------------
export const DEMAND_STATUS_OPTIONS = ["A fazer", "Fazendo", "Feita"] as const;
export type DemandStatus = (typeof DEMAND_STATUS_OPTIONS)[number];

export const DEMAND_STATUS_TONE: Record<DemandStatus, string> = {
  "A fazer": "bg-gray-100 text-gray-600",
  Fazendo: "bg-amber-100 text-amber-700",
  Feita: "bg-green-100 text-green-700",
};

/** Áreas/tipos de demanda, para organizar o acompanhamento por cliente. */
export const DEMAND_CATEGORIES = [
  "Conteúdo",
  "Google Meu Negócio",
  "Facebook",
  "Tráfego",
  "Relatório",
  "Estratégia",
  "Preciso do cliente",
  "Outro",
] as const;
export type DemandCategory = (typeof DEMAND_CATEGORIES)[number];

export interface Demand {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  assignee_ids: string[];
  client_id: string | null;
  due_date: string | null;
  status: DemandStatus;
  created_by: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

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
