import type { Content, ContentStatus } from "@/types";

/**
 * =============================================================
 * CAMADA CENTRAL DE REGRAS DE NEGÓCIO DOS CONTEÚDOS
 * =============================================================
 * Fonte ÚNICA das regras derivadas de um conteúdo. Componentes NÃO devem
 * reimplementar estas regras — sempre importar daqui.
 *
 * Calcula: próxima ação, responsável atual, prazo principal, se está
 * atrasado e o motivo da prioridade. Coberto por testes em
 * `contents.test.ts`.
 * =============================================================
 */

// -------------------------------------------------------------
// Ordem do pipeline (para comparar etapas)
// -------------------------------------------------------------
/**
 * Índice de cada status no fluxo linear de produção. Pausado e Cancelado
 * ficam fora do fluxo (-1): são estados transversais.
 */
export const ORDEM_STATUS: Record<ContentStatus, number> = {
  Planejamento: 0,
  "Roteiro pronto": 1,
  "Aguardando gravação": 2,
  Gravado: 3,
  "Fila de edição": 4,
  "Em edição": 5,
  "Revisão interna": 6,
  "Aprovação do cliente": 7,
  Ajustes: 8,
  Aprovado: 9,
  Agendado: 10,
  Publicado: 11,
  Pausado: -1,
  Cancelado: -1,
};

/** Janela (em dias) para considerar uma data fixa "próxima". */
export const JANELA_DATA_FIXA_DIAS = 3;

// -------------------------------------------------------------
// Utilitários de data (comparação por dia, sem hora)
// -------------------------------------------------------------
function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Converte "YYYY-MM-DD" em Date local (ou null). */
export function parseData(s: string | null): Date | null {
  if (!s) return null;
  const [ano, mes, dia] = s.split("-").map(Number);
  if (!ano || !mes || !dia) return null;
  return new Date(ano, mes - 1, dia);
}

/** Diferença em dias inteiros (a - b), comparando apenas a data. */
export function difEmDias(a: Date, b: Date): number {
  return Math.round(
    (inicioDoDia(a).getTime() - inicioDoDia(b).getTime()) / 86_400_000,
  );
}

// -------------------------------------------------------------
// 1. Próxima ação (mapa status -> ação)
// -------------------------------------------------------------
export const PROXIMA_ACAO: Record<ContentStatus, string> = {
  Planejamento: "Criar planejamento",
  "Roteiro pronto": "Agendar gravação",
  "Aguardando gravação": "Gravar",
  Gravado: "Adicionar à fila de edição",
  "Fila de edição": "Editar",
  "Em edição": "Finalizar edição",
  "Revisão interna": "Revisar",
  "Aprovação do cliente": "Aguardar cliente",
  Ajustes: "Realizar ajustes",
  Aprovado: "Agendar publicação",
  Agendado: "Publicar",
  Publicado: "Finalizado",
  Pausado: "Aguardar retomada",
  Cancelado: "Nenhuma ação",
};

export function proximaAcao(status: ContentStatus): string {
  return PROXIMA_ACAO[status];
}

// -------------------------------------------------------------
// 2. Responsável atual (depende da etapa do pipeline)
// -------------------------------------------------------------
export interface PessoaResumo {
  id: string;
  name: string;
}

export interface ContextoResponsaveis {
  /** Perfil de planejamento (papel planner, ex.: Vitória). */
  planner?: PessoaResumo | null;
  /** Perfil de produção (papel producer, ex.: Fran). */
  producer?: PessoaResumo | null;
  /** Nome do responsável cadastrado pela publicação (publisher_id). */
  publisherName?: string | null;
}

/**
 * Retorna o nome do responsável atual conforme o status:
 * - Planejamento/Roteiro pronto -> planner (Vitória)
 * - Gravação/Edição -> producer (Fran)
 * - Revisão interna -> producer e planner
 * - Aprovação do cliente -> planner (Vitória)
 * - Publicação (Aprovado/Agendado/Publicado) -> responsável cadastrado
 */
export function responsavelAtual(
  content: Pick<Content, "status">,
  ctx: ContextoResponsaveis,
): string {
  const planner = ctx.planner?.name ?? "Planejamento";
  const producer = ctx.producer?.name ?? "Produção";

  switch (content.status) {
    case "Planejamento":
    case "Roteiro pronto":
      return planner;
    case "Aguardando gravação":
    case "Gravado":
    case "Fila de edição":
    case "Em edição":
    case "Ajustes":
      return producer;
    case "Revisão interna":
      return `${producer} e ${planner}`;
    case "Aprovação do cliente":
      return planner;
    case "Aprovado":
    case "Agendado":
    case "Publicado":
      return ctx.publisherName ?? producer;
    default:
      return "—"; // Pausado / Cancelado
  }
}

// -------------------------------------------------------------
// 3. Prazo principal (o prazo relevante para a etapa atual)
// -------------------------------------------------------------
/**
 * Retorna o prazo mais relevante conforme a etapa:
 * - Planejamento/Roteiro -> prazo do roteiro
 * - Gravação -> prazo de gravação
 * - Edição/Revisão/Ajustes -> prazo de edição
 * - Publicação -> data prevista de postagem
 * Cai para a data prevista quando o prazo específico não existe.
 */
