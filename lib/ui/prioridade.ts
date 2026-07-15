import type { ContentPriority } from "@/types";

/**
 * Cor da prioridade — usada como realce (ex.: borda esquerda) nos cards
 * operacionais, para dar a mesma "linguagem de cor" em todas as telas.
 */
export const COR_PRIORIDADE: Record<ContentPriority, string> = {
  Urgente: "#ef4444", // vermelho
  Alta: "#f97316", // laranja
  Média: "#f59e0b", // amarelo
  Baixa: "#cbd5e1", // cinza
};

export function corPrioridade(priority: ContentPriority): string {
  return COR_PRIORIDADE[priority];
}
