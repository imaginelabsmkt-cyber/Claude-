"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusContentBadge } from "@/components/shared/status-badge";
import { ehArte } from "@/lib/rules/contents";
import type { SearchClient, SearchContent } from "@/lib/data/search";

/** Remove acentos e caixa para uma busca "tolerante". */
function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function GlobalSearch({
  clients,
  contents,
}: {
  clients: SearchClient[];
  contents: SearchContent[];
}) {
  const [q, setQ] = useState("");
  const termo = normalizar(q);

  const clientesById = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  );

  const { clientesAch, conteudosAch } = useMemo(() => {
    if (termo.length < 2) return { clientesAch: [], conteudosAch: [] };
    const clientesAch = clients
      .filter(
        (c) =>
          normalizar(c.name).includes(termo) ||
          normalizar(c.niche ?? "").includes(termo),
      )
      .slice(0, 8);
    const conteudosAch = contents
      .filter((c) => {
        const nomeCli = clientesById.get(c.client_id)?.name ?? "";
        return (
          normalizar(c.title).includes(termo) ||
          normalizar(nomeCli).includes(termo)
        );
      })
      .slice(0, 30);
    return { clientesAch, conteudosAch };
  }, [termo, clients, contents, clientesById]);

  const semTermo = termo.length < 2;
  const semResultado =
    !semTermo && clientesAch.length === 0 && conteudosAch.length === 0;

  return (
    <div>
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"
          />
        </svg>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar cliente ou conteúdo por nome…"
          className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />
      </div>

      {semTermo ? (
        <p className="mt-4 text-sm text-gray-400">
          Digite pelo menos 2 letras para começar a buscar.
        </p>
      ) : semResultado ? (
        <p className="mt-4 text-sm text-gray-500">
          Nada encontrado para “{q}”. Tente outro termo.
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          {clientesAch.length > 0 ? (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Clientes ({clientesAch.length})
              </h2>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {clientesAch.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/clientes/${c.id}`}
                    className={`flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 ${i > 0 ? "border-t border-gray-100" : ""}`}
                  >
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full border border-gray-200"
                      style={{ backgroundColor: c.color ?? "#e5e7eb" }}
                      aria-hidden="true"
                    />
                    <span className="font-medium text-gray-900">{c.name}</span>
                    {c.niche ? (
                      <span className="text-xs text-gray-500">· {c.niche}</span>
                    ) : null}
                    {!c.active ? (
                      <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                        inativo
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {conteudosAch.length > 0 ? (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Conteúdos ({conteudosAch.length})
              </h2>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {conteudosAch.map((c, i) => {
                  const cli = clientesById.get(c.client_id);
                  return (
                    <Link
                      key={c.id}
                      href={`/conteudos/${c.id}`}
                      className={`flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 ${i > 0 ? "border-t border-gray-100" : ""}`}
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-gray-200"
                        style={{ backgroundColor: cli?.color ?? "#e5e7eb" }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium text-gray-900">
                        {c.title}
                      </span>
                      <span className="hidden shrink-0 text-xs text-gray-500 sm:inline">
                        {cli?.name ?? "—"}
                      </span>
                      <StatusContentBadge
                        status={c.status}
                        arte={ehArte(c.format)}
                      />
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
