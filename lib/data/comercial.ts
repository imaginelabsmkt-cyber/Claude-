import { createClient } from "@/lib/supabase/server";
import { somar } from "@/lib/financeiro/calculo";
import { rotuloMesCurto } from "@/lib/financeiro/meses";
import type {
  Activity,
  Investment,
  FinancialEntry,
  Lead,
  LeadChannel,
  LeadStage,
  LeadWithRelations,
  Proposal,
} from "@/types";

/** Um cliente visto pelo lado comercial. */
export interface ClienteCarteira {
  id: string;
  nome: string;
  /** Mensalidade recorrente vigente (0 se não houver). */
  mensal: number;
  /** Quanto já pagou no ano corrente. */
  pagoNoAno: number;
  /** Quanto ainda deve no mês em foco. */
  pendenteNoMes: number;
  /** Último mês em que pagou algo (rótulo curto). */
  ultimoMes: string | null;
  /** Valor do último pagamento. */
  ultimoValor: number;
  /** Vídeos por mês no contrato. `null` quando o contrato não diz. */
  videosPorMes: number | null;
}

export interface Carteira {
  ativos: ClienteCarteira[];
  inativos: ClienteCarteira[];
  /** Soma das mensalidades recorrentes vigentes. */
  recorrente: number;
  /** Soma das despesas recorrentes vigentes. */
  custoFixo: number;
  /** Mensalidade média dos clientes ativos que têm uma. */
  ticketMedio: number;
  /** Quanto os clientes que saíram levavam por mês. */
  perdidoPorMes: number;
  /**
   * Vídeos por mês somados nos contratos dos clientes ativos.
   *
   * É o que dimensiona editor e videomaker na projeção. Só soma quem
   * tem o número no contrato: quem está em branco não entra, e
   * `clientesSemVideos` diz quantos são, para a tela poder cobrar.
   */
  videosPorMes: number;
  clientesSemVideos: number;
}

/**
 * Monta a carteira comercial a partir do que já existe: clientes,
 * recorrências e lançamentos. Sem tabela nova.
 */
export async function obterCarteira(mes: string): Promise<Carteira> {
  const supabase = createClient();
  const ano = mes.slice(0, 4);

  const [{ data: clientes }, { data: recorrencias }, { data: lancamentos }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, name, active, monthly_videos")
        .order("name"),
      supabase
        .from("financial_recurrences")
        .select("client_id, kind, amount, start_month, end_month")
        .eq("active", true),
      supabase
        .from("financial_entries")
        .select("client_id, kind, amount, status, reference_month")
        .eq("kind", "Receita")
        .gte("reference_month", `${ano}-01`)
        .lte("reference_month", `${ano}-12`),
    ]);

  const vigentes = (recorrencias ?? []).filter(
    (r) => r.start_month <= mes && (!r.end_month || r.end_month >= mes),
  );

  const mensalPorCliente = new Map<string, number>();
  for (const r of vigentes) {
    if (r.kind !== "Receita" || !r.client_id) continue;
    mensalPorCliente.set(
      r.client_id,
      (mensalPorCliente.get(r.client_id) ?? 0) + Number(r.amount),
    );
  }

  type Linha = Pick<
    FinancialEntry,
    "client_id" | "amount" | "status" | "reference_month"
  >;
  const linhas = (lancamentos ?? []) as Linha[];

  const videosDe = new Map(
    (clientes ?? []).map((c) => [
      c.id,
      (c as { monthly_videos?: number | null }).monthly_videos ?? null,
    ]),
  );

  function montar(id: string, nome: string): ClienteCarteira {
    const meus = linhas.filter((l) => l.client_id === id);
    const pagos = meus.filter((l) => l.status === "Pago");
    const ultimo = pagos.sort((a, b) =>
      b.reference_month.localeCompare(a.reference_month),
    )[0];

    return {
      id,
      nome,
      videosPorMes: videosDe.get(id) ?? null,
      mensal: mensalPorCliente.get(id) ?? 0,
      pagoNoAno: somar(pagos.map((l) => Number(l.amount))),
      pendenteNoMes: somar(
        meus
          .filter((l) => l.reference_month === mes && l.status === "Pendente")
          .map((l) => Number(l.amount)),
      ),
      ultimoMes: ultimo ? rotuloMesCurto(ultimo.reference_month) : null,
      ultimoValor: ultimo ? Number(ultimo.amount) : 0,
    };
  }

  const ativos = (clientes ?? [])
    .filter((c) => c.active)
    .map((c) => montar(c.id, c.name))
    .sort((a, b) => b.mensal - a.mensal);

  // "Saíram" = inativos que chegaram a faturar alguma coisa no ano.
  const inativos = (clientes ?? [])
    .filter((c) => !c.active)
    .map((c) => montar(c.id, c.name))
    .filter((c) => c.pagoNoAno > 0)
    .sort((a, b) => b.ultimoValor - a.ultimoValor);

  const comMensalidade = ativos.filter((c) => c.mensal > 0);

  return {
    ativos,
    inativos,
    recorrente: somar(ativos.map((c) => c.mensal)),
    custoFixo: somar(
      vigentes.filter((r) => r.kind === "Despesa").map((r) => Number(r.amount)),
    ),
    ticketMedio: comMensalidade.length
      ? somar(comMensalidade.map((c) => c.mensal)) / comMensalidade.length
      : 0,
    perdidoPorMes: somar(inativos.map((c) => c.ultimoValor)),
    videosPorMes: somar(
      ativos.map((c) => c.videosPorMes ?? 0),
    ),
    clientesSemVideos: ativos.filter((c) => c.videosPorMes == null).length,
  };
}


