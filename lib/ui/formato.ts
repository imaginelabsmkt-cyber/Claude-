/**
 * Estilo visual por formato de conteúdo — usado no calendário e nas listas
 * para que dê para "bater o olho" e saber o que é (Reel, Carrossel, etc.),
 * inclusive num print enviado para o cliente.
 */
export interface EstiloFormato {
  /** Rótulo curto para caber em chips. */
  curto: string;
  /** Cor de fundo do chip. */
  fundo: string;
  /** Cor do texto sobre o fundo. */
  texto: string;
  /** Cor da borda/realce. */
  borda: string;
  /** Emoji para leitura rápida. */
  icone: string;
}

const ESTILOS: Record<string, EstiloFormato> = {
  Reel: {
    curto: "Reel",
    fundo: "#fce7f3",
    texto: "#9d174d",
    borda: "#ec4899",
    icone: "🎬",
  },
  Carrossel: {
    curto: "Carrossel",
    fundo: "#dbeafe",
    texto: "#1e40af",
    borda: "#3b82f6",
    icone: "🖼️",
  },
  Story: {
    curto: "Story",
    fundo: "#ede9fe",
    texto: "#5b21b6",
    borda: "#8b5cf6",
    icone: "⚡",
  },
  "Post estático": {
    curto: "Post",
    fundo: "#fef3c7",
    texto: "#92400e",
    borda: "#f59e0b",
    icone: "📌",
  },
  "Vídeo longo": {
    curto: "Vídeo",
    fundo: "#ccfbf1",
    texto: "#115e59",
    borda: "#14b8a6",
    icone: "🎥",
  },
};

const PADRAO: EstiloFormato = {
  curto: "Conteúdo",
  fundo: "#f1f5f9",
  texto: "#334155",
  borda: "#94a3b8",
  icone: "•",
};

/** Devolve o estilo visual de um formato (com fallback para "Outro"/nulo). */
export function estiloFormato(formato: string | null | undefined): EstiloFormato {
  if (!formato) return PADRAO;
  return ESTILOS[formato] ?? { ...PADRAO, curto: formato };
}
