import { describe, expect, it } from "vitest";
import {
  AREAS,
  AREAS_EMPRESA,
  AREAS_MENU,
  AREAS_PESSOAIS,
  MENU,
  MENU_PESSOAL,
  itemDoMenu,
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

  it("deixa o Dashboard fora do menu de etapas, porque ele abre o grupo", () => {
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

describe("o nome curto da etiqueta", () => {
  it("cabe na etiqueta de largura fixa", () => {
    // A etiqueta tem 6rem e fonte de 10px em caixa alta com espaçamento.
    // Acima de dez letras o texto passava por cima do título ao lado,
    // que foi exatamente o defeito que apareceu na lista do Início.
    for (const a of AREAS) {
      expect(a.curto.length).toBeLessThanOrEqual(10);
    }
  });

  it("não deixa nenhuma área sem nome curto", () => {
    for (const a of AREAS) {
      expect(a.curto.trim()).not.toBe("");
    }
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

  it("cai no Dashboard quando a rota não é de área nenhuma", () => {
    expect(areaDaRota("/interno/qualquer-coisa")).toBe("inicio");
  });
});

describe("area", () => {
  it("devolve a área pedida", () => {
    expect(area("financeiro").label).toBe("Financeiro");
  });
});

describe("MENU", () => {
  it("o menu da empresa tem DOIS itens, em ordem alfabética", () => {
    // Eram quatro (Administrativo, Comercial, Financeiro, e o
    // Dashboard por fora). Comercial e Administrativo viraram abas
    // dentro de Clientes.
    expect(MENU.map((i) => i.label)).toEqual(["Clientes", "Financeiro"]);
  });

  it("as telas do antigo Comercial acendem Clientes", () => {
    for (const rota of [
      "/interno/comercial",
      "/interno/comercial/funil",
      "/interno/comercial/prospeccao",
      "/interno/administrativo/clientes",
      "/interno/administrativo/equipe",
      "/interno/administrativo/documentos",
    ]) {
      expect(itemDoMenu(rota)?.label).toBe("Clientes");
    }
  });

  it("as telas do financeiro, inclusive o relatório, acendem Financeiro", () => {
    for (const rota of [
      "/interno/financeiro",
      "/interno/financeiro/recorrencias",
      "/interno/financeiro/resumo-anual",
      "/interno/relatorio",
    ]) {
      expect(itemDoMenu(rota)?.label).toBe("Financeiro");
    }
  });

  it("o Dashboard não é item do menu da empresa", () => {
    expect(itemDoMenu("/interno")).toBeNull();
  });

  it("meus gastos fica no grupo privado, fora do menu da empresa", () => {
    expect(MENU.some((i) => i.area === "pessoal")).toBe(false);
    expect(MENU_PESSOAL.map((i) => i.label)).toEqual(["Meus gastos"]);
    expect(itemDoMenu("/interno/meus-gastos")?.label).toBe("Meus gastos");
  });

  it("todo item do menu herda a cor e o ícone de uma área que existe", () => {
    for (const i of [...MENU, ...MENU_PESSOAL]) {
      expect(AREAS.some((a) => a.id === i.area)).toBe(true);
    }
  });
});
