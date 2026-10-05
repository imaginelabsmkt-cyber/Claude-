import type { ContentStatus, MetricaTrafego } from "@/types";

/** Rótulo limpo (para o cliente) e tom de cor de cada status interno. */
export const STATUS_CLIENTE: Record<ContentStatus, { label: string; tom: string }> = {
  Planejamento: { label: "Em planejamento", tom: "bg-gray-100 text-gray-600" },
  "Roteiro pronto": { label: "Roteiro pronto", tom: "bg-gray-100 text-gray-600" },
  "Aguardando gravação": { label: "A gravar", tom: "bg-amber-100 text-amber-700" },
  Gravado: { label: "Gravado", tom: "bg-blue-100 text-blue-700" },
  "Fila de edição": { label: "Em edição", tom: "bg-amber-100 text-amber-700" },
  "Em edição": { label: "Em edição", tom: "bg-amber-100 text-amber-700" },
  "Revisão interna": { label: "Em revisão", tom: "bg-violet-100 text-violet-700" },
  "Aprovação do cliente": {
    label: "Aguardando sua aprovação",
    tom: "bg-rose-100 text-rose-700",
  },
  Ajustes: { label: "Em ajustes", tom: "bg-amber-100 text-amber-700" },
  Aprovado: { label: "Aprovado", tom: "bg-green-100 text-green-700" },
  Agendado: { label: "Agendado", tom: "bg-green-100 text-green-700" },
  Publicado: { label: "Publicado", tom: "bg-green-100 text-green-700" },
  Pausado: { label: "Pausado", tom: "bg-gray-100 text-gray-600" },
  Cancelado: { label: "Cancelado", tom: "bg-gray-100 text-gray-500" },
};

/** Formatos que são ARTE (carrossel/post): não têm roteiro; precisam de FOTOS. */
const ARTE_FMT = ["Carrossel", "Post estático"];

/**
 * Status como o cliente vê, levando o FORMATO em conta. Carrossel/arte não tem
 * "roteiro" nem edição de vídeo: a copy já está pronta, o que falta são as
 * FOTOS. Então os estágios iniciais viram "Aguardando fotos" e os prontos,
 * "Pronto".
 */
export function statusClientePost(
  status: ContentStatus,
  format: string | null,
): { label: string; tom: string } {
  const arte = !!format && ARTE_FMT.includes(format);
  if (arte) {
    const aguardandoFotos: ContentStatus[] = [
      "Planejamento",
      "Roteiro pronto",
      "Aguardando gravação",
      "Gravado",
      "Fila de edição",
      "Em edição",
      "Ajustes",
    ];
    if (aguardandoFotos.includes(status)) {
      return { label: "Aguardando fotos", tom: "bg-amber-100 text-amber-700" };
    }
    if (status === "Aprovado" || status === "Agendado") {
      return { label: "Pronto", tom: "bg-green-100 text-green-700" };
    }
  }
  return STATUS_CLIENTE[status];
}

/** Item de conteúdo enxuto para o portal (nada de campos internos). */
export interface PortalPost {
  id: string;
  title: string;
  format: string | null;
  status: ContentStatus;
  data: string | null; // planned_date ou actual_post_date
  caption: string | null; // legenda (o roteiro é interno, não vai pro cliente)
  aguardaAprovacao: boolean;
}

export interface PortalDemanda {
  id: string;
  title: string;
  category: string | null;
  status: string;
}

/** Uma linha da tabela do roteiro: coluna esquerda (fala) e direita (cena). */
export interface RoteiroLinha {
  esq: string;
  dir: string;
}

/**
 * Roteiro organizado como no conteúdo: tabela fiel de 2 colunas (cabeçalho da
 * Vitória + linhas). Sem tabela, cai em texto corrido (paragrafos).
 */
export interface RoteiroOrganizado {
  colEsq: string;
  colDir: string;
  linhas: RoteiroLinha[];
  paragrafos: string[];
}

/** Gravação marcada na semana. */
export interface PortalGravacao {
  id: string;
  title: string;
  format: string | null;
  data: string | null; // recording_date
  hora: string | null; // recording_time
  local: string | null; // recording_location
  roteiro: RoteiroOrganizado | null;
  /** Situação: já gravado, a remarcar (passou e não gravou) ou agendado. */
  situacao: "gravado" | "a_remarcar" | "agendado";
}

/** Resumo do mês para o cliente: quanto foi planejado x já publicado. */
export interface ResumoMes {
  label: string; // "setembro de 2026"
  planejados: number;
  publicados: number;
  restantes: number;
  meta: number | null; // combo contratado, se houver
  jaFeitos: PortalPost[]; // o que já foi ao ar no mês
}

/** Resultados do mês no painel: tráfego (equipe) + o que o cliente respondeu. */
export interface ResultadoPortal {
  weekStart: string; // 'YYYY-MM-DD' (segunda-feira)
  metrics: MetricaTrafego[];
  table: string[][] | null; // planilha extraída (tem prioridade sobre metrics)
  teamNote: string | null;
  closedCount: number | null;
  sources: string | null;
  sourcesBreakdown: Record<string, number>;
  comment: string | null;
  respondido: boolean;
}

/** Um item do plano de ação (cronograma), como o cliente vê. */
export interface PortalEstrategia {
  id: string;
  title: string;
  type: string | null;
  status: string;
  description: string | null;
  owner: string; // FAVIE | Cliente
  stage: string | null;
  dateLabel: string | null;
  arquivo: { url: string; name: string } | null;
}

export interface DadosPortal {
  cliente: { id: string; name: string; color: string | null };
  semanaISO: string; // segunda-feira da semana exibida
  iniISO: string;
  fimISO: string;
  resumoMes: ResumoMes;
  resultado: ResultadoPortal;
  postsSemana: PortalPost[];
  gravacoesSemana: PortalGravacao[];
  emProducao: PortalPost[];
  pausadosCancelados: PortalPost[];
  planoAcao: PortalEstrategia[];
  demandas: PortalDemanda[];
}
