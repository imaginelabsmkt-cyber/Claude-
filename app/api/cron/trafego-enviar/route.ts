import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validarCron } from "@/lib/cron-auth";
import {
  enviarPendentes,
  gerarCobrancasDaSemana,
} from "@/lib/traffic/service";

export const dynamic = "force-dynamic";

/**
 * Rotina semanal (segunda-feira): gera as cobranças da semana para todos os
 * clientes marcados e envia automaticamente as que já têm Pix cadastrado
 * (Pix fixo). As demais ficam "Pendentes" aguardando você colar o código na
 * página de Tráfego. Agendada no vercel.json.
 */
export async function GET(request: NextRequest) {
  const erroAuth = validarCron(request);
  if (erroAuth) {
    return NextResponse.json({ ok: false, error: erroAuth }, { status: 401 });
  }

  try {
    const db = createAdminClient();
    const geracao = await gerarCobrancasDaSemana(db);
    const envio = await enviarPendentes(db);
    return NextResponse.json({
      ok: true,
      geradas: geracao.criadas,
      ...envio,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Falha." },
      { status: 500 },
    );
  }
}
