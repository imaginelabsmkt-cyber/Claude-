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

  // Coordenação (Planejamento/Vitória + Admin/você) — recebe também o atraso
  // de conteúdos da agência.
  const { data: coord } = await admin
    .from("profiles")
    .select("id")
    .in("role", ["planner", "admin"]);
  const idsCoordenacao = new Set((coord ?? []).map((p) => p.id));

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

  const plural = (n: number, s: string, p: string) => (n > 1 ? p : s);

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
    const ehCoord = idsCoordenacao.has(uid);

    // Cada assunto é uma notificação separada (organizada por tipo). O `tag`
    // fixo por tipo faz o aviso de hoje SUBSTITUIR o de ontem (não acumula).
    const avisos: {
      title: string;
      body: string;
      url: string;
      tag: string;
    }[] = [];

    // 1) Atrasados (demandas + conteúdos, se for coordenação).
    const atrasadosConteudo = ehCoord ? conteudosAtrasados : 0;
    if (atrasadas + atrasadosConteudo > 0) {
      const partes: string[] = [];
      if (atrasadas > 0)
        partes.push(`${atrasadas} ${plural(atrasadas, "demanda", "demandas")}`);
      if (atrasadosConteudo > 0)
        partes.push(
          `${atrasadosConteudo} ${plural(atrasadosConteudo, "conteúdo", "conteúdos")}`,
        );
      avisos.push({
        title: "⚠️ Atrasados",
        body: partes.join(" e ") + " passaram do prazo.",
        url: "/minhas-tarefas",
        tag: "lembrete-atrasados",
      });
    }

    // 2) Vencem hoje.
    if (venceHoje > 0) {
      avisos.push({
        title: "⏰ Vence hoje",
        body: `${venceHoje} ${plural(venceHoje, "demanda", "demandas")} com prazo hoje.`,
        url: "/minhas-tarefas",
        tag: "lembrete-hoje",
      });
    }

    // 3) Perto de vencer (próximos 2 dias).
    const pertoConteudo = ehCoord ? conteudosPerto : 0;
    if (perto + pertoConteudo > 0) {
      const partes: string[] = [];
      if (perto > 0)
        partes.push(`${perto} ${plural(perto, "demanda", "demandas")}`);
      if (pertoConteudo > 0)
        partes.push(
          `${pertoConteudo} ${plural(pertoConteudo, "conteúdo", "conteúdos")}`,
        );
      avisos.push({
        title: "🔜 Perto de vencer",
        body: partes.join(" e ") + " nos próximos dias.",
        url: "/minhas-tarefas",
        tag: "lembrete-perto",
      });
    }

    // 4) Gravações de hoje.
    if (gravacoesHoje.length > 0) {
      const q = gravacoesHoje.length;
      avisos.push({
        title: "🎥 Gravações hoje",
        body: `${q} ${plural(q, "gravação marcada", "gravações marcadas")} para hoje.`,
        url: "/gravacoes",
        tag: "lembrete-gravacoes",
      });
    }

    for (const aviso of avisos) {
      enviados += await enviarPushParaUsuario(admin, uid, aviso);
    }
  }

  return NextResponse.json({ ok: true, enviados });
}

export async function GET(req: Request) {
  return executar(req);
}
export async function POST(req: Request) {
  return executar(req);
}
