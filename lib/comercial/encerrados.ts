/**
 * O que aconteceu com as oportunidades que acabaram.
 *
 * A Fran: "quando o cliente não fecha, ele vai apenas para a nossa
 * base de dados, ele vai ali como a pessoa que a gente não fechou e a
 * gente vai tentar entender essa métrica depois."
 *
 * A métrica morava no banco e não tinha tela: o motivo da perda era
 * gravado e nunca lido. Estas funções são PURAS — sem banco, sem
 * React — e é por isso que dá para testá-las.
 */

import { arredondar, somar } from "@/lib/financeiro/calculo";

/** O mínimo que uma oportunidade encerrada precisa ter. */
export interface Encerrada {
  stage: "Fechado" | "Perdido";
  estimated_monthly: number;
  /** O motivo da lista. */
  lost_reason_kind: string | null;
  /** O que foi escrito à mão, de quando o motivo era texto livre. */
  lost_reason: string | null;
}

export interface MotivoDaPerda {
  motivo: string;
  quantas: number;
  /** Quanto de mensalidade saiu por este motivo. */
  valor: number;
}

/** Quando a pessoa encerrou sem escrever nada. */
export const SEM_MOTIVO = "Sem motivo anotado";

/**
 * Agrupa as perdas por motivo, do que mais acontece para o que menos.
 *
 * O motivo hoje vem de uma LISTA, e aí não há o que normalizar. A
 * normalização continua aqui para o que foi gravado antes, quando era
 * texto livre: tira espaço sobrando, ponto final e a diferença entre
 * maiúscula e minúscula, de modo que "Achou caro", "achou caro" e
 * "achou caro." sejam o mesmo motivo. Era remendo, e remendo em cima
 * de texto livre só vai até certo ponto — "preço alto" nunca ia
 * encontrar "achou caro". Por isso a lista.
 */
export function motivosDaPerda(encerradas: Encerrada[]): MotivoDaPerda[] {
  const mapa = new Map<string, MotivoDaPerda>();

  for (const e of encerradas) {
    if (e.stage !== "Perdido") continue;
    const escrito = (e.lost_reason_kind ?? e.lost_reason ?? "")
      .trim()
      .replace(/[.;]+$/, "")
      .trim();
    const nome = escrito.length > 0 ? escrito : SEM_MOTIVO;
    const chave = nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");

    const atual = mapa.get(chave) ?? { motivo: nome, quantas: 0, valor: 0 };
    atual.quantas += 1;
    atual.valor = arredondar(atual.valor + (Number(e.estimated_monthly) || 0));
    mapa.set(chave, atual);
  }

  return [...mapa.values()].sort(
    (a, b) => b.quantas - a.quantas || b.valor - a.valor,
  );
}

export interface PlacarDoAno {
  ganhas: number;
  perdidas: number;
  /** Mensalidade somada do que foi ganho. */
  ganho: number;
  /** Mensalidade somada do que foi perdido. */
  perdido: number;
  /**
   * Quantas de cada dez viraram cliente, em por cento. `null` quando
   * nada encerrou ainda — dividir por zero não vira 0%, vira nada.
   */
  aproveitamento: number | null;
}

/** O placar: quantas viraram cliente e quantas não. */
export function placar(encerradas: Encerrada[]): PlacarDoAno {
  const ganhas = encerradas.filter((e) => e.stage === "Fechado");
  const perdidas = encerradas.filter((e) => e.stage === "Perdido");
  const total = ganhas.length + perdidas.length;

  return {
    ganhas: ganhas.length,
    perdidas: perdidas.length,
    ganho: somar(ganhas.map((e) => Number(e.estimated_monthly) || 0)),
    perdido: somar(perdidas.map((e) => Number(e.estimated_monthly) || 0)),
    aproveitamento:
      total === 0 ? null : arredondar((ganhas.length / total) * 100),
  };
}
