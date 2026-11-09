import { describe, expect, it } from "vitest";
import {
  contatosPorCliente,
  montarFunil,
  resultadoPorCanal,
  type OportunidadeProspeccao,
} from "./prospeccao";
import { LEAD_CHANNEL_OPTIONS } from "@/types";
import type { LeadChannel, LeadStage } from "@/types";

function op(
  channel: LeadChannel,
  stage: LeadStage,
  estimated_monthly = 1000,
): OportunidadeProspeccao {
  return { channel, stage, estimated_monthly };
}

/** Na vida real a etapa máxima vem do histórico; no teste, informada. */
const ateOndeChegou =
  <T extends OportunidadeProspeccao>(mapa: Map<T, LeadStage>) =>
  (o: T) =>
    mapa.get(o) ?? o.stage;

describe("montarFunil", () => {
  it("conta quem CHEGOU na etapa, não só quem está nela", () => {
    const ops = [
      op("Indicação", "Contato feito"),
      op("Indicação", "Proposta enviada"),
      op("Indicação", "Fechado"),
    ];
    const f = montarFunil(ops, (o) => o.stage);

    // Os três passaram por "Contato feito".
    expect(f[0].chegaram).toBe(3);
    expect(f[0].agora).toBe(1);
    // Dois chegaram à proposta; só um está parado lá.
    expect(f[2].chegaram).toBe(2);
    expect(f[2].agora).toBe(1);
    expect(f[4].chegaram).toBe(1);
  });

  it("quem foi perdido ainda conta até onde chegou", () => {
    const perdido = op("Evento", "Perdido");
    const mapa = new Map([[perdido, "Negociação" as LeadStage]]);
    const f = montarFunil([perdido], ateOndeChegou(mapa));

    expect(f[0].chegaram).toBe(1);
    expect(f[3].chegaram).toBe(1); // chegou à negociação
    expect(f[4].chegaram).toBe(0); // mas não fechou
    expect(f[3].agora).toBe(0); // e não está mais lá
  });

  it("a fração do topo cai ao longo do funil", () => {
    const ops = [
      op("Indicação", "Contato feito"),
      op("Indicação", "Contato feito"),
      op("Indicação", "Contato feito"),
      op("Indicação", "Fechado"),
    ];
    const f = montarFunil(ops, (o) => o.stage);
    expect(f[0].doTopo).toBe(1);
    expect(f[4].doTopo).toBeCloseTo(0.25, 10);
  });

  it("funil vazio não divide por zero", () => {
    const f = montarFunil<OportunidadeProspeccao>([], (o) => o.stage);
    expect(f).toHaveLength(5);
    expect(f.every((d) => d.chegaram === 0 && d.doTopo === 0)).toBe(true);
  });
});

describe("resultadoPorCanal", () => {
  it("separa fechadas, perdidas e em jogo", () => {
    const r = resultadoPorCanal(
      [
        op("Indicação", "Fechado", 2000),
        op("Indicação", "Perdido", 1500),
        op("Indicação", "Negociação", 1800),
      ],
      ["Indicação"],
    );
    expect(r[0]).toMatchObject({
      total: 3,
      fechadas: 1,
      perdidas: 1,
      abertas: 1,
      receitaFechada: 2000,
      receitaEmJogo: 1800,
    });
    // 1 de 2 decididas — a aberta não entra no denominador.
    expect(r[0].conversao).toBeCloseTo(0.5, 10);
  });

  it("canal só com oportunidades abertas não aparece com conversão 0", () => {
    const r = resultadoPorCanal([op("Evento", "Diagnóstico")], ["Evento"]);
    // Nada se decidiu ainda: 0 é "sem informação", não "fracassou".
    expect(r[0].conversao).toBe(0);
    expect(r[0].perdidas).toBe(0);
    expect(r[0].abertas).toBe(1);
  });

  it("ordena pelo que mais trouxe receita fechada", () => {
    const r = resultadoPorCanal(
      [
        op("Social selling", "Fechado", 500),
        op("Indicação", "Fechado", 3000),
        op("Evento", "Fechado", 1500),
      ],
      ["Social selling", "Indicação", "Evento"],
    );
    expect(r.map((x) => x.canal)).toEqual([
      "Indicação",
      "Evento",
      "Social selling",
    ]);
  });

  it("devolve uma linha por canal, mesmo sem nenhuma oportunidade", () => {
    const r = resultadoPorCanal([], LEAD_CHANNEL_OPTIONS);
    expect(r).toHaveLength(LEAD_CHANNEL_OPTIONS.length);
    expect(r.every((x) => x.total === 0 && x.conversao === 0)).toBe(true);
  });

  it("não acumula erro de centavo na receita", () => {
    const r = resultadoPorCanal(
      [
        op("Parceria", "Fechado", 0.1),
        op("Parceria", "Fechado", 0.2),
      ],
      ["Parceria"],
    );
    expect(r[0].receitaFechada).toBe(0.3);
  });
});

describe("contatosPorCliente", () => {
  it("diz quantos contatos custam um cliente", () => {
    const ops = [
      ...Array.from({ length: 9 }, () => op("Social selling", "Perdido")),
      op("Social selling", "Fechado"),
    ];
    const mapa = new Map(
      ops
        .filter((o) => o.stage === "Perdido")
        .map((o) => [o, "Contato feito" as LeadStage]),
    );
    expect(contatosPorCliente(montarFunil(ops, ateOndeChegou(mapa)))).toBe(10);
  });

  it("devolve null enquanto ninguém fechou — não inventa média", () => {
    const f = montarFunil([op("Evento", "Contato feito")], (o) => o.stage);
    expect(contatosPorCliente(f)).toBeNull();
  });

  it("devolve null com o funil vazio", () => {
    expect(contatosPorCliente(montarFunil<OportunidadeProspeccao>([], (o) => o.stage))).toBeNull();
  });
});
