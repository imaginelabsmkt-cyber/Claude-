import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { inicioDaSemana, hojeISO, ehCapa } from "@/lib/rules/contents";
import type { Content, ContentStatus } from "@/types";
import type {
  DadosPortal,
  PortalDemanda,
  PortalPost,
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

function paraPost(c: Content): PortalPost {
  return {
    id: c.id,
    title: c.title,
    format: c.format,
    status: c.status,
    data: c.actual_post_date ?? c.planned_date,
    script: c.script,
    caption: c.caption,
    aguardaAprovacao: c.status === "Aprovação do cliente",
  };
}

/**
 * Carrega os dados do painel do cliente a partir do TOKEN (link secreto). Usa a
 * service role e filtra tudo pelo cliente do token — o cliente nunca vê dado de
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
    .select("id, name, color")
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
  const emProducao = visiveis
    .filter(
      (c) =>
        !idsSemana.has(c.id) &&
        c.status !== "Publicado" &&
        EM_PRODUCAO.includes(c.status),
    )
    .sort((a, b) =>
      (a.planned_date ?? "zzzz").localeCompare(b.planned_date ?? "zzzz"),
    )
    .map(paraPost);

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
    postsSemana,
    emProducao,
    demandas: (demandas ?? []) as PortalDemanda[],
  };
}
