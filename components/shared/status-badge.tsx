import { Badge } from "@/components/ui/badge";
import { rotuloStatus } from "@/lib/ui/rotulos-arte";
import {
  PRIORITY_TONE,
  STATUS_TONE,
  type ContentPriority,
  type ContentStatus,
} from "@/types";

/**
 * Badge de status do conteúdo. Em arte (Carrossel/Post estático) o texto usa a
 * linguagem de criação ("Em criação" em vez de "Em edição"); a cor não muda.
 */
export function StatusContentBadge({
  status,
  arte = false,
}: {
  status: ContentStatus;
  arte?: boolean;
}) {
  return <Badge tom={STATUS_TONE[status]}>{rotuloStatus(status, arte)}</Badge>;
}

/**
 * Badge de prioridade. "Média" é o padrão, então NÃO mostra nada (evita poluir
 * todos os conteúdos). Só destaca quando é Alta ou Baixa — o que importa ver.
 */
export function PriorityBadge({ priority }: { priority: ContentPriority }) {
  if (priority === "Média") return null;
  return <Badge tom={PRIORITY_TONE[priority]}>{priority}</Badge>;
}
