import "server-only";
import { waitUntil } from "@vercel/functions";

/**
 * Executa `fn` DEPOIS que a resposta da ação já foi enviada ao navegador.
 *
 * Usado para a sincronização com o Google (mão única, "melhor esforço"): o
 * botão responde na hora, assim que o banco é gravado, e o Google Agenda /
 * Tarefas é atualizado em segundo plano, sem travar a interface esperando a API
 * responder (que às vezes renova token, faz vários round-trips, etc.).
 *
 * Na Vercel, `waitUntil` mantém a função viva até o trabalho terminar (ao
 * contrário de um fire-and-forget solto, que poderia ser congelado no meio).
 * Fora da Vercel (dev), a promise simplesmente roda no processo, que continua
 * de pé. Qualquer erro é engolido aqui, a ação principal nunca quebra por
 * causa do Google.
 */
export function aposResposta(fn: () => Promise<unknown>): void {
  const trabalho = (async () => {
    try {
      await fn();
    } catch {
      // melhor esforço, nunca derruba a ação principal
    }
  })();

  try {
    waitUntil(trabalho);
  } catch {
    // Sem contexto de requisição (ex.: fora da Vercel): a promise já está
    // rodando; deixa seguir sem travar a resposta.
  }
}
