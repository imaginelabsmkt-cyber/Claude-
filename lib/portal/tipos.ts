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
  caption: string | null; // legenda (o roteiro é interno, não vai pro cliente)
  aguardaAprovacao: boolean;
}

export interface PortalDemanda {
  id: string;
  title: string;
  category: string | null;
  status: string;
}

/** Uma "cena" do roteiro: a fala (o que é dito) e a direção (o que aparece). */
export interface RoteiroLinha {
  fala: string;
  direcao: string;
}

/** Roteiro já organizado no servidor (sem os separadores internos). */
export interface RoteiroOrganizado {
  linhas: RoteiroLinha[]; // roteiro em tabela (fala | direção)
  paragrafos: string[]; // roteiro em texto corrido (quando não é tabela)
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
}

export interface DadosPortal {
  cliente: { id: string; name: string; color: string | null };
  semanaISO: string; // segunda-feira da semana exibida
  iniISO: string;
  fimISO: string;
  postsSemana: PortalPost[];
  gravacoesSemana: PortalGravacao[];
  emProducao: PortalPost[];
  demandas: PortalDemanda[];
}
