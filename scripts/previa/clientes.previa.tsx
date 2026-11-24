/**
 * Prévia do botão "Inativar" na carteira de clientes.
 *
 * Renderiza o ContratosPanel DE VERDADE, com um cliente sem contrato,
 * que é o caso em que o botão aparece.
 */
import { describe, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => "/interno/administrativo/clientes",
  useSearchParams: () => new URLSearchParams(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { ContratosPanel } from "@/components/contratos/contratos-panel";

describe("prévia", () => {
  it("escreve o HTML da carteira", () => {
    writeFileSync(
      process.env.SAIDA_CLIENTES!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="app.css"></head>
<body data-area="administrativo"><div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">${renderToStaticMarkup(
        <ContratosPanel
          contratos={[]}
          clientes={[
            { id: "1", name: "Studio Salte" },
            { id: "2", name: "Kiku Sushi" },
          ]}
          semContrato={[
            { id: "1", name: "Studio Salte" },
            { id: "2", name: "Kiku Sushi" },
          ]}
          hoje="2026-11-24"
          rendeuNoAno={{}}
        />,
      )}</div></body></html>`,
    );
  });
});
