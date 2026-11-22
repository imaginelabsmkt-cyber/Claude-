import { describe, expect, it } from "vitest";
import {
  resultadoDosCanais,
  totaisDosCanais,
  type InvestimentoDoCanal,
  type OportunidadeDoCanal,
} from "./canais";
import type { LeadChannel } from "@/types";

const op = (
  channel: LeadChannel,
  ganha: boolean,
  estimated_monthly = 1000,
): OportunidadeDoCanal => ({ channel, ganha, estimated_monthly });

const inv = (channel: LeadChannel, amount: number): InvestimentoDoCanal => ({
  channel,
  amount,
});

const CANAIS: LeadChannel[] = ["Indicação", "Tráfego pago", "Evento"];

describe("resultadoDosCanais", () => {
  it("cruza o que entrou com o que foi gasto", () => {
    const r = resultadoDosCanais(
      [
        op("Tráfego pago", true, 2000),
        op("Tráfego pago", false),
        op("Tráfego pago", false),
        op("Tráfego pago", false),
        op("Indicação", true, 2500),
        op("Indicação", true, 1500),
      ],
      [inv("Tráfego pago", 1500), inv("Indicação", 300)],
      CANAIS,
    );

    const trafego = r.find((x) => x.canal === "Tráfego pago")!;
    expect(trafego.leads).toBe(4);
    expect(trafego.fechados).toBe(1);
    expect(trafego.conversao).toBe(25);
    expect(trafego.custoPorCliente).toBe(1500);
    // 2000 × 12 ÷ 1500 = 16
    expect(trafego.retorno12Meses).toBe(16);

    const indicacao = r.find((x) => x.canal === "Indicação")!;
    expect(indicacao.fechados).toBe(2);
    expect(indicacao.custoPorCliente).toBe(150);
    // 4000 × 12 ÷ 300 = 160
    expect(indicacao.retorno12Meses).toBe(160);
  });

  it("canal com dinheiro e sem cliente APARECE", () => {
    // É o caso mais importante da tela: gastou e não trouxe. Se a
    // lista viesse só dos leads, ele sumiria justo quando interessa.
    const r = resultadoDosCanais([], [inv("Evento", 900)], CANAIS);
    expect(r).toHaveLength(1);
    expect(r[0].canal).toBe("Evento");
    expect(r[0].investido).toBe(900);
    expect(r[0].fechados).toBe(0);
  });

  it("sem fechar nada, o custo por cliente é NADA e não infinito", () => {
    const r = resultadoDosCanais([op("Evento", false)], [inv("Evento", 900)], CANAIS);
    expect(r[0].custoPorCliente).toBeNull();
  });

  it("canal de graça não tem retorno calculado", () => {
    // Dividir por zero daria "infinito vezes", que numa tabela parece
    // um número e não é.
    const r = resultadoDosCanais([op("Indicação", true, 2000)], [], CANAIS);
    expect(r[0].investido).toBe(0);
    expect(r[0].retorno12Meses).toBeNull();
  });

  it("canal sem nada não entra na lista", () => {
    const r = resultadoDosCanais([op("Indicação", true)], [], CANAIS);
    expect(r.map((x) => x.canal)).toEqual(["Indicação"]);
  });

  it("ordena pelo que mais fecha", () => {
    const r = resultadoDosCanais(
      [op("Evento", true), op("Indicação", true), op("Indicação", true)],
      [],
      CANAIS,
    );
    expect(r.map((x) => x.canal)).toEqual(["Indicação", "Evento"]);
  });
});

describe("totaisDosCanais", () => {
  it("soma os dois lados e refaz as contas no total", () => {
    const linhas = resultadoDosCanais(
      [
        op("Tráfego pago", true, 2000),
        op("Tráfego pago", false),
        op("Indicação", true, 1000),
      ],
      [inv("Tráfego pago", 1500), inv("Indicação", 500)],
      CANAIS,
    );
    const t = totaisDosCanais(linhas);

    expect(t.leads).toBe(3);
    expect(t.fechados).toBe(2);
    expect(t.investido).toBe(2000);
    expect(t.receitaMensal).toBe(3000);
    // 2 de 3
    expect(t.conversao).toBeCloseTo(66.67, 1);
    expect(t.custoPorCliente).toBe(1000);
    // 3000 × 12 ÷ 2000 = 18
    expect(t.retorno12Meses).toBe(18);
  });

  it("tabela vazia não divide por zero", () => {
    const t = totaisDosCanais([]);
    expect(t.conversao).toBeNull();
    expect(t.custoPorCliente).toBeNull();
    expect(t.retorno12Meses).toBeNull();
  });
});
