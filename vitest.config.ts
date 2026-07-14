import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Configuração do Vitest. As regras de negócio são funções puras, então
 * usamos o ambiente "node". O alias "@" espelha o tsconfig.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
});
