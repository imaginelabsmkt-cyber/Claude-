import { formatarDataHora } from "@/lib/utils";
import type { ContentHistory } from "@/types";

interface HistoryTimelineProps {
  itens: ContentHistory[];
  nomePorId: Map<string, string>;
}

/**
 * Linha do tempo (somente leitura) das alterações do conteúdo.
 * O histórico é imutável: não há edição manual.
 */
export function HistoryTimeline({ itens, nomePorId }: HistoryTimelineProps) {
  if (itens.length === 0) {
    return (
      <p className="text-sm text-gray-400">Nenhuma alteração registrada ainda.</p>
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-gray-200 pl-5">
      {itens.map((h) => (
        <li key={h.id} className="relative">
          <span className="absolute -left-[1.42rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500" />
          <p className="text-sm text-gray-800">
            <span className="font-medium">{h.field_changed}</span>{" "}
            <span className="text-gray-500">
              de “{h.old_value ?? "—"}” para “{h.new_value ?? "—"}”
            </span>
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {h.user_id ? (nomePorId.get(h.user_id) ?? "Usuário") : "Sistema"} ·{" "}
            {formatarDataHora(h.created_at)}
          </p>
        </li>
      ))}
    </ol>
  );
}
