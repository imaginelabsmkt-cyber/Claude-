import "server-only";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPushParaUsuario, pushDisponivel } from "@/lib/push/send";
import {
  hojeISO,
  ehArte,
  estaAtrasado,
  entregaEmAlerta,
} from "@/lib/rules/contents";

export type BlocoLembrete = "agenda" | "prazos" | "todos";

/**
 * Núcleo dos lembretes push. Dividido em blocos para não chegar tudo de uma
 * vez, cada bloco tem seu próprio horário (cron):
 *   - "agenda" (manhã): o que é de hoje, vence hoje, gravações de hoje.
 *   - "prazos" (tarde): pendências, atrasados (demandas/vídeos/artes) e o que
 *     está perto de vencer + sexta o aviso de relatórios prontos.
 *   - "todos": envia tudo (útil pra teste manual).
 * Protegido por CRON_SECRET quando configurado.
 */
export async function executarLembretes(
  req: Request,
  blocoForcado?: BlocoLembrete,
): Promise<NextResponse> {
  const segredo = process.env.CRON_SECRET;
  if (segredo) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${segredo}`) {
      return NextResponse.json(
        { ok: false, error: "não autorizado" },
        { status: 401 },
      );
    }
  }

  const bloco: BlocoLembrete =
    blocoForcado ??
    ((new URL(req.url).searchParams.get("bloco") as BlocoLembrete) || "todos");
  const fazAgenda = bloco === "agenda" || bloco === "todos";
  const fazPrazos = bloco === "prazos" || bloco === "todos";

  if (!pushDisponivel()) {
    return NextResponse.json({ ok: false, error: "push não configurado" });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "service role ausente" });
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id");
  const userIds = [...new Set((subs ?? []).map((s) => s.user_id))];
  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, enviados: 0 });
  }

  const hoje = hojeISO();
  const diaSemana = new Date(`${hoje}T12:00:00Z`).getUTCDay(); // 5 = sexta
  const hojeData = new Date(`${hoje}T12:00:00-04:00`);
  const daqui2 = new Date(hojeData);
  daqui2.setDate(daqui2.getDate() + 2);
  const limitePerto = hojeISO(daqui2);

  const { data: coord } = await admin
    .from("profiles")
    .select("id")
    .in("role", ["planner", "admin", "producer"]);
  const idsCoordenacao = new Set((coord ?? []).map((p) => p.id));

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

  const { data: demandas } = await admin
    .from("demands")
    .select("title, due_date, status, assignee_ids, archived_at")
    .is("archived_at", null)
    .neq("status", "Feita")
    .not("due_date", "is", null)
    .lte("due_date", limitePerto);

  const { data: conteudos } = await admin
    .from("contents")
    .select(
      "status, format, planned_date, recording_deadline, editing_deadline, is_fixed_date",
    );
  const atrasadosLista = (conteudos ?? []).filter((c) =>
    estaAtrasado(c, hojeData),
  );
  const videosAtrasados = atrasadosLista.filter((c) => !ehArte(c.format)).length;
  const artesAtrasadas = atrasadosLista.filter((c) => ehArte(c.format)).length;
  const conteudosPerto = (conteudos ?? []).filter((c) =>
    entregaEmAlerta(c, hojeData),
  ).length;

  const plural = (n: number, s: string, p: string) => (n > 1 ? p : s);

  const demAll = demandas ?? [];
  const totalAtrasadas = demAll.filter((d) => (d.due_date ?? "") < hoje).length;
  const totalHoje = demAll.filter((d) => d.due_date === hoje).length;
  const totalPerto = demAll.filter(
    (d) => (d.due_date ?? "") > hoje && (d.due_date ?? "") <= limitePerto,
  ).length;

  let enviados = 0;
  for (const uid of userIds) {
    const ehCoord = idsCoordenacao.has(uid);
    const minhas = demAll.filter((d) => (d.assignee_ids ?? []).includes(uid));

    const dAtras = ehCoord
      ? totalAtrasadas
      : minhas.filter((d) => (d.due_date ?? "") < hoje).length;
    const dHoje = ehCoord
      ? totalHoje
      : minhas.filter((d) => d.due_date === hoje).length;
    const dPerto = ehCoord
      ? totalPerto
      : minhas.filter(
          (d) => (d.due_date ?? "") > hoje && (d.due_date ?? "") <= limitePerto,
        ).length;

    const avisos: { title: string; body: string; url: string; tag: string }[] =
      [];

    // ----- PRAZOS (tarde) -----
    if (fazPrazos && dAtras > 0) {
      avisos.push({
        title: "⚠️ Demandas atrasadas",
        body: `${dAtras} ${plural(dAtras, "demanda passou", "demandas passaram")} do prazo.`,
        url: "/demandas",
        tag: "lembrete-demandas-atrasadas",
      });
    }
    if (fazPrazos && ehCoord && videosAtrasados > 0) {
      avisos.push({
        title: "🎬 Vídeos atrasados",
        body: `${videosAtrasados} ${plural(videosAtrasados, "vídeo passou", "vídeos passaram")} do prazo.`,
        url: "/conteudos",
        tag: "lembrete-videos-atrasados",
      });
    }
    if (fazPrazos && ehCoord && artesAtrasadas > 0) {
      avisos.push({
        title: "🎨 Artes atrasadas",
        body: `${artesAtrasadas} ${plural(artesAtrasadas, "arte passou", "artes passaram")} do prazo.`,
        url: "/artes",
        tag: "lembrete-artes-atrasadas",
      });
    }
    const pertoConteudo = ehCoord ? conteudosPerto : 0;
    if (fazPrazos && dPerto + pertoConteudo > 0) {
      const partes: string[] = [];
      if (dPerto > 0)
        partes.push(`${dPerto} ${plural(dPerto, "demanda", "demandas")}`);
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

    // ----- AGENDA (manhã) -----
    if (fazAgenda && dHoje > 0) {
      avisos.push({
        title: "⏰ Vence hoje",
        body: `${dHoje} ${plural(dHoje, "demanda", "demandas")} com prazo hoje.`,
        url: "/demandas",
        tag: "lembrete-hoje",
      });
    }
    if (fazAgenda && gravacoesHoje.length > 0) {
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

  // Sexta à tarde: relatórios da semana prontos (para a coordenação).
  if (fazPrazos && diaSemana === 5) {
    for (const uid of idsCoordenacao) {
      enviados += await enviarPushParaUsuario(admin, uid, {
        title: "📊 Relatórios da semana",
        body: "Prontos para revisar e enviar aos clientes.",
        url: "/relatorios",
        tag: "relatorio-semanal",
      });
    }
  }

  return NextResponse.json({ ok: true, enviados, bloco });
}
