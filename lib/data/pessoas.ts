import { createClient } from "@/lib/supabase/server";
import { somar } from "@/lib/financeiro/calculo";
import type { FinancialEntryWithRelations, TeamMember } from "@/types";

/** Uma pessoa com o que ela custou. */
export interface PessoaComCusto extends TeamMember {
  /** Pago a ela no mês em foco. */
  noMes: number;
  /** Ainda em aberto no mês. */
  emAberto: number;
  /** Pago a ela no ano corrente. */
  noAno: number;
  /** Lançamentos dela no mês. */
  lancamentos: FinancialEntryWithRelations[];
}

/** Lista as pessoas com o custo de cada uma no mês e no ano. */
export async function listarPessoas(mes: string): Promise<PessoaComCusto[]> {
  const supabase = createClient();
  const ano = mes.slice(0, 4);

  const [{ data: pessoas }, { data: lancamentos }] = await Promise.all([
    supabase
      .from("team_members")
      .select("*")
      .order("active", { ascending: false })
      .order("kind")
      .order("name"),
    supabase
      .from("financial_entries")
      .select("*, category:financial_categories(*), client:clients(*)")
      .eq("kind", "Despesa")
      .not("team_member_id", "is", null)
      .gte("reference_month", `${ano}-01`)
      .lte("reference_month", `${ano}-12`),
  ]);

  const linhas = ((lancamentos ?? []) as unknown as FinancialEntryWithRelations[]).map(
    (l) => ({ ...l, amount: Number(l.amount) }),
  );

  return (pessoas ?? []).map((p) => {
    const dela = linhas.filter((l) => l.team_member_id === p.id);
    const doMes = dela.filter((l) => l.reference_month === mes);
    return {
      ...p,
      default_rate: p.default_rate === null ? null : Number(p.default_rate),
      lancamentos: doMes,
      noMes: somar(
        doMes.filter((l) => l.status === "Pago").map((l) => Number(l.amount)),
      ),
      emAberto: somar(
        doMes.filter((l) => l.status === "Pendente").map((l) => Number(l.amount)),
      ),
      noAno: somar(
        dela.filter((l) => l.status === "Pago").map((l) => Number(l.amount)),
      ),
    };
  });
}

/** Pessoas ativas, para os selects dos formulários. */
export async function listarPessoasAtivas(): Promise<
  Pick<TeamMember, "id" | "name" | "kind">[]
> {
  const supabase = createClient();
  const { data } = await supabase
    .from("team_members")
    .select("id, name, kind")
    .eq("active", true)
    .order("name");
  return data ?? [];
}
