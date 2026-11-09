/** Em que pé está um lançamento, do ponto de vista do prazo. */
export type SituacaoLancamento =
  | "Pago"
  | "Vencido"
  | "Vence hoje"
  | "A vencer"
  | "Sem data";

/** O mínimo para saber a situação de um lançamento. */
export interface LancamentoComPrazo {
  status: string;
  due_date: string | null;
}

/**
 * Dias entre hoje e uma data "YYYY-MM-DD". Negativo é passado.
 *
 * Compara texto com texto, sem `new Date(string)`, que o JavaScript lê
 * como UTC e em Boa Vista (UTC-4) devolve o dia anterior.
 */
export function diasAte(data: string, hoje: string): number {
  const dia = (iso: string) => {
    const [a, m, d] = iso.split("-").map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((dia(data) - dia(hoje)) / 86_400_000);
}

/** A situação de prazo de um lançamento. */
export function situacaoDoLancamento(
  l: LancamentoComPrazo,
  hoje: string,
): SituacaoLancamento {
  if (l.status === "Pago") return "Pago";
  if (!l.due_date) return "Sem data";
  const dias = diasAte(l.due_date, hoje);
  if (dias < 0) return "Vencido";
  if (dias === 0) return "Vence hoje";
  return "A vencer";
}

/** O texto do prazo, em palavras. */
export function textoDoPrazo(l: LancamentoComPrazo, hoje: string): string {
  const situacao = situacaoDoLancamento(l, hoje);
  if (situacao === "Pago") return "pago";
  if (situacao === "Sem data") return "sem data";
  const dias = diasAte(l.due_date!, hoje);
  if (situacao === "Vencido") {
    const atraso = Math.abs(dias);
    return atraso === 1 ? "venceu ontem" : `venceu há ${atraso} dias`;
  }
  if (situacao === "Vence hoje") return "vence hoje";
  if (dias === 1) return "vence amanhã";
  return `vence em ${dias} dias`;
}

/** Peso de ordenação: menor vem primeiro. */
const PESO: Record<SituacaoLancamento, number> = {
  Vencido: 0,
  "Vence hoje": 1,
  "A vencer": 2,
  "Sem data": 3,
  Pago: 4,
};

/**
 * Ordena a lista pelo que PEDE AÇÃO primeiro.
 *
 * Esta tela não é leitura, é trabalho: a pessoa abre para dar baixa,
 * corrigir ou lançar. Então vencido vem antes de tudo, depois o que
 * vence hoje, depois o que vai vencer (do mais próximo), e por último o
 * que já está pago (do mais recente), que é o que não precisa dela.
 */
export function ordenarPorUrgencia<T extends LancamentoComPrazo>(
  lancamentos: T[],
  hoje: string,
): T[] {
  return [...lancamentos].sort((a, b) => {
    const sa = situacaoDoLancamento(a, hoje);
    const sb = situacaoDoLancamento(b, hoje);
    if (PESO[sa] !== PESO[sb]) return PESO[sa] - PESO[sb];

    if (sa === "Pago") {
      // Pago: o mais recente primeiro, que é o que acabou de acontecer.
      return (b.due_date ?? "").localeCompare(a.due_date ?? "");
    }
    return (a.due_date ?? "").localeCompare(b.due_date ?? "");
  });
}

/** Quantos estão vencidos ou vencem hoje. */
export function contarUrgentes(
  lancamentos: LancamentoComPrazo[],
  hoje: string,
): number {
  return lancamentos.filter((l) => {
    const s = situacaoDoLancamento(l, hoje);
    return s === "Vencido" || s === "Vence hoje";
  }).length;
}
