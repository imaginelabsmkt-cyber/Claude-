/**
 * A conferência antes de gerar o mês.
 *
 * Do documento da Favie:
 *
 *   "Colocar no plano fixo tudo que se repete e, antes de criar os
 *    lançamentos, mostrar a lista para vocês conferirem. Assim
 *    ninguém precisa lembrar de nada à mão e nada fica duplicado."
 *
 * Aqui mora só a REGRA de o que já está lançado. O desenho é da tela
 * e a gravação é da action.
 */

/** Um item do plano fixo, candidato a virar lançamento. */
export interface ItemDoPlano {
  /** Id da recorrência. */
  id: string;
  description: string;
  /** Id da categoria, para comparar categoria com categoria. */
  categoryId: string | null;
  kind: string;
  amount: number;
}

/** Um lançamento que já existe no mês. */
export interface JaNoMes {
  description: string;
  categoryId: string | null;
  kind: string;
  amount: number;
  /** A recorrência que o gerou, quando veio do plano fixo. */
  recurrenceId: string | null;
}

export type Motivo =
  | "gerado"
  | "mesma descrição"
  | "mesma categoria e valor";

export interface ItemConferido extends ItemDoPlano {
  /** Vem marcado? Só o que ainda não existe no mês. */
  marcado: boolean;
  /** Por que está desmarcado. `null` quando é para gerar. */
  jaLancado: Motivo | null;
}

/** Tira acento, caixa e espaço sobrando, para comparar descrição. */
function chave(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Dois valores em reais são o mesmo? Compara em centavos. */
function mesmoValor(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}

/**
 * Marca cada item do plano como "gerar" ou "já lançado".
 *
 * Três jeitos de já estar lançado, do mais seguro para o mais
 * desconfiado:
 *
 *   1. A recorrência já gerou lançamento neste mês. É certeza.
 *   2. Existe um lançamento com a MESMA DESCRIÇÃO, do mesmo tipo.
 *      Cobre o caso de ter sido lançado à mão antes de clicar aqui.
 *   3. Existe um lançamento na MESMA CATEGORIA e com o MESMO VALOR.
 *      Cobre o lançado à mão com outro nome, "Claude" em vez de
 *      "Claude Max".
 *
 * O item desmarcado NÃO some da lista: some seria decidir pela
 * pessoa. Ela vê que está lá, vê por quê, e marca se discordar.
 */
export function conferirPlano(
  plano: ItemDoPlano[],
  noMes: JaNoMes[],
): ItemConferido[] {
  const gerados = new Set(
    noMes.map((l) => l.recurrenceId).filter((x): x is string => x != null),
  );
  const descricoes = new Set(noMes.map((l) => `${l.kind}|${chave(l.description)}`));

  return plano.map((item) => {
    let motivo: Motivo | null = null;

    if (gerados.has(item.id)) {
      motivo = "gerado";
    } else if (descricoes.has(`${item.kind}|${chave(item.description)}`)) {
      motivo = "mesma descrição";
    } else if (
      item.categoryId != null &&
      noMes.some(
        (l) =>
          l.kind === item.kind &&
          l.categoryId === item.categoryId &&
          mesmoValor(l.amount, item.amount),
      )
    ) {
      motivo = "mesma categoria e valor";
    }

    return { ...item, marcado: motivo == null, jaLancado: motivo };
  });
}

/** Quantos a tela vai gerar se ninguém mexer. */
export function quantosMarcados(itens: ItemConferido[]): number {
  return itens.filter((i) => i.marcado).length;
}

/** O aviso escrito ao lado do item desmarcado. */
export function avisoDoItem(m: Motivo): string {
  if (m === "gerado") return "já lançado";
  if (m === "mesma descrição") return "já lançado · mesma descrição";
  return "já lançado · mesma categoria e valor";
}
