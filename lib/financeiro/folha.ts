import type { FinancialKind } from "@/types";

/** O que a folha do mês precisa saber de cada lançamento. */
export interface LancamentoFolha {
  id: string;
  description: string;
  kind: FinancialKind;
  amount: number;
  /** "Pago" ou "Pendente". */
  status: string;
  due_date: string | null;
  categoria: string | null;
  cliente: string | null;
}

/** Uma linha da folha. */
export interface LinhaFolha extends LancamentoFolha {
  pago: boolean;
}

/** Um grupo da folha, que é uma categoria. */
export interface GrupoFolha {
  categoria: string;
  /** Tudo do grupo, pago ou não. */
  total: number;
  /** Só o que já foi baixado. */
  pago: number;
  /** Só o que está em aberto. */
  pendente: number;
  linhas: LinhaFolha[];
}

const SEM_CATEGORIA = "Sem categoria";

/**
 * Monta a folha do mês de um lado só (entrou ou saiu), agrupada por
 * categoria, como a aba mensal da planilha da Fran.
 *
 * A planilha é a referência de propósito: é o formato que ela já lê sem
 * precisar aprender nada. Categoria em cima, lançamentos embaixo, o
 * total do grupo do lado, e o status de cada linha.
 *
 * Dentro do grupo, o que está EM ABERTO vem primeiro: é o que ainda
 * pede ação. Depois, do maior para o menor.
 */
export function montarFolha(
  lancamentos: LancamentoFolha[],
  kind: FinancialKind,
): GrupoFolha[] {
  const grupos = new Map<string, GrupoFolha>();

  for (const l of lancamentos) {
    if (l.kind !== kind) continue;
    const categoria = l.categoria ?? SEM_CATEGORIA;
    let grupo = grupos.get(categoria);
    if (!grupo) {
      grupo = { categoria, total: 0, pago: 0, pendente: 0, linhas: [] };
      grupos.set(categoria, grupo);
    }
    const pago = l.status === "Pago";
    grupo.linhas.push({ ...l, pago });
    grupo.total += l.amount;
    if (pago) grupo.pago += l.amount;
    else grupo.pendente += l.amount;
  }

  const lista = [...grupos.values()];
  for (const g of lista) {
    g.linhas.sort((a, b) => {
      if (a.pago !== b.pago) return a.pago ? 1 : -1;
      return b.amount - a.amount;
    });
  }
  return lista.sort((a, b) => b.total - a.total);
}

/** Soma dos totais dos grupos. */
export function totalDaFolha(grupos: GrupoFolha[]): number {
  return grupos.reduce((t, g) => t + g.total, 0);
}
