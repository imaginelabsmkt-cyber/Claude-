import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  inicioDaSemana,
  hojeISO,
  ehCapa,
  ehArte,
  mesEfetivo,
} from "@/lib/rules/contents";
import { organizarRoteiro } from "@/lib/portal/roteiro";
import type { Content, ContentStatus } from "@/types";
import type {
  DadosPortal,
  PortalDemanda,
  PortalEstrategia,
  PortalGravacao,
  PortalPost,
  ResumoMes,
} from "@/lib/portal/tipos";

export type { DadosPortal, PortalDemanda, PortalPost } from "@/lib/portal/tipos";
export { STATUS_CLIENTE } from "@/lib/portal/tipos";

/** Status internos que NÃO aparecem para o cliente. */
const OCULTOS: ContentStatus[] = ["Cancelado", "Pausado"];

/** Status considerados "em produção" (fora os que já vão ao ar na semana). */
const EM_PRODUCAO: ContentStatus[] = [
  "Aguardando gravação",
  "Gravado",
  "Fila de edição",
  "Em edição",
  "Revisão interna",
  "Aprovação do cliente",
  "Ajustes",
  "Aprovado",
  "Agendado",
];

function addDias(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Remove traços/símbolos soltos no começo do título (ex.: "- Título"). */
function limparTitulo(t: string): string {
  return t.replace(/^[\s–—·•-]+/, "").trim() || t.trim();
}

function paraPost(c: Content): PortalPost {
  return {
    id: c.id,
    title: limparTitulo(c.title),
    format: c.format,
    status: c.status,
    data: c.actual_post_date ?? c.planned_date,
    caption: c.caption,
    aguardaAprovacao: c.status === "Aprovação do cliente",
  };
}

/**
 * Carrega os dados do painel do cliente a partir do TOKEN (link secreto). Usa a
 * service role e filtra tudo pelo cliente do token, o cliente nunca vê dado de
 * outro. Retorna null se o token não existe ou o painel está desligado.
 */
export async function carregarPortal(
  token: string,
  semana?: string,
): Promise<DadosPortal | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: cliente } = await admin
    .from("clients")
    .select("id, name, color, monthly_goal")
    .eq("portal_token", token)
    .eq("portal_enabled", true)
    .eq("is_internal", false)
    .maybeSingle();
  if (!cliente) return null;

  const base = /^\d{4}-\d{2}-\d{2}$/.test(semana ?? "")
    ? new Date(`${semana}T12:00:00`)
    : new Date();
  const ini = inicioDaSemana(base);
  const fim = addDias(ini, 6);
  const iniISO = hojeISO(ini);
  const fimISO = hojeISO(fim);

  const { data: contents } = await admin
    .from("contents")
    .select("*")
    .eq("client_id", cliente.id);

  const visiveis = (contents ?? []).filter(
    (c) => !OCULTOS.includes(c.status) && !ehCapa(c),
  );

  const postsSemana = visiveis
    .filter((c) => {
      const d = c.actual_post_date ?? c.planned_date;
      return d && d >= iniISO && d <= fimISO;
    })
    .sort((a, b) =>
      (a.planned_date ?? "").localeCompare(b.planned_date ?? ""),
    )
    .map(paraPost);

  const idsSemana = new Set(postsSemana.map((p) => p.id));

  // Gravações marcadas na semana (com o roteiro organizado para leitura).
  const ehGravacaoSemana = (c: Content) =>
    c.requires_recording &&
    !ehArte(c.format) &&
    !!c.recording_date &&
    c.recording_date >= iniISO &&
    c.recording_date <= fimISO;

  const gravacoesSemana: PortalGravacao[] = visiveis
    .filter(ehGravacaoSemana)
    .sort((a, b) =>
      (a.recording_date ?? "").localeCompare(b.recording_date ?? ""),
    )
    .map((c) => ({
      id: c.id,
      title: limparTitulo(c.title),
      format: c.format,
      data: c.recording_date,
      hora: c.recording_time,
      local: c.recording_location,
      roteiro: organizarRoteiro(c.script),
    }));
  const idsGravacao = new Set(gravacoesSemana.map((g) => g.id));

  // Em produção: exclui o que já aparece nas seções da semana (sem repetir).
  const emProducao = visiveis
    .filter(
      (c) =>
        !idsSemana.has(c.id) &&
        !idsGravacao.has(c.id) &&
        c.status !== "Publicado" &&
        EM_PRODUCAO.includes(c.status),
    )
    .sort((a, b) =>
      (a.planned_date ?? "zzzz").localeCompare(b.planned_date ?? "zzzz"),
    )
    .map(paraPost);

  // Resumo do mês (mês da semana exibida): planejado x já publicado.
  const mid = addDias(ini, 3); // quinta-feira define o mês da semana
  const mesRef = `${mid.getFullYear()}-${String(mid.getMonth() + 1).padStart(2, "0")}`;
  const doMes = visiveis.filter((c) => mesEfetivo(c) === mesRef);
  const publicadosMes = doMes.filter((c) => c.status === "Publicado");

  // Pausados/cancelados do mês (transparência para o cliente).
  const pausadosCancelados = (contents ?? [])
    .filter(
      (c) =>
        !ehCapa(c) &&
        (c.status === "Pausado" || c.status === "Cancelado") &&
        mesEfetivo(c) === mesRef,
    )
    .sort((a, b) =>
      (a.planned_date ?? "").localeCompare(b.planned_date ?? ""),
    )
    .map(paraPost);
  const resumoMes: ResumoMes = {
    label: new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(mid),
    planejados: doMes.length,
    publicados: publicadosMes.length,
    restantes: Math.max(doMes.length - publicadosMes.length, 0),
    meta: cliente.monthly_goal ?? null,
    jaFeitos: publicadosMes
      .sort((a, b) =>
        (b.actual_post_date ?? b.planned_date ?? "").localeCompare(
          a.actual_post_date ?? a.planned_date ?? "",
        ),
      )
      .map(paraPost),
  };

  // Resultados da SEMANA (tráfego + retorno do cliente).
  const { data: res } = await admin
    .from("client_monthly_results")
    .select("*")
    .eq("client_id", cliente.id)
    .eq("week_start", iniISO)
    .maybeSingle();
  const resultado = {
    weekStart: iniISO,
    metrics: res?.metrics ?? [],
    table: res?.traffic_table ?? null,
    teamNote: res?.team_note ?? null,
    closedCount: res?.closed_count ?? null,
    sources: res?.sources ?? null,
    comment: res?.client_comment ?? null,
    respondido: !!res?.client_updated_at,
  };

  // Relatório da semana escrito pela equipe (o "nosso lado"), texto e/ou arquivo.
  const { data: notaRow } = await admin
    .from("client_weekly_notes")
    .select("note, file_path, file_name")
    .eq("client_id", cliente.id)
    .eq("week_start", iniISO)
    .maybeSingle();
  const recadoSemana = notaRow?.note ?? null;
  let recadoArquivo: { url: string; name: string } | null = null;
  if (notaRow?.file_path) {
    const { data: assinado } = await admin.storage
      .from("client-files")
      .createSignedUrl(notaRow.file_path, 60 * 60);
    if (assinado?.signedUrl) {
      recadoArquivo = {
        url: assinado.signedUrl,
        name: notaRow.file_name ?? "Relatório da semana",
      };
    }
  }

  // Plano de ação (estratégias) — com link assinado para os arquivos.
  const { data: estrategias } = await admin
    .from("action_plan_items")
    .select("id, title, type, status, description, file_path, file_name")
    .eq("client_id", cliente.id)
    .is("archived_at", null)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  const planoAcao: PortalEstrategia[] = [];
  for (const e of estrategias ?? []) {
    let arquivo: { url: string; name: string } | null = null;
    if (e.file_path) {
      const { data: a } = await admin.storage
        .from("client-files")
        .createSignedUrl(e.file_path, 60 * 60);
      if (a?.signedUrl)
        arquivo = { url: a.signedUrl, name: e.file_name ?? "Arquivo" };
    }
    planoAcao.push({
      id: e.id,
      title: e.title,
      type: e.type,
      status: e.status,
      description: e.description,
      arquivo,
    });
  }

  const { data: demandas } = await admin
    .from("demands")
    .select("id, title, category, status")
    .eq("client_id", cliente.id)
    .is("archived_at", null)
    .neq("status", "Feita")
    .order("created_at", { ascending: true });

  return {
    cliente,
    semanaISO: iniISO,
    iniISO,
    fimISO,
    resumoMes,
    resultado,
    recadoSemana,
    recadoArquivo,
    postsSemana,
    gravacoesSemana,
    emProducao,
    pausadosCancelados,
    planoAcao,
    demandas: (demandas ?? []) as PortalDemanda[],
  };
}