export function prazoPrincipal(
  content: Pick<
    Content,
    | "status"
    | "script_deadline"
    | "recording_deadline"
    | "editing_deadline"
    | "planned_date"
  >,
): string | null {
  switch (content.status) {
    case "Planejamento":
    case "Roteiro pronto":
      return content.script_deadline ?? content.planned_date;
    case "Aguardando gravação":
    case "Gravado":
      return content.recording_deadline ?? content.planned_date;
    case "Fila de edição":
    case "Em edição":
    case "Revisão interna":
    case "Ajustes":
      return content.editing_deadline ?? content.planned_date;
    default:
      return content.planned_date;
  }
}

// -------------------------------------------------------------
// Agrupamentos por status (usados em painéis e dashboard)
// -------------------------------------------------------------
export const GRUPO_EM_APROVACAO: ContentStatus[] = [
  "Revisão interna",
  "Aprovação do cliente",
];
export const GRUPO_PRONTOS_PUBLICAR: ContentStatus[] = ["Aprovado", "Agendado"];

export interface ResumoProducao {
  total: number;
  aguardandoGravacao: number;
  gravados: number;
  filaEdicao: number;
  emEdicao: number;
  emAprovacao: number;
  aprovados: number;
  publicados: number;
}

/** Conta os conteúdos por etapa de produção (para cards de indicadores). */
export function resumoProducao(
  contents: Pick<Content, "status">[],
): ResumoProducao {
  const conta = (s: ContentStatus) =>
    contents.filter((c) => c.status === s).length;
  return {
    total: contents.length,
    aguardandoGravacao: conta("Aguardando gravação"),
    gravados: conta("Gravado"),
    filaEdicao: conta("Fila de edição"),
    emEdicao: conta("Em edição"),
    emAprovacao: contents.filter((c) => GRUPO_EM_APROVACAO.includes(c.status))
      .length,
    aprovados: conta("Aprovado"),
    publicados: conta("Publicado"),
  };
}

// -------------------------------------------------------------
// 4. Está atrasado?
// -------------------------------------------------------------
type ContentAtraso = Pick<
  Content,
  | "status"
  | "planned_date"
  | "recording_deadline"
  | "editing_deadline"
  | "is_fixed_date"
>;

/**
 * Um conteúdo está atrasado quando QUALQUER condição é verdadeira:
 * 1. a data prevista passou e ele não está publicado;
 * 2. o prazo de gravação passou e ele ainda não está gravado;
 * 3. o prazo de edição passou e ele ainda não foi aprovado;
 * 4. possui data fixa próxima (dentro da janela) e ainda não está pronto.
 *
 * Pausado e Cancelado nunca são considerados atrasados.
 * `hoje` é injetável para testes.
 */
export function estaAtrasado(
  content: ContentAtraso,
  hoje: Date = new Date(),
): boolean {
  const { status } = content;
  if (status === "Publicado" || status === "Pausado" || status === "Cancelado") {
    return false;
  }

  const idx = ORDEM_STATUS[status];
  const naoGravado = idx < ORDEM_STATUS["Gravado"];
  const naoAprovado = idx < ORDEM_STATUS["Aprovado"];

  const prevista = parseData(content.planned_date);
  const prazoGravacao = parseData(content.recording_deadline);
  const prazoEdicao = parseData(content.editing_deadline);

  // 1. data prevista passou e não publicado
  if (prevista && difEmDias(prevista, hoje) < 0) return true;
  // 2. prazo de gravação passou e não gravado
  if (prazoGravacao && difEmDias(prazoGravacao, hoje) < 0 && naoGravado) {
    return true;
  }
  // 3. prazo de edição passou e não aprovado
  if (prazoEdicao && difEmDias(prazoEdicao, hoje) < 0 && naoAprovado) {
    return true;
  }
  // 4. data fixa próxima e não pronto
  if (content.is_fixed_date && prevista) {
    const dias = difEmDias(prevista, hoje);
    if (dias >= 0 && dias <= JANELA_DATA_FIXA_DIAS && naoAprovado) return true;
  }

  return false;
}

// -------------------------------------------------------------
// 5. Motivo da prioridade
// -------------------------------------------------------------
type ContentMotivo = ContentAtraso & Pick<Content, "priority" | "is_campaign">;

/**
 * Retorna o principal fator que justifica a prioridade do conteúdo,
 * na ordem: atrasado > data fixa > campanha > urgente > prioridade alta >
 * postagem próxima > rotina. Usado em badges e na fila de edição.
 */
export function motivoPrioridade(
  content: ContentMotivo,
  hoje: Date = new Date(),
): string {
  if (estaAtrasado(content, hoje)) return "Atrasado";
  if (content.is_fixed_date) return "Data fixa";
  if (content.is_campaign) return "Campanha";
  if (content.priority === "Urgente") return "Urgente";
  if (content.priority === "Alta") return "Prioridade alta";

  const prevista = parseData(content.planned_date);
  if (prevista) {
    const dias = difEmDias(prevista, hoje);
    if (dias >= 0 && dias <= JANELA_DATA_FIXA_DIAS) return "Postagem próxima";
  }
  return "Rotina";
}
