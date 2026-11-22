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
  FinancialCategory,
  FinancialEntry,
  FinancialKind,
  FinancialRecurrence,
  ActivityKind,
  ClientFileKind,
  CompanyFileKind,
  FinancialStatus,
  Lead,
  ObligationCadence,
  TeamKind,
  LeadChannel,
  LeadStage,
  LeadTemperature,
  LostReasonKind,
  Proposal,
  ProposalStatus,
  Profile,
  UserRole,
} from "./database";

// -------------------------------------------------------------
// Tipos de apresentação (com relacionamentos resolvidos)
// -------------------------------------------------------------

/** Lançamento financeiro com categoria e cliente resolvidos. */
export interface FinancialEntryWithRelations extends FinancialEntry {
  category: FinancialCategory | null;
  client: Client | null;
}

/** Recorrência com categoria e cliente resolvidos. */
export interface FinancialRecurrenceWithRelations extends FinancialRecurrence {
  category: FinancialCategory | null;
  client: Client | null;
}

/** Oportunidade com as propostas e o cliente resolvidos. */
export interface LeadWithRelations extends Lead {
  proposals: Proposal[];
  client: Client | null;
}

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

/** Situação MANUAL do planejamento (marcada à mão pela planejadora). */
export const PLANNING_SITUACAO_OPTIONS: string[] = [
  "Pendente",
  "Entregue",
  "Atrasado",
  "Reagendado",
];

export const PLANNING_SITUACAO_TONE: Record<string, string> = {
  Pendente: "bg-gray-100 text-gray-600",
  Entregue: "bg-green-100 text-green-700",
  Atrasado: "bg-red-100 text-red-700",
  Reagendado: "bg-amber-100 text-amber-700",
};

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

// -------------------------------------------------------------
// Financeiro — opções e tons de UI
// -------------------------------------------------------------

export const FINANCIAL_KIND_OPTIONS: FinancialKind[] = ["Receita", "Despesa"];

export const FINANCIAL_STATUS_OPTIONS: FinancialStatus[] = ["Pago", "Pendente"];

export const FINANCIAL_STATUS_TONE: Record<FinancialStatus, BadgeTone> = {
  Pago: "verde",
  Pendente: "amarelo",
};

export const FINANCIAL_KIND_TONE: Record<FinancialKind, BadgeTone> = {
  Receita: "verde",
  Despesa: "vermelho",
};

/** Formas de pagamento (lista fixa da aba "Configurações" da planilha). */
export const PAYMENT_METHOD_OPTIONS: string[] = [
  "PIX",
  "Boleto",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Transferência",
  "Dinheiro",
  "Outro",
];

// -------------------------------------------------------------
// Comercial — opções e tons de UI
// -------------------------------------------------------------

/** Etapas na ordem do funil (as duas últimas encerram). */
/** Canais de prospecção, na ordem em que aparecem nas telas. */
export const LEAD_CHANNEL_OPTIONS: LeadChannel[] = [
  "Social selling",
  "Tráfego pago",
  "Instagram orgânico",
  "Indicação",
  "Evento",
  "Grupos e WhatsApp",
  "Parceria",
  "Visita presencial",
  "Outro",
];

/**
 * O que perguntar no "detalhe" de cada origem.
 *
 * Do protótipo da Vitória: o campo não se chama "detalhe da origem"
 * em lugar nenhum — ele pergunta a coisa certa para cada canal. Quem
 * veio de indicação tem QUEM indicou; quem veio de tráfego tem QUAL
 * campanha. Com um rótulo genérico, o campo ficava vazio.
 */
export const LEAD_CHANNEL_DETAIL: Record<LeadChannel, string> = {
  "Social selling": "Lista ou busca de onde saiu",
  "Tráfego pago": "Qual campanha",
  "Instagram orgânico": "Qual post ou story",
  Indicação: "Quem indicou",
  Evento: "Qual evento",
  "Grupos e WhatsApp": "Qual grupo",
  Parceria: "Qual parceiro",
  "Visita presencial": "Onde",
  Outro: "Detalhe",
};

/**
 * Os motivos de perda, em lista.
 *
 * Era texto livre, e eu normalizava na hora de somar — tirando
 * acento, ponto final e maiúscula. Funciona até alguém escrever
 * "preço alto" em vez de "achou caro", e aí a conta mente. Com lista,
 * a pergunta "por que a gente perde" tem resposta de verdade.
 */
