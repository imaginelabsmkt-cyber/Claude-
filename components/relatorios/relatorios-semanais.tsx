"use client";

import { useMemo, useState } from "react";
import { toast } from "@/lib/ui/toast";

const NOMES_MES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function inicioSemana(d: Date): Date {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // 0 = segunda
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}
function fmtDia(isoStr: string): string {
  const [, m, dd] = isoStr.split("-").map(Number);
  return `${String(dd).padStart(2, "0")}/${NOMES_MES[m - 1] ?? m}`;
}

export interface RelContent {
  id: string;
  title: string;
  client_id: string;
  data: string | null; // data efetiva de publicação (real ou prevista)
}
export interface RelDemanda {
  id: string;
  title: string;
  client_id: string | null;
  category: string | null;
  dia: string; // updated_at (conclusão), YYYY-MM-DD
}
export interface RelCliente {
  id: string;
  name: string;
  color: string | null;
}

/**
 * Relatórios semanais por cliente: o que foi ENTREGUE na semana (conteúdos
 * publicados + demandas concluídas). Gera sozinho; a pessoa navega entre
 * semanas e copia o texto pronto pra mandar pro cliente.
 */
export function RelatoriosSemanais({
  clientes,
  contents,
  gravados,
  demandas,
}: {
  clientes: RelCliente[];
  contents: RelContent[];
  gravados: RelContent[];
  demandas: RelDemanda[];
}) {
  const [offset, setOffset] = useState(0); // 0 = semana atual

  const { ini, fim, porCliente } = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + offset * 7);
    const i = inicioSemana(base);
    const f = new Date(i);
    f.setDate(f.getDate() + 6);
    const iniISO = iso(i);
    const fimISO = iso(f);

    const noPeriodo = (d: string | null) =>
      !!d && d >= iniISO && d <= fimISO;

    const porCliente = clientes
      .map((c) => {
        const publicados = contents.filter(
          (ct) => ct.client_id === c.id && noPeriodo(ct.data),
        );
        const produzidos = gravados.filter(
          (ct) => ct.client_id === c.id && noPeriodo(ct.data),
        );
        const feitas = demandas.filter(
          (d) => d.client_id === c.id && noPeriodo(d.dia),
        );
        return { cliente: c, publicados, produzidos, feitas };
      })
      .filter(
        (r) =>
          r.publicados.length > 0 ||
          r.produzidos.length > 0 ||
          r.feitas.length > 0,
      );

    return { ini: iniISO, fim: fimISO, porCliente };
  }, [offset, clientes, contents, gravados, demandas]);

  const textoRelatorio = (r: (typeof porCliente)[number]): string => {
    const linhas = [
      `Relatório da semana, ${r.cliente.name}`,
      `${fmtDia(ini)} a ${fmtDia(fim)}`,
      "",
    ];
    if (r.publicados.length > 0) {
      linhas.push("Publicados:");
      for (const p of r.publicados) linhas.push(`  • ${p.title}`);
      linhas.push("");
    }
    if (r.produzidos.length > 0) {
      linhas.push("Gravados/produzidos:");
      for (const p of r.produzidos) linhas.push(`  • ${p.title}`);
      linhas.push("");
    }
    if (r.feitas.length > 0) {
      // agrupa por área
      const mapa = new Map<string, string[]>();
      for (const d of r.feitas) {
        const k = d.category?.trim() || "Geral";
        mapa.set(k, [...(mapa.get(k) ?? []), d.title]);
      }
      linhas.push("Outras entregas:");
      for (const [area, itens] of [...mapa.entries()].sort()) {
        linhas.push(`  ${area}:`);
        for (const t of itens) linhas.push(`    • ${t}`);
      }
    }
    return linhas.join("\n").trim();
  };

  const copiar = (r: (typeof porCliente)[number]) => {
    navigator.clipboard
      .writeText(textoRelatorio(r))
      .then(() => toast.sucesso("Relatório copiado!"))
      .catch(() => toast.erro("Não foi possível copiar."));
  };

  return (
    <div>
      {/* Navegação de semana */}
      <div className="mb-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setOffset((o) => o - 1)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Anterior
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {fmtDia(ini)} a {fmtDia(fim)}
          {offset === 0 ? " (atual)" : ""}
        </span>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(o + 1, 0))}
          disabled={offset >= 0}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          Próxima →
        </button>
      </div>

      {porCliente.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
          Nada entregue nesta semana ainda. O que for publicado ou marcado como
          concluído aparece aqui.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {porCliente.map((r) => (
            <div
              key={r.cliente.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold text-gray-900">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full border border-gray-200"
                    style={{ backgroundColor: r.cliente.color ?? "#6a2336" }}
                    aria-hidden="true"
                  />
                  {r.cliente.name}
                </span>
                <button
                  type="button"
                  onClick={() => copiar(r)}
                  className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  Copiar
                </button>
              </div>

              {r.publicados.length > 0 ? (
                <div className="mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    📤 Publicados ({r.publicados.length})
                  </p>
                  <ul className="mt-0.5 space-y-0.5">
                    {r.publicados.map((p) => (
                      <li key={p.id} className="text-sm text-gray-700">
                        • {p.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {r.produzidos.length > 0 ? (
                <div className="mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    🎬 Gravados/produzidos ({r.produzidos.length})
                  </p>
                  <ul className="mt-0.5 space-y-0.5">
                    {r.produzidos.map((p) => (
                      <li key={p.id} className="text-sm text-gray-700">
                        • {p.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {r.feitas.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    ✅ Outras entregas ({r.feitas.length})
                  </p>
                  <ul className="mt-0.5 space-y-0.5">
                    {r.feitas.map((d) => (
                      <li key={d.id} className="text-sm text-gray-700">
                        • {d.title}
                        {d.category ? (
                          <span className="text-gray-400"> ({d.category})</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
