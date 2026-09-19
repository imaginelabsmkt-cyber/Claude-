"use client";

import { useMemo, useState } from "react";
import { toast } from "@/lib/ui/toast";
import type { Demand } from "@/types";

const NOMES_MES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** Item de conteúdo no relatório (publicado ou gravado). */
export interface ItemRelatorio {
  id: string;
  title: string;
  data: string | null; // YYYY-MM-DD
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** Segunda-feira da semana que contém `d`. */
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

/**
 * Relatório semanal do cliente: o que foi ENTREGUE na semana, publicados +
 * gravados/produzidos + demandas concluídas (por área). Navega entre semanas e
 * copia um resumo pronto para enviar ao cliente.
 */
export function ClientWeeklyReport({
  clienteNome,
  publicados = [],
  gravados = [],
  feitas,
}: {
  clienteNome: string;
  publicados?: ItemRelatorio[];
  gravados?: ItemRelatorio[];
  /** Demandas concluídas (Feita), inclusive arquivadas, data em updated_at. */
  feitas: Demand[];
}) {
  const [offset, setOffset] = useState(0); // 0 = semana atual, -1 = anterior…

  const { ini, fim, pub, grav, dem, grupos, temAlgo } = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + offset * 7);
    const i = inicioSemana(base);
    const f = new Date(i);
    f.setDate(f.getDate() + 6);
    const iniISO = iso(i);
    const fimISO = iso(f);
    const naSemana = (d: string | null) => !!d && d >= iniISO && d <= fimISO;

    const pub = publicados.filter((p) => naSemana(p.data));
    const grav = gravados.filter((p) => naSemana(p.data));
    const dem = feitas.filter((d) => naSemana((d.updated_at ?? "").slice(0, 10)));

    const mapa = new Map<string, Demand[]>();
    for (const d of dem) {
      const k = d.category?.trim() || "Geral";
      mapa.set(k, [...(mapa.get(k) ?? []), d]);
    }
    const grupos = [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    return {
      ini: iniISO,
      fim: fimISO,
      pub,
      grav,
      dem,
      grupos,
      temAlgo: pub.length + grav.length + dem.length > 0,
    };
  }, [offset, publicados, gravados, feitas]);

  const copiar = () => {
    const linhas = [
      `Relatório, ${clienteNome}`,
      `Semana de ${fmtDia(ini)} a ${fmtDia(fim)}`,
      "",
    ];
    if (!temAlgo) {
      linhas.push("Nenhuma entrega nesta semana.");
    } else {
      if (pub.length > 0) {
        linhas.push("Publicados:");
        for (const p of pub) linhas.push(`  • ${p.title}`);
        linhas.push("");
      }
      if (grav.length > 0) {
        linhas.push("Gravados/produzidos:");
        for (const p of grav) linhas.push(`  • ${p.title}`);
        linhas.push("");
      }
      if (dem.length > 0) {
        linhas.push("Outras entregas:");
        for (const [area, itens] of grupos) {
          linhas.push(`  ${area}:`);
          for (const d of itens) linhas.push(`    • ${d.title}`);
        }
      }
    }
    navigator.clipboard
      .writeText(linhas.join("\n").trim())
      .then(() => toast.sucesso("Relatório copiado!"))
      .catch(() => toast.erro("Não foi possível copiar."));
  };

  const Secao = ({
    titulo,
    itens,
  }: {
    titulo: string;
    itens: ItemRelatorio[];
  }) =>
    itens.length === 0 ? null : (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {titulo} ({itens.length})
        </p>
        <ul className="mt-0.5 space-y-0.5">
          {itens.map((p) => (
            <li key={p.id} className="text-sm text-gray-700">
              • {p.title}
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            Relatório da semana
          </span>
          <button
            type="button"
            onClick={() => setOffset((o) => o - 1)}
            aria-label="Semana anterior"
            className="rounded-md border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            ←
          </button>
          <span className="text-xs font-medium text-gray-600">
            {fmtDia(ini)} a {fmtDia(fim)}
            {offset === 0 ? " (atual)" : ""}
          </span>
          <button
            type="button"
            onClick={() => setOffset((o) => Math.min(o + 1, 0))}
            disabled={offset >= 0}
            aria-label="Próxima semana"
            className="rounded-md border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            →
          </button>
        </div>
        <button
          type="button"
          onClick={copiar}
          className="rounded-md bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700"
        >
          Copiar relatório
        </button>
      </div>

      {!temAlgo ? (
        <p className="text-xs text-gray-400">
          Nada entregue nesta semana ainda. Conteúdos publicados/gravados e
          demandas concluídas aparecem aqui.
        </p>
      ) : (
        <div className="space-y-2">
          <Secao titulo="📤 Publicados" itens={pub} />
          <Secao titulo="🎬 Gravados/produzidos" itens={grav} />
          {dem.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                ✅ Outras entregas ({dem.length})
              </p>
              <div className="mt-0.5 space-y-1.5">
                {grupos.map(([area, itens]) => (
                  <div key={area}>
                    <p className="text-[11px] font-medium text-gray-500">
                      {area}
                    </p>
                    <ul className="space-y-0.5">
                      {itens.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center gap-2 text-sm text-gray-700"
                        >
                          <span className="text-green-600">✓</span>
                          <span>{d.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
