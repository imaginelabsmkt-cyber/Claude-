/**
 * Prévia da área Metas: a faixa do Dashboard e o menu com a etapa
 * nova. Renderiza os componentes de verdade.
 */
import { describe, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => "/interno",
  useSearchParams: () => new URLSearchParams(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { FaixaDaMeta } from "@/components/metas/faixa-da-meta";
import { AREAS_EMPRESA, AREAS_PESSOAIS } from "@/lib/interno/areas";
import { Icone } from "@/components/interno/icone";

function Menu() {
  return (
    <nav className="w-56 shrink-0 rounded-2xl border border-gray-200 bg-white p-3">
      {[...AREAS_EMPRESA, ...AREAS_PESSOAIS].map((a) => (
        <span
          key={a.id}
          data-area={a.id}
          className="mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700"
        >
          <span className="text-area">
            <Icone nome={a.icone} className="h-[18px] w-[18px]" />
          </span>
          {a.label}
        </span>
      ))}
    </nav>
  );
}

describe("prévia", () => {
  it("escreve o HTML da área Metas", () => {
    writeFileSync(
      process.env.SAIDA_AREA_METAS!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="app.css"></head>
<body><div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">${renderToStaticMarkup(
        <div className="flex gap-6">
          <Menu />
          <div className="min-w-0 flex-1">
            <FaixaDaMeta
              meta={50000}
              mesDaMeta="2027-06"
              porMes={3}
              pedidos={18}
              noFunil={4}
              adiantadas={3}
              faltam={14}
              naoChega={false}
              clientesHoje={8}
              clientesNoFim={26}
            />
            <div className="mt-4">
              <FaixaDaMeta
                meta={50000}
                mesDaMeta="2027-06"
                porMes={30}
                pedidos={180}
                noFunil={4}
                adiantadas={3}
                faltam={176}
                naoChega
                clientesHoje={8}
                clientesNoFim={188}
              />
            </div>
          </div>
        </div>,
      )}</div></body></html>`,
    );
  });
});
