/**
 * Prévia visual da estante de Relatórios.
 *
 * Não é teste: não afirma nada. Renderiza a PÁGINA de verdade — sem
 * cópia do markup —, com o roteador fingido, porque o cabeçalho e as
 * abas são componentes de cliente.
 */
import { describe, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => "/interno/financeiro/relatorios",
  useSearchParams: () => new URLSearchParams("mes=2026-11"),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import RelatoriosPage from "@/app/interno/financeiro/relatorios/page";

describe("prévia", () => {
  it("escreve o HTML dos Relatórios", () => {
    writeFileSync(
      process.env.SAIDA_RELATORIOS!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="app.css"></head>
<body data-area="financeiro"><div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">${renderToStaticMarkup(
        <RelatoriosPage searchParams={{ mes: "2026-11" }} />,
      )}</div></body></html>`,
    );
  });
});
