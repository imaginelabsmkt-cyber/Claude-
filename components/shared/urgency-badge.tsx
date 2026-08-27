import { Badge } from "@/components/ui/badge";
import type { Urgencia, NivelUrgencia } from "@/lib/rules/contents";

const TOM: Record<NivelUrgencia, "vermelho" | "amarelo" | "cinza"> = {
  urgente: "vermelho",
  atrasado: "vermelho",
  hoje: "vermelho",
  semana: "amarelo",
  tranquilo: "cinza",
};

/**
 * Selo de urgência automática (por prazo). Não mostra nada quando "tranquilo"
 * — para não poluir os conteúdos sem pressa.
 */
export function UrgencyBadge({ urgencia }: { urgencia: Urgencia }) {
  if (urgencia.nivel === "tranquilo" || !urgencia.rotulo) return null;
  return <Badge tom={TOM[urgencia.nivel]}>{urgencia.rotulo}</Badge>;
}
