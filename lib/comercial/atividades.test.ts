import { describe, expect, it } from "vitest";
import {
  momentoDaAtividade,
  montarFila,
  pedemAtencao,
  prazoEmPalavras,
  type AtividadeNaFila,
} from "./atividades";

/** Tudo em Boa Vista (UTC-4, sem horário de verão). */
const em = (dia: number, h = 12) =>
  `2026-11-${String(dia).padStart(2, "0")}T${String(h).padStart(2, "0")}:00:00-04:00`;

/** Terça, 10 de novembro de 2026, 9h. */
const AGORA = new Date(em(10, 9));

const ativ = (
  id: string,
  due: string | null,
  done: string | null = null,
): AtividadeNaFila => ({
  id,
  subject: id,
  kind: "Tarefa",
  due_at: due,
  done_at: done,
});

describe("momentoDaAtividade", () => {
  it("separa atrasada, hoje e próxima", () => {
    expect(momentoDaAtividade(ativ("a", em(9)), AGORA)).toBe("atrasada");
    expect(momentoDaAtividade(ativ("b", em(10)), AGORA)).toBe("hoje");
    expect(momentoDaAtividade(ativ("c", em(11)), AGORA)).toBe("proxima");
  });

  it("o dia inteiro conta como HOJE, mesmo já tendo passado a hora", () => {
    // Às 9h, uma tarefa das 8h de hoje não é "atrasada há 1 dia": é de
    // hoje e ainda dá tempo. Atraso se mede em dias, não em horas.
    expect(momentoDaAtividade(ativ("a", em(10, 8)), AGORA)).toBe("hoje");
  });

  it("feita sai da conta mesmo vencida", () => {
    expect(momentoDaAtividade(ativ("a", em(1), em(2)), AGORA)).toBe("feita");
  });

  it("sem prazo não é atraso", () => {
    expect(momentoDaAtividade(ativ("a", null), AGORA)).toBe("sem prazo");
  });

  it("data estragada não vira atraso", () => {
    expect(momentoDaAtividade(ativ("a", "qualquer coisa"), AGORA)).toBe(
      "sem prazo",
    );
  });
});

describe("prazoEmPalavras", () => {
  it("é NEUTRO: quem chama põe a palavra na frente", () => {
    // "venceu há 3 dias" e "feita há 3 dias" saem do mesmo texto.
    expect(prazoEmPalavras(em(7), AGORA)).toBe("há 3 dias");
  });

  it("fala como gente", () => {
    expect(prazoEmPalavras(em(10), AGORA)).toBe("hoje");
    expect(prazoEmPalavras(em(11), AGORA)).toBe("amanhã");
    expect(prazoEmPalavras(em(9), AGORA)).toBe("ontem");
    expect(prazoEmPalavras(em(7), AGORA)).toBe("há 3 dias");
    expect(prazoEmPalavras(em(13), AGORA)).toBe("em 3 dias");
    expect(prazoEmPalavras(em(25), AGORA)).toBe("25/nov");
  });

  it("sem prazo diz sem prazo", () => {
    expect(prazoEmPalavras(null, AGORA)).toBe("sem prazo");
  });
});

describe("montarFila", () => {
  it("agrupa e ordena do mais velho para o mais novo", () => {
    const fila = montarFila(
      [
        ativ("hoje", em(10)),
        ativ("velha", em(5)),
        ativ("ontem", em(9)),
        ativ("futura", em(20)),
        ativ("solta", null),
        ativ("pronta", em(1), em(2)),
      ],
      AGORA,
    );

    expect(fila.atrasadas.map((a) => a.id)).toEqual(["velha", "ontem"]);
    expect(fila.hoje.map((a) => a.id)).toEqual(["hoje"]);
    expect(fila.proximas.map((a) => a.id)).toEqual(["futura"]);
    expect(fila.semPrazo.map((a) => a.id)).toEqual(["solta"]);
  });

  it("o que já foi feito não aparece em lugar nenhum da fila", () => {
    const fila = montarFila([ativ("pronta", em(1), em(2))], AGORA);
    expect(
      fila.atrasadas.length +
        fila.hoje.length +
        fila.proximas.length +
        fila.semPrazo.length,
    ).toBe(0);
  });

  it("pedem atenção é atrasada + hoje, e não o resto", () => {
    const fila = montarFila(
      [ativ("a", em(5)), ativ("b", em(10)), ativ("c", em(30)), ativ("d", null)],
      AGORA,
    );
    expect(pedemAtencao(fila)).toBe(2);
  });
});