// -------------------------------------------------------------
// Funil
// -------------------------------------------------------------

const SELECT_LEAD = `
  *,
  proposals:commercial_proposals(*),
  client:clients(*)
`;

/** Converte os numéricos do Postgres (que chegam como string) em number. */
function normalizarLead(l: LeadWithRelations): LeadWithRelations {
  return {
    ...l,
    estimated_monthly: Number(l.estimated_monthly),
    proposals: (l.proposals ?? []).map((p: Proposal) => ({
      ...p,
      monthly_amount: Number(p.monthly_amount),
      setup_amount: Number(p.setup_amount),
    })),
  };
}

/** Lista as oportunidades, opcionalmente só as de certas etapas. */
export async function listarLeads(
  etapas?: LeadStage[],
): Promise<LeadWithRelations[]> {
  const supabase = createClient();
  let query = supabase
    .from("commercial_leads")
    .select(SELECT_LEAD)
    .order("estimated_monthly", { ascending: false });

  if (etapas && etapas.length > 0) query = query.in("stage", etapas);

  const { data } = await query;
  return ((data ?? []) as unknown as LeadWithRelations[]).map(normalizarLead);
}

/** Obtém uma oportunidade com propostas e cliente resolvidos. */
export async function obterLead(id: string): Promise<LeadWithRelations | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("commercial_leads")
    .select(SELECT_LEAD)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return normalizarLead(data as unknown as LeadWithRelations);
}

/** Últimos negócios ganhos e perdidos, para o histórico do funil. */
export async function listarEncerrados(
  limite = 8,
): Promise<
  Pick<
    Lead,
    | "id"
    | "name"
    | "stage"
    | "estimated_monthly"
    | "lost_reason"
    | "lost_reason_kind"
    | "updated_at"
  >[]
> {
  const supabase = createClient();
  const { data } = await supabase
    .from("commercial_leads")
    .select(
      "id, name, stage, estimated_monthly, lost_reason, lost_reason_kind, updated_at",
    )
    .in("stage", ["Fechado", "Perdido"])
    .order("updated_at", { ascending: false })
    .limit(limite);
  return (data ?? []).map((l) => ({
    ...l,
    estimated_monthly: Number(l.estimated_monthly),
  }));
}

/** Uma oportunidade que acabou, do jeito que a tela de encerradas lê. */
export interface LeadEncerrada {
  id: string;
  name: string;
  stage: "Fechado" | "Perdido";
  channel: LeadChannel;
  estimated_monthly: number;
  lost_reason_kind: string | null;
  lost_reason: string | null;
  client_id: string | null;
  /** Quando foi encerrada (a mudança de etapa). */
  encerrada_em: string;
}

/**
 * TODAS as oportunidades que acabaram, ganhas e perdidas.
 *
 * Diferente de `listarEncerrados`, que traz só as últimas para o pé do
 * funil: esta é a base de dados inteira, que é o que a Fran pediu,
 * "a pessoa que a gente não fechou, e a gente vai tentar entender essa
 * métrica depois".
 */
