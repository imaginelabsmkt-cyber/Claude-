import { createClient } from "@/lib/supabase/server";
import { somar } from "@/lib/financeiro/calculo";
import { rotuloMesCurto } from "@/lib/financeiro/meses";
import type { FinancialEntry } from "@/types";

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
