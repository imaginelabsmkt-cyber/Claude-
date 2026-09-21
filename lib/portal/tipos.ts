import type { ContentStatus } from "@/types";

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

/** Item de conteúdo enxuto para o portal (nada de campos internos). */
export interface PortalPost {
  id: string;
  title: string;
  format: string | null;
  status: ContentStatus;
  data: string | null; // planned_date ou actual_post_date
  script: string | null;
  caption: string | null;
  aguardaAprovacao: boolean;
}

export interface PortalDemanda {
  id: string;
  title: string;
  category: string | null;
  status: string;
}

export interface DadosPortal {
  cliente: { id: string; name: string; color: string | null };
  semanaISO: string; // segunda-feira da semana exibida
  iniISO: string;
  fimISO: string;
  postsSemana: PortalPost[];
  emProducao: PortalPost[];
  demandas: PortalDemanda[];
}