export async function listarTodasEncerradas(): Promise<LeadEncerrada[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("commercial_leads")
    .select(
      "id, name, stage, channel, estimated_monthly, lost_reason_kind, lost_reason, client_id, stage_changed_at",
    )
    .in("stage", ["Fechado", "Perdido"])
    .order("stage_changed_at", { ascending: false });

  return (data ?? []).map((l) => ({
    id: l.id as string,
    name: l.name as string,
    stage: l.stage as "Fechado" | "Perdido",
    channel: l.channel as LeadChannel,
    estimated_monthly: Number(l.estimated_monthly),
    lost_reason_kind: (l.lost_reason_kind as string | null) ?? null,
    lost_reason: (l.lost_reason as string | null) ?? null,
    client_id: (l.client_id as string | null) ?? null,
    encerrada_em: l.stage_changed_at as string,
  }));
}

// -------------------------------------------------------------
// Histórico de etapas e atividades
// -------------------------------------------------------------

/** Uma linha da linha do tempo, já com o nome do que mudou. */
export interface PassoDaEtapa {
  id: string;
  de: LeadStage | null;
  para: LeadStage;
  em: string;
}

/** A linha do tempo de uma oportunidade, da mais antiga para a mais nova. */
export async function listarHistoricoDeEtapas(
  leadId: string,
): Promise<PassoDaEtapa[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("commercial_stage_history")
    .select("id, de, para, em")
    .eq("lead_id", leadId)
    .order("em", { ascending: true });
  return (data ?? []) as PassoDaEtapa[];
}

/** Uma atividade com o nome de quem ela pertence. */
export interface AtividadeComDono extends Activity {
  leadNome: string | null;
  clienteNome: string | null;
}

interface FiltrosAtividades {
  leadId?: string;
  clientId?: string;
  /** Só as que ainda não foram feitas. Verdadeiro por padrão. */
  abertas?: boolean;
}

/**
 * As atividades, com o nome do dono resolvido.
 *
 * O dono é uma oportunidade OU um cliente (o banco não deixa ser
 * nenhum dos dois). A tela precisa do nome, não do id, porque uma
 * fila de trabalho que diz "ligar para 7f3a-..." não serve.
 */
export async function listarAtividades(
  filtros: FiltrosAtividades = {},
): Promise<AtividadeComDono[]> {
  const supabase = createClient();
  let query = supabase
    .from("commercial_activities")
    .select(
      "*, lead:commercial_leads(name), client:clients(name)",
    )
    .order("due_at", { ascending: true, nullsFirst: false });

  if (filtros.leadId) query = query.eq("lead_id", filtros.leadId);
  if (filtros.clientId) query = query.eq("client_id", filtros.clientId);
  if (filtros.abertas !== false) query = query.is("done_at", null);

  const { data } = await query;

  return ((data ?? []) as unknown as (Activity & {
    lead: { name: string } | null;
    client: { name: string } | null;
  })[]).map(({ lead, client, ...a }) => ({
    ...a,
    leadNome: lead?.name ?? null,
    clienteNome: client?.name ?? null,
  }));
}

/** Os investimentos lançados, do mais recente para o mais antigo. */
export async function listarInvestimentos(): Promise<Investment[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("commercial_investments")
    .select("*")
    .order("mes", { ascending: false })
    .order("created_at", { ascending: false });
  return ((data ?? []) as Investment[]).map((i) => ({
    ...i,
    amount: Number(i.amount),
  }));
}

// -------------------------------------------------------------
// Prospecção
// -------------------------------------------------------------

/** O recorte mínimo que a tela de Prospecção precisa de cada lead. */
export interface LeadProspeccao {
  channel: LeadChannel;
  stage: LeadStage;
  max_stage: LeadStage;
  estimated_monthly: number;
}

/**
 * Todas as oportunidades, do jeito que a Prospecção lê.
 *
 * Sem filtro de etapa de propósito: o funil e a conversão por canal
 * só fazem sentido com as perdidas e as fechadas dentro da conta,
 * olhar só as abertas mostraria um funil que nunca perde ninguém.
 */
export async function listarProspeccao(): Promise<LeadProspeccao[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("commercial_leads")
    .select("channel, stage, max_stage, estimated_monthly");

  return (data ?? []).map((l) => ({
    channel: l.channel,
    stage: l.stage,
    max_stage: l.max_stage,
    estimated_monthly: Number(l.estimated_monthly) || 0,
  }));
}
