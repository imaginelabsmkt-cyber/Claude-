import { describe, expect, it } from "vitest";
import {
  AREAS,
  AREAS_EMPRESA,
  AREAS_MENU,
  AREAS_PESSOAIS,
  AREAS_PRIVADAS,
  area,
  areaDaRota,
} from "@/lib/interno/areas";

describe("ordem do menu", () => {
  it("lista as etapas da empresa em ordem alfabética", () => {
    // Pedido da Fran. É a ordem que não precisa ser explicada, e é a
    // primeira coisa que volta a sair do lugar quando alguém acrescenta
    // uma etapa nova no fim do array.
    expect(AREAS_EMPRESA.map((a) => a.label)).toEqual([
      "Administrativo",
      "Comercial",
      "Financeiro",
    ]);
  });

  it("mantém a ordem alfabética seja qual for a ordem do array", () => {
    const rotulos = AREAS_EMPRESA.map((a) => a.label);
    const ordenados = [...rotulos].sort((a, b) => a.localeCompare(b, "pt-BR"));
    expect(rotulos).toEqual(ordenados);
  });

  it("deixa o Início fora do menu de etapas, porque ele abre o grupo", () => {
    expect(AREAS_MENU.some((a) => a.id === "inicio")).toBe(false);
    expect(AREAS[0].id).toBe("inicio");
  });

  it("separa o que é privado do que as duas veem", () => {
    expect(AREAS_PESSOAIS.map((a) => a.id)).toEqual(AREAS_PRIVADAS);
    expect(
      AREAS_EMPRESA.some((a) => AREAS_PRIVADAS.includes(a.id)),
    ).toBe(false);
  });

  it("não perde nenhuma etapa ao dividir o menu em dois grupos", () => {
    expect(AREAS_EMPRESA.length + AREAS_PESSOAIS.length).toBe(
      AREAS_MENU.length,
    );
  });
});

describe("areaDaRota", () => {
  it("acha a área pela rota, inclusive nas telas de dentro", () => {
    expect(areaDaRota("/interno")).toBe("inicio");
    expect(areaDaRota("/interno/comercial")).toBe("comercial");
    expect(areaDaRota("/interno/comercial/funil")).toBe("comercial");
    expect(areaDaRota("/interno/administrativo/clientes")).toBe("administrativo");
    expect(areaDaRota("/interno/financeiro/lancamentos")).toBe("financeiro");
    expect(areaDaRota("/interno/meus-gastos")).toBe("pessoal");
  });

  it("devolve o Financeiro no relatório, que não tem item de menu", () => {
    expect(areaDaRota("/interno/relatorio")).toBe("financeiro");
  });

  it("cai no Início quando a rota não é de área nenhuma", () => {
    expect(areaDaRota("/interno/qualquer-coisa")).toBe("inicio");
  });
});

describe("area", () => {
  it("devolve a área pedida", () => {
    expect(area("financeiro").label).toBe("Financeiro");
  });
});
