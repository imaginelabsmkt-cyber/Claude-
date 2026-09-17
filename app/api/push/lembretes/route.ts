import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPushParaUsuario, pushDisponivel } from "@/lib/push/send";
import {
  hojeISO,
  ehArte,
  estaAtrasado,
  entregaEmAlerta,
} from "@/lib/rules/contents";

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
  const hojeData = new Date(`${hoje}T12:00:00-04:00`);
  const daqui2 = new Date(hojeData);
  daqui2.setDate(daqui2.getDate() + 2);
  const limitePerto = hojeISO(daqui2); // "perto de vencer" = até 2 dias

  // Quem é do Planejamento (Vitória) — recebe também o atraso de conteúdos.
  const { data: planners } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "planner");
  const idsPlanner = new Set((planners ?? []).map((p) => p.id));

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

  // Demandas até 2 dias à frente, não concluídas, não arquivadas.
  const { data: demandas } = await admin
    .from("demands")
    .select("title, due_date, status, assignee_ids, archived_at")
    .is("archived_at", null)
    .neq("status", "Feita")
    .not("due_date", "is", null)
    .lte("due_date", limitePerto);

  // Conteúdos atrasados / perto de entregar (para o Planejamento).
  const { data: conteudos } = await admin
    .from("contents")
    .select(
      "status, planned_date, recording_deadline, editing_deadline, is_fixed_date",
    );
  const conteudosAtrasados = (conteudos ?? []).filter((c) =>
    estaAtrasado(c, hojeData),
  ).length;
  const conteudosPerto = (conteudos ?? []).filter((c) =>
    entregaEmAlerta(c, hojeData),
  ).length;

  let enviados = 0;
  for (const uid of userIds) {
    const minhas = (demandas ?? []).filter((d) =>
      (d.assignee_ids ?? []).includes(uid),
    );
    const atrasadas = minhas.filter((d) => (d.due_date ?? "") < hoje).length;
    const venceHoje = minhas.filter((d) => d.due_date === hoje).length;
    const perto = minhas.filter(
      (d) => (d.due_date ?? "") > hoje && (d.due_date ?? "") <= limitePerto,
    ).length;

    const ehPlanner = idsPlanner.has(uid);
    const partes: string[] = [];

    // Atrasos primeiro (o mais urgente).
    if (atrasadas > 0) {
      partes.push(`⚠️ ${atrasadas} demanda${atrasadas > 1 ? "s" : ""} atrasada${atrasadas > 1 ? "s" : ""}`);
    }
    if (ehPlanner && conteudosAtrasados > 0) {
      partes.push(`⚠️ ${conteudosAtrasados} conteúdo${conteudosAtrasados > 1 ? "s" : ""} atrasado${conteudosAtrasados > 1 ? "s" : ""}`);
    }
    if (venceHoje > 0) {
      partes.push(`⏰ ${venceHoje} vence${venceHoje > 1 ? "m" : ""} hoje`);
    }
    if (perto > 0) {
      partes.push(`🔜 ${perto} perto de vencer`);
    }
    if (ehPlanner && conteudosPerto > 0) {
      partes.push(`🔜 ${conteudosPerto} conteúdo${conteudosPerto > 1 ? "s" : ""} pra entregar`);
    }
    if (gravacoesHoje.length > 0) {
      partes.push(`🎥 ${gravacoesHoje.length} gravação${gravacoesHoje.length > 1 ? "ões" : ""} hoje`);
    }
    if (partes.length === 0) continue; // nada pra avisar

    const temAtraso = atrasadas > 0 || (ehPlanner && conteudosAtrasados > 0);
    const n = await enviarPushParaUsuario(admin, uid, {
      title: temAtraso ? "⚠️ Atenção: prazos" : "Bom dia! Agenda de hoje",
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
