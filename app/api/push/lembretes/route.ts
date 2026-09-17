import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPushParaUsuario, pushDisponivel } from "@/lib/push/send";
import { hojeISO, ehArte } from "@/lib/rules/contents";

// Roda no servidor (precisa das chaves e do service role).
export const dynamic = "force-dynamic";

/**
 * Cron diário: envia a cada pessoa (com notificação ativa) um resumo do dia —
 * gravações de hoje e demandas com prazo até hoje. Disparado pela Vercel Cron.
 * Protegido por CRON_SECRET quando configurado.
 */
async function executar(req: Request): Promise<NextResponse> {
  const segredo = process.env.CRON_SECRET;
  if (segredo) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${segredo}`) {
      return NextResponse.json({ ok: false, error: "não autorizado" }, { status: 401 });
    }
  }

  if (!pushDisponivel()) {
    return NextResponse.json({ ok: false, error: "push não configurado" });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "service role ausente" });
  }

  // Quem tem notificação ativa.
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id");
  const userIds = [...new Set((subs ?? []).map((s) => s.user_id))];
  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, enviados: 0 });
  }

  const hoje = hojeISO();

  // Gravações de hoje (da agência).
  const { data: gravacoes } = await admin
    .from("contents")
    .select("title, format, status, requires_recording, recording_date")
    .eq("recording_date", hoje);
  const gravacoesHoje = (gravacoes ?? []).filter(
    (c) =>
      c.requires_recording &&
      !ehArte(c.format) &&
      c.status !== "Cancelado" &&
      c.status !== "Publicado",
  );

  // Demandas com prazo até hoje, não concluídas, não arquivadas.
  const { data: demandas } = await admin
    .from("demands")
    .select("title, due_date, status, assignee_ids, archived_at")
    .is("archived_at", null)
    .neq("status", "Feita")
    .not("due_date", "is", null)
    .lte("due_date", hoje);

  let enviados = 0;
  for (const uid of userIds) {
    const minhasDemandas = (demandas ?? []).filter((d) =>
      (d.assignee_ids ?? []).includes(uid),
    );
    const partes: string[] = [];
    if (gravacoesHoje.length > 0) {
      partes.push(
        `🎥 ${gravacoesHoje.length} gravação${gravacoesHoje.length > 1 ? "ões" : ""} hoje`,
      );
    }
    if (minhasDemandas.length > 0) {
      partes.push(
        `✅ ${minhasDemandas.length} demanda${minhasDemandas.length > 1 ? "s" : ""} no prazo`,
      );
    }
    if (partes.length === 0) continue; // nada pra avisar hoje

    const n = await enviarPushParaUsuario(admin, uid, {
      title: "Bom dia! Agenda de hoje",
      body: partes.join(" · "),
      url: gravacoesHoje.length > 0 ? "/gravacoes" : "/minhas-tarefas",
      tag: "lembrete-diario",
    });
    enviados += n;
  }

  return NextResponse.json({ ok: true, enviados });
}

export async function GET(req: Request) {
  return executar(req);
}
export async function POST(req: Request) {
  return executar(req);
}
