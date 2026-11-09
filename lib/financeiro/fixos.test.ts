import { describe, expect, it } from "vitest";
import {
  montarPlanoFixo,
  vigenteNoMes,
  type RecorrenciaFixa,
} from "@/lib/financeiro/fixos";

function rec(
  description: string,
  amount: number,
  extra: Partial<RecorrenciaFixa> = {},
): RecorrenciaFixa {
  return {
    id: description,
    description,
    kind: "Despesa",
    amount,
    active: true,
    due_day: 10,
    start_month: "2026-01",
    end_month: null,
    categoria: "Assinaturas e ferramentas digitais",
    cliente: null,
    ...extra,
  };
}

describe("vigenteNoMes", () => {
  it("vale dentro da vigência", () => {
    expect(vigenteNoMes(rec("Canva", 53), "2026-11")).toBe(true);
  });

  it("não vale antes de começar", () => {
    expect(
      vigenteNoMes(rec("Canva", 53, { start_month: "2026-12" }), "2026-11"),
    ).toBe(false);
  });

  it("não vale depois de terminar", () => {
    expect(
      vigenteNoMes(rec("Canva", 53, { end_month: "2026-10" }), "2026-11"),
    ).toBe(false);
  });

  it("não vale se estiver pausada", () => {
    expect(vigenteNoMes(rec("Canva", 53, { active: false }), "2026-11")).toBe(
      false,
    );
  });
});

describe("montarPlanoFixo", () => {
  // As ferramentas reais da planilha de novembro/2026.
  const FERRAMENTAS = [
    rec("Claude Max", 454.1),
    rec("ChatGPT Plus", 119.9),
    rec("Adobe", 95),
    rec("iCloud Fran", 66.9),
    rec("iCloud Vitória", 66.9),
    rec("Canva", 53),
    rec("Captions", 51.9),
    rec("CapCut", 32.9),
  ];

  it("soma o grupo exatamente como a planilha", () => {
    const plano = montarPlanoFixo(FERRAMENTAS, "2026-11");
    const grupo = plano.gruposDespesa[0];

    expect(grupo.categoria).toBe("Assinaturas e ferramentas digitais");
    expect(grupo.total).toBeCloseTo(940.6, 2);
    expect(plano.sai).toBeCloseTo(940.6, 2);
  });

  it("ordena em ordem alfabética dentro do grupo", () => {
    // Pedido da Fran. A pergunta de todo dia aqui é "cadê o Canva?", e
    // nome se acha em ordem alfabética. O peso de cada um continua
    // visível na barrinha.
    const plano = montarPlanoFixo(FERRAMENTAS, "2026-11");

    expect(plano.gruposDespesa[0].itens.map((i) => i.description)).toEqual([
      "Adobe",
      "Canva",
      "CapCut",
      "Captions",
      "ChatGPT Plus",
      "Claude Max",
      "iCloud Fran",
      "iCloud Vitória",
    ]);
  });

  it("dá a fatia de cada item dentro do grupo", () => {
    const plano = montarPlanoFixo(
      [rec("Claude Max", 750), rec("Canva", 250)],
      "2026-11",
    );
    const porNome = new Map(
      plano.gruposDespesa[0].itens.map((i) => [i.description, i.fatia]),
    );

    expect(porNome.get("Claude Max")).toBeCloseTo(0.75, 4);
    expect(porNome.get("Canva")).toBeCloseTo(0.25, 4);
  });

  it("separa receita de despesa e calcula a sobra", () => {
    const plano = montarPlanoFixo(
      [
        rec("Mensalidade Kiku Sushi", 2200, {
          kind: "Receita",
          categoria: "Mensalidades / clientes recorrentes",
          cliente: "Kiku Sushi",
        }),
        rec("Claude Max", 454.1),
        rec("Pró-labore", 13000, { categoria: "Pró-labore (sócias)" }),
      ],
      "2026-11",
    );

    expect(plano.entra).toBe(2200);
    expect(plano.sai).toBeCloseTo(13454.1, 2);
    expect(plano.sobra).toBeCloseTo(-11254.1, 2);
    expect(plano.gruposReceita).toHaveLength(1);
    expect(plano.gruposDespesa).toHaveLength(2);
  });

  it("põe o grupo mais caro primeiro", () => {
    const plano = montarPlanoFixo(
      [
        rec("Claude Max", 454.1),
        rec("Pró-labore", 13000, { categoria: "Pró-labore (sócias)" }),
      ],
      "2026-11",
    );

    expect(plano.gruposDespesa.map((g) => g.categoria)).toEqual([
      "Pró-labore (sócias)",
      "Assinaturas e ferramentas digitais",
    ]);
  });

  it("mostra a pausada na lista, sem somar", () => {
    const plano = montarPlanoFixo(
      [rec("Canva", 53), rec("Claude Max", 454.1, { active: false })],
      "2026-11",
    );
    const grupo = plano.gruposDespesa[0];

    // Sumir com a linha pausada faz a pessoa achar que foi apagada.
    // Ela fica no lugar alfabético dela, apagada e fora da soma.
    expect(grupo.itens.map((i) => i.description)).toEqual([
      "Canva",
      "Claude Max",
    ]);
    expect(grupo.total).toBe(53);
    expect(grupo.itens[1].vigente).toBe(false);
    expect(grupo.itens[1].fatia).toBe(0);
    expect(plano.foraDoMes).toBe(1);
  });

  it("não divide por zero quando o grupo inteiro está pausado", () => {
    const plano = montarPlanoFixo(
      [rec("Canva", 53, { active: false })],
      "2026-11",
    );

    expect(plano.gruposDespesa[0].total).toBe(0);
    expect(plano.gruposDespesa[0].itens[0].fatia).toBe(0);
    expect(plano.sai).toBe(0);
  });

  it("junta quem está sem categoria num grupo só", () => {
    const plano = montarPlanoFixo(
      [rec("Algo", 10, { categoria: null }), rec("Outro", 20, { categoria: null })],
      "2026-11",
    );

    expect(plano.gruposDespesa).toHaveLength(1);
    expect(plano.gruposDespesa[0].categoria).toBe("Sem categoria");
    expect(plano.gruposDespesa[0].total).toBe(30);
  });

  it("devolve plano vazio sem recorrência nenhuma", () => {
    const plano = montarPlanoFixo([], "2026-11");

    expect(plano.entra).toBe(0);
    expect(plano.sai).toBe(0);
    expect(plano.sobra).toBe(0);
    expect(plano.gruposDespesa).toEqual([]);
  });
});
