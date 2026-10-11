/**
 * Gera supabase/schema_completo.sql juntando todas as migrations na
 * ordem do nome (que é a ordem cronológica, por causa do timestamp).
 *
 * Existe para o arquivo único nunca divergir das migrations: a fonte
 * da verdade é supabase/migrations/, e este script só concatena.
 *
 *   node scripts/gerar-schema.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "supabase/migrations";
const SAIDA = "supabase/schema_completo.sql";

const arquivos = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const total = arquivos.length;
const largura = String(total).length;

const cabecalho = `-- =============================================================
-- FAVIE — SCHEMA COMPLETO (arquivo único)
--
-- Junta as ${total} migrations na ordem correta, para você colar UMA VEZ
-- no SQL Editor do Supabase em vez de rodar uma a uma.
--
-- É seguro rodar mais de uma vez: todas as partes são idempotentes.
-- Se parar no meio por algum motivo, pode rodar tudo de novo.
--
-- Gerado a partir de supabase/migrations/ — não edite este arquivo à
-- mão: mexa na migration correspondente e rode
-- \`node scripts/gerar-schema.mjs\`.
-- =============================================================

`;

const corpo = arquivos
  .map((nome, i) => {
    const n = String(i + 1).padStart(largura, "0");
    const marca = `
-- =============================================================
-- [${n}/${total}] ${nome}
-- =============================================================
`;
    return marca + "\n" + readFileSync(join(DIR, nome), "utf8").trimEnd() + "\n";
  })
  .join("\n");

writeFileSync(SAIDA, cabecalho + corpo, "utf8");
console.log(`${SAIDA}: ${total} migrations, ${(cabecalho + corpo).length} bytes`);
