import { createClient } from "@/lib/supabase/server";
import { somar } from "@/lib/financeiro/calculo";
import { rotuloMesCurto } from "@/lib/financeiro/meses";
import type {
  FinancialEntry,
  Lead,
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
      supabase.from("clients").select("id, name, active").order("name"),
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

  function montar(id: string, nome: string): ClienteCarteira {
    const meus = linhas.filter((l) => l.client_id === id);
    const pagos = meus.filter((l) => l.status === "Pago");
    const ultimo = pagos.sort((a, b) =>
      b.reference_month.localeCompare(a.reference_month),
    )[0];

    return {
      id,
      nome,
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
): Promise<Pick<Lead, "id" | "name" | "stage" | "estimated_monthly" | "lost_reason" | "updated_at">[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("commercial_leads")
    .select("id, name, stage, estimated_monthly, lost_reason, updated_at")
    .in("stage", ["Fechado", "Perdido"])
    .order("updated_at", { ascending: false })
    .limit(limite);
  return (data ?? []).map((l) => ({
    ...l,
    estimated_monthly: Number(l.estimated_monthly),
  }));
}
