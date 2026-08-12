import "server-only";
import type { NextRequest } from "next/server";

/**
 * Valida o segredo das rotas de automação (cron). O Vercel Cron envia
 * `Authorization: Bearer <CRON_SECRET>` automaticamente quando a variável
 * CRON_SECRET está configurada. Também aceitamos `?secret=` para testes
 * manuais.
 *
 * Retorna null quando autorizado, ou uma mensagem de erro caso contrário.
 */
export function validarCron(request: NextRequest): string | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return "CRON_SECRET não configurada no servidor.";
  }
  const header = request.headers.get("authorization");
  const viaHeader = header === `Bearer ${secret}`;
  const viaQuery = request.nextUrl.searchParams.get("secret") === secret;
  if (!viaHeader && !viaQuery) return "Não autorizado.";
  return null;
}
