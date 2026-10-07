import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  inicioDaSemana,
  hojeISO,
  ehCapa,
  ehArte,
  estaGravado,
  mesEfetivo,
} from "@/lib/rules/contents";
import { organizarRoteiro } from "@/lib/portal/roteiro";
import { formatarData } from "@/lib/utils";
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

/**
 * Status considerados "em edição" (já foi gravado e está sendo editado/
 * finalizado). Não inclui "Aguardando gravação" (ainda vai gravar) nem os já
 * prontos pra postar (Aprovado/Agendado).
 */
const EM_EDICAO: ContentStatus[] = [
  "Gravado",
  "Fila de edição",
  "Em edição",
  "Ajustes",
  "Revisão interna",
  "Aprovação do cliente",
];

function addDias(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/**
 * Limpa o título para o CLIENTE ver: tira traços/símbolos soltos do começo e os
 * códigos internos entre parênteses no fim (ex.: "(base 2, Fixado, Tráfego)",
 * "(tráfego, Segunda Rodada)"). Só remove o parêntese final quando ele tem
 * cara de anotação interna (não mexe num parêntese comum do título).
 */
function limparTitulo(t: string): string {
  let s = t.replace(/^[\s–—·•-]+/, "").trim();
  // parêntese no fim com palavra interna conhecida
  s = s
    .replace(
      /\s*\((?:[^)]*\b(?:base|fixad[oa]|tr[aá]fego|rodada|an[uú]ncio|principal|reels?|carross?el|story|stories|capa|trend|v\d+)\b[^)]*)\)\s*$/i,
      "",
    )
    .trim();
  return s || t.trim();
}

/**
 * Marcadores de SEÇÃO INTERNA dentro da legenda. Tudo a partir da primeira
 * linha que começa com um desses (direções de arte/anúncio/stories/roteiro) é
 * interno e NÃO vai pro cliente. A legenda de verdade fica antes disso.
 */
const INICIO_INTERNO =
  /^(card\s*extra|destaque|story|stories|direcionamento|t[ií]tulo\s*:|subt[ií]tulo\s*:|foto\s*:|capa\b|roteiro|cenas?\b|fala\b|fica como est[aá]|lettering|refer[eê]ncia|observa[çc])/i;

/** Corta a legenda nos marcadores internos, deixando só o que vai pro cliente. */
function limparLegenda(caption: string | null): string | null {
  if (!caption) return caption;
  const linhas = caption.split(/\r?\n/);
  const saida: string[] = [];
  for (const l of linhas) {
    const base = l
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim();
    if (INICIO_INTERNO.test(base)) break;
    saida.push(l);
  }
  return saida.join("\n").trim() || null;
}

