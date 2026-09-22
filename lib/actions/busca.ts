"use server";

import { buscarTudo, type ResultadoBusca } from "@/lib/data/busca";

/**
 * Busca global, chamada pela paleta de comandos (⌘K).
 *
 * É server action porque a busca roda no servidor, com a sessão do
 * usuário — o navegador nunca recebe nada que o RLS não deixaria passar.
 */
export async function buscarAction(termo: string): Promise<ResultadoBusca[]> {
  return buscarTudo(termo);
}
