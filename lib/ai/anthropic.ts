import Anthropic from "@anthropic-ai/sdk";

/**
 * Camada de IA (API da Claude). Usada para ler o diagnóstico e preencher o
 * DNA do cliente, e para "mastigar" o relatório em uma análise visual.
 *
 * Precisa da variável de ambiente ANTHROPIC_API_KEY no servidor.
 */

// Modelo padrão. Haiku = econômico (centavos por análise) e ótimo para ler
// diagnóstico e resumir relatório. Trocar aqui afeta todas as chamadas de IA
// (ex.: "claude-sonnet-5" ou "claude-opus-5" para análises mais afiadas).
export const MODELO_IA = "claude-haiku-4-5";

/** A IA está configurada (há chave)? */
export function iaDisponivel(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function criarClienteIA(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/** Junta os blocos de texto de uma resposta da Claude. */
export function textoDaResposta(msg: {
  content: Array<{ type: string; text?: string }>;
}): string {
  return msg.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n")
    .trim();
}

/**
 * Extrai o primeiro objeto JSON de um texto (tolerante a texto ao redor e a
 * cercas ```json). Retorna null se não achar JSON válido.
 */
export function extrairJSON<T = unknown>(texto: string): T | null {
  const semCerca = texto.replace(/```json\s*|\s*```/gi, "");
  const ini = semCerca.indexOf("{");
  const fim = semCerca.lastIndexOf("}");
  if (ini < 0 || fim <= ini) return null;
  try {
    return JSON.parse(semCerca.slice(ini, fim + 1)) as T;
  } catch {
    return null;
  }
}

/** Remove tags/scripts de um HTML e devolve texto legível. */
export function htmlParaTexto(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}
