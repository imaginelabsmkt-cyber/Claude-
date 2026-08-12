import { Badge } from "@/components/ui/badge";
import {
  PRIORITY_TONE,
  STATUS_TONE,
  type ContentPriority,
  type ContentStatus,
} from "@/types";

/** Badge de status do conteúdo. O rótulo é o próprio valor (pt-BR). */
export function StatusContentBadge({ status }: { status: ContentStatus }) {
  return <Badge tom={STATUS_TONE[status]}>{status}</Badge>;
}

/**
 * Badge de prioridade. "Média" é o padrão, então NÃO mostra nada (evita poluir
 * todos os conteúdos). Só destaca quando é Alta ou Baixa — o que importa ver.
 */
export function PriorityBadge({ priority }: { priority: ContentPriority }) {
  if (priority === "Média") return null;
  return <Badge tom={PRIORITY_TONE[priority]}>{priority}</Badge>;
}
