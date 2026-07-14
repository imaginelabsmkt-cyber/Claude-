import type { Content, ContentStatus } from "@/types";

/**
 * =============================================================
 * CAMADA CENTRAL DE REGRAS DE NEGÓCIO DOS CONTEÚDOS
 * =============================================================
 * Fonte ÚNICA das regras derivadas de um conteúdo. Componentes NÃO devem
 * reimplementar estas regras — sempre importar daqui.
 *
 * Primeira versão (Etapa de Conteúdos): próxima ação, responsável atual e
 * prazo principal. A Etapa de Regras expande com "motivo da prioridade",
 * detalhamento de atraso e testes unitários.
 * =============================================================
 */

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
