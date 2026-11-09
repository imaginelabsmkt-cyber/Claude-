import { describe, expect, it } from "vitest";
import {
  clienteSeFizerFalta,
  semRepetirOGrupo,
} from "@/lib/financeiro/nomes";

describe("semRepetirOGrupo", () => {
  it("tira a palavra que o grupo já disse", () => {
    expect(
      semRepetirOGrupo(
        "Mensalidade Kiku Sushi",
        "Mensalidades / clientes recorrentes",
      ),
    ).toBe("Kiku Sushi");
  });

  it("funciona com o plural e com o acento do grupo", () => {
    expect(semRepetirOGrupo("Pró-labore Fran", "Pró-labore (sócias)")).toBe(
      "Fran",
    );
    expect(semRepetirOGrupo("Pro-labore Vitória", "Pró-labore (sócias)")).toBe(
      "Vitória",
    );
  });

  it("NÃO corta palavra curta, que é ambígua", () => {
    // Cortando "DAS" sobraria "do Simples Nacional", que é pior.
    expect(
      semRepetirOGrupo("DAS do Simples Nacional", "DAS - Simples Nacional"),
    ).toBe("DAS do Simples Nacional");
  });

  it("não corta quando a primeira palavra é outra", () => {
    expect(
      semRepetirOGrupo("Honorários da contabilidade", "Contabilidade / MEI"),
    ).toBe("Honorários da contabilidade");
    expect(
      semRepetirOGrupo("Claude Max", "Assinaturas e ferramentas digitais"),
    ).toBe("Claude Max");
  });

  it("não corta quando a categoria só CONTÉM a palavra, sem começar por ela", () => {
    expect(
      semRepetirOGrupo("Equipamento novo", "Compra de equipamentos"),
    ).toBe("Equipamento novo");
  });

  it("não devolve nome vazio quando a descrição é só a palavra do grupo", () => {
    expect(semRepetirOGrupo("Mensalidade", "Mensalidades / clientes")).toBe(
      "Mensalidade",
    );
  });

  it("devolve a descrição inteira quando não há categoria", () => {
    expect(semRepetirOGrupo("Mensalidade Kiku Sushi", null)).toBe(
      "Mensalidade Kiku Sushi",
    );
  });

  it("limpa o separador que sobra depois do corte", () => {
    expect(
      semRepetirOGrupo("Mensalidade: Kiku Sushi", "Mensalidades / clientes"),
    ).toBe("Kiku Sushi");
    expect(
      semRepetirOGrupo("Mensalidade - Kiku Sushi", "Mensalidades / clientes"),
    ).toBe("Kiku Sushi");
  });
});

describe("clienteSeFizerFalta", () => {
  it("some quando o nome na tela já é o do cliente", () => {
    expect(clienteSeFizerFalta("Kiku Sushi", "Kiku Sushi")).toBeNull();
  });

  it("some quando o nome na tela contém o do cliente", () => {
    expect(
      clienteSeFizerFalta("Mensalidade Kiku Sushi", "Kiku Sushi"),
    ).toBeNull();
  });

  it("aparece quando a linha não diz de quem é", () => {
    expect(clienteSeFizerFalta("Sessão de fotos", "Kiku Sushi")).toBe(
      "Kiku Sushi",
    );
  });

  it("não quebra sem cliente", () => {
    expect(clienteSeFizerFalta("Canva", null)).toBeNull();
  });
});
