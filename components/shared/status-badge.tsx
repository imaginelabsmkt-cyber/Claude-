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

/** Badge de prioridade. O rótulo é o próprio valor (pt-BR). */
export function PriorityBadge({ priority }: { priority: ContentPriority }) {
  return <Badge tom={PRIORITY_TONE[priority]}>{priority}</Badge>;
}
