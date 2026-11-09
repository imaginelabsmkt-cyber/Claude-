import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Configuração só para as PRÉVIAS visuais (`scripts/previa/*.previa.tsx`).
 *
 * As prévias renderizam um componente real para um HTML estático, com o
 * CSS do projeto, para a gente abrir no navegador e OLHAR antes de
 * subir. Nenhum teste automatizado julga layout; olho julga. Por isso
 * elas ficam fora do `vitest.config.ts`: não são teste, não entram no
 * `npm test` e não quebram o build.
 *
 * Como rodar (ver scripts/previa/README.md):
 *   npx tailwindcss -c tailwind.config.ts -i app/globals.css -o <saida>/app.css
 *   SAIDA=<saida>/grafico.html npx vitest run -c vitest.render.config.ts
 */
export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["scripts/previa/*.previa.tsx"],
  },
});
