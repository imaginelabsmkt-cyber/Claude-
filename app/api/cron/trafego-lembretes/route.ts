import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validarCron } from "@/lib/cron-auth";
import { processarLembretes } from "@/lib/traffic/service";

export const dynamic = "force-dynamic";

/**
 * Rotina diária: dispara lembretes automáticos para as cobranças enviadas e
 * ainda não pagas, respeitando as regras de lembrete (dias de atraso,
 * intervalo e máximo). Agendada no vercel.json.
 */
export async function GET(request: NextRequest) {
  const erroAuth = validarCron(request);
  if (erroAuth) {
    return NextResponse.json({ ok: false, error: erroAuth }, { status: 401 });
  }

  try {
    const db = createAdminClient();
    const resumo = await processarLembretes(db);
    return NextResponse.json({ ok: true, ...resumo });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Falha." },
      { status: 500 },
    );
  }
}
