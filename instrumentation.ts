/**
 * Executado uma vez no boot do servidor (Next.js instrumentation).
 * Fixa o fuso horário do processo em São Paulo para que "hoje", prazos e
 * datas de gravação/postagem sejam calculados no horário do Brasil,
 * independentemente do fuso do host (a Vercel roda em UTC por padrão).
 * No Linux (glibc), a mudança de process.env.TZ passa a valer nas próximas
 * chamadas de Date.
 */
export function register() {
  if (!process.env.TZ) {
    process.env.TZ = "America/Boa_Vista";
  }
}