export const LOST_REASON_OPTIONS: LostReasonKind[] = [
  "Sem resposta",
  "Achou caro",
  "Fechou com outra agência",
  "Não é o momento",
  "Fora do perfil",
  "Outro",
];

export const LEAD_TEMPERATURE_OPTIONS: LeadTemperature[] = [
  "Quente",
  "Morno",
  "Frio",
];

/**
 * O que cada temperatura quer dizer, nas palavras da Vitória.
 *
 * Está escrito na tela, embaixo do campo, porque a diferença entre
 * morno e frio não é óbvia e duas pessoas classificando diferente
 * destroem a única coisa que o campo serve para fazer: ordenar a fila.
 */
export const LEAD_TEMPERATURE_DESC: Record<LeadTemperature, string> = {
  Quente:
    "Veio pedindo ajuda: indicação, procurou a agência, pediu valores ou respondeu rápido querendo reunião.",
  Morno:
    "Tem interesse, conversa, mas ainda não tem urgência ou está comparando.",
  Frio: "A agência foi atrás: social selling, lista, evento sem conversa longa.",
};

export const LEAD_TEMPERATURE_TONE: Record<LeadTemperature, BadgeTone> = {
  Quente: "vermelho",
  Morno: "amarelo",
  Frio: "azul",
};

export const LEAD_STAGE_OPTIONS: LeadStage[] = [
  "Novo lead",
  "Primeiro contato",
  "Em conversa",
  "Diagnóstico",
  "Reunião marcada",
  "Proposta apresentada",
  "Negociação",
  "Fechado",
  "Perdido",
];

/** Etapas que aparecem como coluna no quadro do funil. */
export const LEAD_STAGES_ABERTAS: LeadStage[] = [
  "Novo lead",
  "Primeiro contato",
  "Em conversa",
  "Diagnóstico",
  "Reunião marcada",
  "Proposta apresentada",
  "Negociação",
];

export const ACTIVITY_KIND_OPTIONS: ActivityKind[] = [
  "Tarefa",
  "Reunião",
  "Ligação",
  "WhatsApp",
];

export const PROPOSAL_STATUS_OPTIONS: ProposalStatus[] = [
  "Rascunho",
  "Apresentada",
  "Aceita",
  "Recusada",
];

export const PROPOSAL_STATUS_TONE: Record<ProposalStatus, BadgeTone> = {
  Rascunho: "cinza",
  Apresentada: "azul",
  Aceita: "verde",
  Recusada: "vermelho",
};

/** Como o lead chegou até a agência (lista para o select). */
export const LEAD_SOURCE_OPTIONS: string[] = [
  "Indicação",
  "Instagram",
  "Site",
  "Prospecção ativa",
  "Evento",
  "Cliente antigo",
  "Outro",
];

// -------------------------------------------------------------
// Empresa — opções e tons de UI
// -------------------------------------------------------------

export const OBLIGATION_CADENCE_OPTIONS: ObligationCadence[] = [
  "Mensal",
  "Trimestral",
  "Anual",
  "Única",
];

/** Tipos de documento de cliente. */
export const CLIENT_FILE_KIND_OPTIONS: ClientFileKind[] = [
  "Contrato",
  "Proposta",
  "Briefing",
  "Referência",
  "Arte",
  "Nota fiscal",
  "Outro",
];

/** Tipos de documento da empresa. */
export const COMPANY_FILE_KIND_OPTIONS: CompanyFileKind[] = [
  "Contrato social",
  "CNPJ",
  "Alvará",
  "Certidão",
  "Imposto",
  "Contabilidade",
  "Seguro",
  "Outro",
];

/** Meses para os selects de vencimento. */
export const MESES_CURTOS: string[] = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

// -------------------------------------------------------------
// Pessoas — opções e tons de UI
// -------------------------------------------------------------

export const TEAM_KIND_OPTIONS: TeamKind[] = ["Sócia", "Freelancer", "Prestador"];

export const TEAM_KIND_TONE: Record<TeamKind, BadgeTone> = {
  Sócia: "roxo",
  Freelancer: "azul",
  Prestador: "cinza",
};