function paraPost(c: Content): PortalPost {
  return {
    id: c.id,
    title: limparTitulo(c.title),
    format: c.format,
    status: c.status,
    data: c.actual_post_date ?? c.planned_date,
    caption: limparLegenda(c.caption),
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
  noStore(); // nunca cacheia os dados do painel: sempre lê o estado atual
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

  // Agenda do MÊS exibido: todas as postagens planejadas (carrosséis, reels…)
  // com data, pra o cliente ver o que vem e quando, de forma organizada.
  const midMes = addDias(ini, 3);
  const mesExibido = `${midMes.getFullYear()}-${String(midMes.getMonth() + 1).padStart(2, "0")}`;
  const postsMes = visiveis
    .filter((c) => {
      const d = c.actual_post_date ?? c.planned_date;
      return !!d && d.slice(0, 7) === mesExibido;
    })
    .sort((a, b) =>
      (a.actual_post_date ?? a.planned_date ?? "").localeCompare(
        b.actual_post_date ?? b.planned_date ?? "",
      ),
    )
    .map(paraPost);

  // Mês da semana exibida (quinta define o mês), pra incluir as produções do
  // mês que ainda NÃO têm data ("a agendar", ex.: a sessão de fotos do mês).
  const midSemana = addDias(ini, 3);
  const mesSemana = `${midSemana.getFullYear()}-${String(midSemana.getMonth() + 1).padStart(2, "0")}`;

  // Produções AINDA A FAZER (não as já gravadas: essas vão pra "Em edição").
  // Inclui: as desta semana, as atrasadas (a remarcar) e as do mês que ainda
  // não têm data marcada (a agendar — ex.: a sessão de fotos do mês).
  const ehGravacaoSemana = (c: Content) => {
    if (!c.requires_recording || ehArte(c.format) || estaGravado(c.status)) {
      return false;
    }
    if (c.recording_date) return c.recording_date <= fimISO;
    // Sem data: mostra como "a agendar" se for do mês exibido.
    return mesEfetivo(c) === mesSemana;
  };

  const gravacoesSemana: PortalGravacao[] = visiveis
    .filter(ehGravacaoSemana)
    .sort((a, b) =>
      // Sem data (a agendar) primeiro; depois por data.
      (a.recording_date ?? "0000").localeCompare(b.recording_date ?? "0000"),
    )
    .map((c) => ({
      id: c.id,
      title: limparTitulo(c.title),
      format: c.format,
      data: c.recording_date,
      hora: c.recording_time,
      local: c.recording_location,
      roteiro: organizarRoteiro(c.script),
      situacao: estaGravado(c.status)
        ? ("gravado" as const)
        : !c.recording_date
          ? ("a_agendar" as const)
          : c.recording_date < hojeISO()
            ? ("a_remarcar" as const)
            : ("agendado" as const),
    }));
  const idsGravacao = new Set(gravacoesSemana.map((g) => g.id));

  // Em edição: já gravado e em edição/finalização (sem repetir o que já está
  // nas seções da semana).
  const emProducao = visiveis
    .filter(
      (c) =>
        !idsSemana.has(c.id) &&
        !idsGravacao.has(c.id) &&
        c.status !== "Publicado" &&
        EM_EDICAO.includes(c.status),
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
    sourcesBreakdown: res?.sources_breakdown ?? {},
    comment: res?.client_comment ?? null,
    respondido: !!res?.client_updated_at,
  };

  // Plano de ação (estratégias) — com link assinado para os arquivos.
  // Resiliente: se as colunas novas (owner/stage/date_label) ainda não existirem
  // (migração não rodada), cai pro básico em vez de sumir com o plano inteiro.
  type LinhaPlano = {
    id: string;
    title: string;
    type: string | null;
    status: string;
    description: string | null;
    file_path: string | null;
    file_name: string | null;
    owner?: string | null;
    stage?: string | null;
    date_label?: string | null;
    due_date?: string | null;
  };
  let estrategias: LinhaPlano[] | null = null;
  {
    const completo = await admin
      .from("action_plan_items")
      .select(
        "id, title, type, status, description, file_path, file_name, owner, stage, date_label, due_date, position",
      )
      .eq("client_id", cliente.id)
      .is("archived_at", null)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("position", { ascending: true });
    if (completo.error) {
      const basico = await admin
        .from("action_plan_items")
        .select("id, title, type, status, description, file_path, file_name, position")
        .eq("client_id", cliente.id)
        .is("archived_at", null)
        .order("position", { ascending: true });
      estrategias = (basico.data as LinhaPlano[] | null) ?? [];
    } else {
      estrategias = (completo.data as LinhaPlano[] | null) ?? [];
    }
  }
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
      owner: e.owner ?? "FAVIE",
      stage: e.stage ?? null,
      dateLabel: e.date_label?.trim() || (e.due_date ? formatarData(e.due_date) : null),
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
    postsSemana,
    postsMes,
    gravacoesSemana,
    emProducao,
    pausadosCancelados,
    planoAcao,
    demandas: (demandas ?? []) as PortalDemanda[],
  };
}
