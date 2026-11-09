import type { FinancialKind } from "@/types";

/** O que o plano fixo precisa saber de cada recorrência. */
export interface RecorrenciaFixa {
  id: string;
  description: string;
  kind: FinancialKind;
  amount: number;
  active: boolean;
  due_day: number | null;
  start_month: string;
  end_month: string | null;
  categoria: string | null;
  cliente: string | null;
}

/** Uma linha dentro de um grupo. */
export interface ItemFixo extends RecorrenciaFixa {
  /** Está valendo neste mês: ativa e dentro da vigência. */
  vigente: boolean;
  /** Fatia do total do grupo, de 0 a 1. Zero para quem não é vigente. */
  fatia: number;
}

/** Um grupo do plano, que é uma categoria. */
export interface GrupoFixo {
  categoria: string;
  kind: FinancialKind;
  /** Soma só do que está vigente. */
  total: number;
  itens: ItemFixo[];
}

/** O plano fixo de um mês. */
export interface PlanoFixo {
  mes: string;
  /** Receita que se repete todo mês. */
  entra: number;
  /** Custo que se repete todo mês. */
  sai: number;
  /** entra menos sai. */
  sobra: number;
  gruposReceita: GrupoFixo[];
  gruposDespesa: GrupoFixo[];
  /** Quantas linhas existem mas não valem neste mês. */
  foraDoMes: number;
}

const SEM_CATEGORIA = "Sem categoria";

/** A recorrência vale neste mês? */
export function vigenteNoMes(r: RecorrenciaFixa, mes: string): boolean {
  return (
    r.active && r.start_month <= mes && (!r.end_month || r.end_month >= mes)
  );
}

/**
 * Monta o plano fixo do mês, agrupado por categoria.
 *
 * O agrupamento é o ponto: a planilha da Fran mostra "↳ Assinaturas e
 * ferramentas digitais" com cada ferramenta embaixo, e é assim que ela
 * enxerga para onde o dinheiro vai. Uma lista achatada de vinte linhas
 * misturando mensalidade de cliente com iCloud não responde isso.
 *
 * Linhas pausadas ou fora da vigência continuam aparecendo, dentro do
 * grupo delas, mas não entram em soma nenhuma: sumir com elas faz a
 * pessoa achar que foram apagadas.
 */
export function montarPlanoFixo(
  recorrencias: RecorrenciaFixa[],
  mes: string,
): PlanoFixo {
  const porCategoria = new Map<string, GrupoFixo>();

  for (const r of recorrencias) {
    const categoria = r.categoria ?? SEM_CATEGORIA;
    const chave = `${r.kind}::${categoria}`;
    let grupo = porCategoria.get(chave);
    if (!grupo) {
      grupo = { categoria, kind: r.kind, total: 0, itens: [] };
      porCategoria.set(chave, grupo);
    }
    const vigente = vigenteNoMes(r, mes);
    grupo.itens.push({ ...r, vigente, fatia: 0 });
    if (vigente) grupo.total += r.amount;
  }

  const grupos = [...porCategoria.values()];

  for (const g of grupos) {
    // Maior primeiro: é a ordem em que a pergunta "o que posso cortar?"
    // é respondida. Pausado desce para o fim.
    g.itens.sort((a, b) => {
      if (a.vigente !== b.vigente) return a.vigente ? -1 : 1;
      return b.amount - a.amount;
    });
    for (const i of g.itens) {
      i.fatia = i.vigente && g.total > 0 ? i.amount / g.total : 0;
    }
  }

  const porTotal = (a: GrupoFixo, b: GrupoFixo) => b.total - a.total;
  const gruposReceita = grupos.filter((g) => g.kind === "Receita").sort(porTotal);
  const gruposDespesa = grupos.filter((g) => g.kind === "Despesa").sort(porTotal);

  const entra = gruposReceita.reduce((t, g) => t + g.total, 0);
  const sai = gruposDespesa.reduce((t, g) => t + g.total, 0);

  return {
    mes,
    entra,
    sai,
    sobra: entra - sai,
    gruposReceita,
    gruposDespesa,
    foraDoMes: recorrencias.filter((r) => !vigenteNoMes(r, mes)).length,
  };
}
