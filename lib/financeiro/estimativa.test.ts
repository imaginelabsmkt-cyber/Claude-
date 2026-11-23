import { describe, expect, it } from "vitest";
import {
  calcularEstimativa,
  clienteImaginado,
  type LinhaDaEstimativa,
} from "@/lib/financeiro/estimativa";

function l(
  nome: string,
  mensal: number,
  over: Partial<LinhaDaEstimativa> = {},
): LinhaDaEstimativa {
  return { id: nome, nome, mensal, dentro: true, ...over };
}

/* A carteira de verdade da Favie em novembro/2026. */
const CARTEIRA = [
  l("Kiku Sushi", 2200),
  l("Malukies Cookies & Co", 2600),
  l("Dra. Hemilayne", 2000),
  l("Natural Concept", 1700),
  l("Laura Chioquetta", 1550),
  l("Studio Bambu", 1300),
  l("Salte", 1300),
  l("Izabela Schipitoski", 1800),
];
const HOJE = 14450;
const FIXO = 14055.32;

describe("a conta da estimativa", () => {
  it("soma a carteira como ela está", () => {
    const e = calcularEstimativa(CARTEIRA, FIXO, HOJE);
    expect(e.quantos).toBe(8);
    expect(e.receita).toBe(14450);
    expect(e.ticketMedio).toBeCloseTo(1806.25, 2);
    expect(e.variacao).toBe(0);
  });

  it("dois clientes a mais mudam o total e a variação", () => {
    const e = calcularEstimativa(
      [...CARTEIRA, l("Novo 1", 1800, { imaginado: true }), l("Novo 2", 1800, { imaginado: true })],
      FIXO,
      HOJE,
    );
    expect(e.quantos).toBe(10);
    expect(e.receita).toBe(18050);
    expect(e.variacao).toBeCloseTo((18050 - 14450) / 14450, 4);
  });

  it("desmarcar um cliente simula perder ele", () => {
    const e = calcularEstimativa(
      CARTEIRA.map((c) => (c.nome === "Kiku Sushi" ? { ...c, dentro: false } : c)),
      FIXO,
      HOJE,
    );
    expect(e.quantos).toBe(7);
    expect(e.receita).toBe(14450 - 2200);
  });

  it("linha com valor zero não conta como cliente", () => {
    // Senão o ticket médio despenca por causa de uma linha em branco.
    const e = calcularEstimativa([...CARTEIRA, l("Em branco", 0)], FIXO, HOJE);
    expect(e.quantos).toBe(8);
    expect(e.ticketMedio).toBeCloseTo(1806.25, 2);
  });

  it("diz quantos clientes faltam para cobrir o fixo", () => {
    // Só três clientes: R$ 6.800 contra R$ 14.055,32 de custo fixo.
    const e = calcularEstimativa(CARTEIRA.slice(0, 3), FIXO, HOJE);
    expect(e.sobra).toBeCloseTo(6800 - FIXO, 2);
    // Faltam 7.255,32, com ticket médio de 2.266,67 -> 4 clientes.
    expect(e.faltamClientes).toBe(4);
  });

  it("cobrindo o fixo, não falta ninguém", () => {
    const e = calcularEstimativa(CARTEIRA, FIXO, HOJE);
    expect(e.sobra).toBeGreaterThan(0);
    expect(e.faltamClientes).toBe(0);
  });

  it("sem nenhum cliente não inventa número", () => {
    const e = calcularEstimativa([], FIXO, HOJE);
    expect(e.receita).toBe(0);
    expect(e.ticketMedio).toBe(0);
    expect(e.sobra).toBeCloseTo(-FIXO, 2);
    // Sem ticket médio não dá para dizer quantos faltam.
    expect(e.faltamClientes).toBeNull();
  });

  it("sem carteira de hoje, não há variação", () => {
    expect(calcularEstimativa(CARTEIRA, FIXO, 0).variacao).toBeNull();
  });
});

describe("cliente imaginado", () => {
  it("nasce com o ticket médio, arredondado na dezena", () => {
    const c = clienteImaginado(1806.25, 1);
    expect(c.mensal).toBe(1810);
    expect(c.dentro).toBe(true);
    expect(c.imaginado).toBe(true);
    expect(c.nome).toBe("Cliente novo 1");
  });

  it("sem ticket médio, nasce zerado para a pessoa digitar", () => {
    expect(clienteImaginado(0, 1).mensal).toBe(0);
  });
});

describe("numeração dos clientes imaginados", () => {
  it("o id não repete quando se tira um do meio", () => {
    /* Foi um bug meu: eu numerava pela QUANTIDADE. Com três na lista,
       tirar o 2 e adicionar outro gerava um segundo "novo-3" — dois
       campos de texto com a mesma chave brigando por quem manda. O
       número tem que sair do maior já usado. */
    const tres = [1, 2, 3].map((n) => clienteImaginado(1800, n));
    const semOMeio = tres.filter((c) => c.id !== "novo-2");
    const maior = semOMeio.reduce((m, i) => {
      const n = Number(i.id.replace("novo-", ""));
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    const proximo = clienteImaginado(1800, maior + 1);
    expect(proximo.id).toBe("novo-4");
    expect(semOMeio.some((c) => c.id === proximo.id)).toBe(false);
  });
});
