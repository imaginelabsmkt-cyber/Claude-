import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Configuração do Vitest. As regras de negócio são funções puras, então
 * usamos o ambiente "node". O alias "@" espelha o tsconfig.
 *
 * Os `.test.tsx` entram junto. São poucos e todos do mesmo tipo:
 * renderizam um componente para texto e conferem o que ESTÁ ESCRITO —
 * não layout, não cor. Existem porque a mesma regra de escrita já
 * voltou a ser quebrada mais de uma vez ("Mensalidade" repetida em
 * toda linha), e regra que só vive na minha cabeça não resiste a uma
 * refatoração.
 */
export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", "scripts/previa/**"],
  },
});
