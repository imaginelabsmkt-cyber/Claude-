import Link from "next/link";
import { papelResponsavel, ehArte } from "@/lib/rules/contents";
import { indexarPerfis } from "@/lib/data/contents";
import type { Content, ContentStatus, Profile } from "@/types";
import type { OpcaoCliente } from "@/lib/data/contents";

/**
 * Painel "Agora": mostra, num relance, o que a Fran (produção) e a Vitória
 * (planejamento) estão fazendo neste momento. Fica no topo do dashboard para
 * as duas sempre saberem em que a outra está trabalhando.
 *
 * Só entram os conteúdos em etapas de trabalho ATIVO (não os que estão
 * parados esperando cliente/gravação futura). O responsável de cada um sai de
 * `papelResponsavel` (já cruza vídeo x arte na revisão).
 */

interface VerboEtapa {
  video: string;
  arte: string;
  /** Classe de cor do selo da etapa. */
  tom: string;
}

// Etapas consideradas "trabalho acontecendo agora" + o verbo por tipo.
const ETAPAS_ATIVAS: Partial<Record<ContentStatus, VerboEtapa>> = {
  Planejamento: {
    video: "Planejando",
    arte: "Planejando",
    tom: "bg-brand-100 text-brand-700",
  },
  "Fila de edição": {
    video: "Na fila de edição",
    arte: "Na fila",
    tom: "bg-blue-100 text-blue-700",
  },
  "Em edição": {
    video: "Editando",
    arte: "Criando a arte",
    tom: "bg-amber-100 text-amber-700",
  },
  "Revisão interna": {
    video: "Revisando o vídeo",
    arte: "Revisando a arte",
    tom: "bg-violet-100 text-violet-700",
  },
  Ajustes: {
    video: "Ajustando",
    arte: "Ajustando",
    tom: "bg-red-100 text-red-700",
  },
  "Aprovação do cliente": {
    video: "Enviado ao cliente",
    arte: "Enviado ao cliente",
    tom: "bg-green-100 text-green-700",
  },
};

interface ItemAgora {
  content: Content;
  verbo: string;
  tom: string;
}

interface ColunaPessoa {
  nome: string;
  papel: "producer" | "planner";
  itens: ItemAgora[];
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "?";
  const segunda = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + segunda).toUpperCase();
}

export function AgoraPanel({
  contents,
  perfis,
  clientes,
}: {
  contents: Content[];
  perfis: Profile[];
  clientes: OpcaoCliente[];
}) {
  const { planner, producer } = indexarPerfis(perfis);
  const clientesById = new Map(clientes.map((c) => [c.id, c]));

  const daProdutora: ItemAgora[] = [];
  const daPlanejadora: ItemAgora[] = [];

  for (const c of contents) {
    const etapa = ETAPAS_ATIVAS[c.status];
    if (!etapa) continue;
    const item: ItemAgora = {
      content: c,
      verbo: ehArte(c.format) ? etapa.arte : etapa.video,
      tom: etapa.tom,
    };
    if (papelResponsavel(c) === "producer") daProdutora.push(item);
    else daPlanejadora.push(item);
  }

  // Mais urgentes primeiro (por data prevista), com um teto por coluna.
  const ordenar = (a: ItemAgora, b: ItemAgora) => {
    const da = a.content.planned_date ?? "9999";
    const db = b.content.planned_date ?? "9999";
    return da < db ? -1 : da > db ? 1 : 0;
  };
  daProdutora.sort(ordenar);
  daPlanejadora.sort(ordenar);

  const colunas: (ColunaPessoa & {
    corAvatar: string;
    corBarra: string;
    subtitulo: string;
  })[] = [
    {
      nome: producer?.name ?? "Produção",
      papel: "producer",
      itens: daProdutora,
      corAvatar: "bg-orange-100 text-orange-700 ring-orange-200",
      corBarra: "from-orange-400 to-rose-500",
      subtitulo: "Gravação · Edição",
    },
    {
      nome: planner?.name ?? "Planejamento",
      papel: "planner",
      itens: daPlanejadora,
      corAvatar: "bg-brand-100 text-brand-700 ring-brand-200",
      corBarra: "from-lilas-300 to-brand-500",
      subtitulo: "Planejamento · Arte",
    },
  ];

  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
        </span>
        Agora
        <span className="font-normal text-gray-400">
          · o que cada uma está fazendo
        </span>
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {colunas.map((col) => (
          <div
            key={col.papel}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <div className={`h-1.5 bg-gradient-to-r ${col.corBarra}`} />
            <div className="p-4">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-2 ${col.corAvatar}`}
                >
                  {iniciais(col.nome)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {col.nome}
                  </p>
                  <p className="text-xs text-gray-500">{col.subtitulo}</p>
                </div>
                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-gray-100 px-2 text-xs font-bold text-gray-700">
                  {col.itens.length}
                </span>
              </div>

              {col.itens.length === 0 ? (
                <p className="mt-4 rounded-xl bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">
                  Sem tarefas em andamento agora
                </p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {col.itens.slice(0, 6).map((item) => {
                    const cl = clientesById.get(item.content.client_id);
                    return (
                      <li
                        key={item.content.id}
                        className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-gray-50"
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-gray-200"
                          style={{ backgroundColor: cl?.color ?? "#e5e7eb" }}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <Link
                            href={`/conteudos/${item.content.id}`}
                            className="block truncate text-sm font-medium text-gray-800 hover:text-brand-700"
                          >
                            {item.content.title}
                          </Link>
                          <Link
                            href={`/clientes/${item.content.client_id}`}
                            className="block truncate text-[11px] text-gray-400 hover:text-brand-700 hover:underline"
                          >
                            {cl?.name ?? "—"}
                          </Link>
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${item.tom}`}
                        >
                          {item.verbo}
                        </span>
                      </li>
                    );
                  })}
                  {col.itens.length > 6 ? (
                    <li className="px-2 pt-1 text-[11px] text-gray-400">
                      +{col.itens.length - 6} em andamento
                    </li>
                  ) : null}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
