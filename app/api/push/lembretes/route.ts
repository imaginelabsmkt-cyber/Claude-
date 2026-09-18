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
 * Cron dos lembretes. Disparado pela Vercel Cron em 2 horários (para não
 * chegar tudo de uma vez), via ?bloco=:
 *   - "agenda" (manhã): o que é de hoje — vence hoje, gravações de hoje.
 *   - "prazos" (tarde): pendências — atrasados (demandas/vídeos/artes) e o que
 *     está perto de vencer.
 * Sem bloco (ou "todos"), envia tudo (útil pra teste manual).
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

  const bloco = new URL(req.url).searchParams.get("bloco") ?? "todos";
  const fazAgenda = bloco === "agenda" || bloco === "todos";
  const fazPrazos = bloco === "prazos" || bloco === "todos";

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

  // Quem acompanha TUDO (Vitória + Fran + Admin) — recebe também o atraso de
  // conteúdos da agência, com a visão geral.
  const { data: coord } = await admin
    .from("profiles")
    .select("id")
    .in("role", ["planner", "admin", "producer"]);
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

  // Conteúdos atrasados / perto de entregar (para a coordenação), separando
  // VÍDEOS de ARTES.
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

  // Totais da AGÊNCIA (a coordenação — você + Vitória — vê tudo).
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

    // Coordenação enxerga a agência inteira; os demais, só o que é deles.
    const dAtras = ehCoord
      ? totalAtrasadas
      : minhas.filter((d) => (d.due_date ?? "") < hoje).length;
    const dHoje = ehCoord
      ? totalHoje
      : minhas.filter((d) => d.due_date === hoje).length;
    const dPerto = ehCoord
      ? totalPerto
      : minhas.filter(
          (d) =>
            (d.due_date ?? "") > hoje && (d.due_date ?? "") <= limitePerto,
        ).length;

    // Cada assunto é uma notificação separada (organizada por tipo). O `tag`
    // fixo por tipo faz o aviso de hoje SUBSTITUIR o de ontem (não acumula).
    const avisos: {
      title: string;
      body: string;
      url: string;
      tag: string;
    }[] = [];

    // ----- Bloco PRAZOS (tarde): pendências -----
    // Atrasados — cada tipo é uma notificação.
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

    // Perto de vencer (próximos 2 dias).
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

    // ----- Bloco AGENDA (manhã): o dia de hoje -----
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

  return NextResponse.json({ ok: true, enviados });
}

export async function GET(req: Request) {
  return executar(req);
}
export async function POST(req: Request) {
  return executar(req);
}
