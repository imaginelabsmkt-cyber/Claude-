import { describe, expect, it } from "vitest";
import {
  areaDaDemanda,
  comoAtividade,
  concluidasRecentemente,
  conferirDemanda,
  demandasComoCompromissos,
  demandasQuePedemAtencao,
  filaDasDemandas,
  quemFaz,
  type Demanda,
} from "@/lib/empresa/demandas";

/* 26/11/2026, 10h em Boa Vista (UTC-4). */
const AGORA = new Date("2026-11-26T14:00:00Z");

function d(over: Partial<Demanda> = {}): Demanda {
  return {
    id: "t1",
    title: "Pesquisar cartão de crédito com milhas",
    area: "financeiro",
    responsavel: "Fran",
    due_date: "2026-12-15",
    notes: null,
    done_at: null,
    ...over,
  };
}

describe("a demanda entra na fila das outras", () => {
  it("vira atividade com o prazo ao meio-dia do fuso da agência", () => {
    /* A demanda tem DIA, a fila trabalha com instante. Às 00:00 de
       Boa Vista ainda é o dia anterior em UTC, e a demanda de hoje
       apareceria como atrasada. */
    const a = comoAtividade(d({ due_date: "2026-11-26" }));
    expect(a.due_at).toBe("2026-11-26T12:00:00-04:00");
    expect(a.kind).toBe("Demanda");
    expect(a.subject).toBe("Pesquisar cartão de crédito com milhas");
  });

  it("sem prazo vira sem prazo, não vira hoje", () => {
    expect(comoAtividade(d({ due_date: null })).due_at).toBeNull();
  });

  it("separa nas quatro gavetas, pela mesma regra das atividades", () => {
    const fila = filaDasDemandas(
      [
        d({ id: "atrasada", due_date: "2026-11-20" }),
        d({ id: "hoje", due_date: "2026-11-26" }),
        d({ id: "proxima", due_date: "2026-12-15" }),
        d({ id: "sem-prazo", due_date: null }),
        d({ id: "feita", due_date: "2026-11-20", done_at: "2026-11-25T12:00:00Z" }),
      ],
      AGORA,
    );
    expect(fila.atrasadas.map((x) => x.id)).toEqual(["atrasada"]);
    expect(fila.hoje.map((x) => x.id)).toEqual(["hoje"]);
    expect(fila.proximas.map((x) => x.id)).toEqual(["proxima"]);
    expect(fila.semPrazo.map((x) => x.id)).toEqual(["sem-prazo"]);
  });

  it("a concluída não aparece na fila", () => {
    const fila = filaDasDemandas(
      [d({ due_date: "2026-11-01", done_at: "2026-11-02T12:00:00Z" })],
      AGORA,
    );
    expect(fila.atrasadas).toEqual([]);
    expect(fila.semPrazo).toEqual([]);
  });

  it("a mais antiga aparece primeiro dentro do grupo", () => {
    const fila = filaDasDemandas(
      [
        d({ id: "menos", due_date: "2026-11-25" }),
        d({ id: "mais", due_date: "2026-11-10" }),
      ],
      AGORA,
    );
    expect(fila.atrasadas.map((x) => x.id)).toEqual(["mais", "menos"]);
  });

  it("pedem atenção conta atrasadas e as de hoje, e só elas", () => {
    const lista = [
      d({ id: "a", due_date: "2026-11-20" }),
      d({ id: "b", due_date: "2026-11-26" }),
      d({ id: "c", due_date: "2026-12-30" }),
      d({ id: "e", due_date: null }),
    ];
    expect(demandasQuePedemAtencao(lista, AGORA)).toBe(2);
  });
});

describe("concluídas recentemente", () => {
  it("traz as dos últimos 7 dias, da mais nova para a mais velha", () => {
    const r = concluidasRecentemente(
      [
        d({ id: "ontem", done_at: "2026-11-25T12:00:00Z" }),
        d({ id: "semana", done_at: "2026-11-21T12:00:00Z" }),
        d({ id: "velha", done_at: "2026-10-01T12:00:00Z" }),
        d({ id: "aberta", done_at: null }),
      ],
      AGORA,
    );
    expect(r.map((x) => x.id)).toEqual(["ontem", "semana"]);
  });

  it("não traz conclusão com data no futuro", () => {
    // Relógio errado em algum lugar: melhor não mostrar do que mentir.
    expect(
      concluidasRecentemente([d({ done_at: "2027-01-01T12:00:00Z" })], AGORA),
    ).toEqual([]);
  });

  it("data estragada não quebra a lista", () => {
    expect(concluidasRecentemente([d({ done_at: "ontem" })], AGORA)).toEqual([]);
  });
});

describe("responsável e cor", () => {
  it("sem responsável quer dizer as duas", () => {
    expect(quemFaz(d({ responsavel: null }))).toBe("As duas");
    expect(quemFaz(d({ responsavel: "Vitória" }))).toBe("Vitória");
  });

  it("a área da demanda é a área do menu, que dá a cor", () => {
    expect(areaDaDemanda(d({ area: "financeiro" }))).toBe("financeiro");
    expect(areaDaDemanda(d({ area: "administrativo" }))).toBe("administrativo");
  });
});

describe("conferir antes de gravar", () => {
  const ok = { title: "Refazer contratos", area: "administrativo", due_date: "2026-12-20" };

  it("deixa passar o que está certo", () => {
    expect(conferirDemanda(ok)).toEqual([]);
  });

  it("título vazio ou só espaço não passa", () => {
    expect(conferirDemanda({ ...ok, title: "" })[0].campo).toBe("title");
    expect(conferirDemanda({ ...ok, title: "   " })[0].campo).toBe("title");
  });

  it("título longo demais não passa", () => {
    /* 140 letras não é capricho: o título é uma linha de lista, e um
       texto comprido empurra prazo e responsável para fora da tela. */
    expect(conferirDemanda({ ...ok, title: "a".repeat(140) })).toEqual([]);
    const erro = conferirDemanda({ ...ok, title: "a".repeat(141) });
    expect(erro[0].campo).toBe("title");
    expect(erro[0].mensagem).toContain("observação");
  });

  it("área fora das três não passa", () => {
    expect(conferirDemanda({ ...ok, area: "metas" })[0].campo).toBe("area");
    expect(conferirDemanda({ ...ok, area: "" })[0].campo).toBe("area");
  });

  it("prazo é opcional, mas quando vem tem que ser data", () => {
    expect(conferirDemanda({ ...ok, due_date: null })).toEqual([]);
    expect(conferirDemanda({ ...ok, due_date: "" })).toEqual([]);
    expect(conferirDemanda({ ...ok, due_date: "20/12/2026" })[0].campo).toBe(
      "due_date",
    );
  });

  it("acusa tudo que estiver errado de uma vez", () => {
    const erros = conferirDemanda({ title: "", area: "x", due_date: "amanhã" });
    expect(erros.map((e) => e.campo).sort()).toEqual(["area", "due_date", "title"]);
  });
});

describe("as demandas no Dashboard", () => {
  // A mesma função da fila, para o texto do prazo não divergir.
  const palavras = (due: string | null, agora: Date) => {
    if (!due) return "sem prazo";
    const dias = Math.round(
      (new Date(due).getTime() - agora.getTime()) / 86400000,
    );
    if (dias === 0) return "hoje";
    if (dias < 0) return `há ${Math.abs(dias)} dias`;
    return `em ${dias} dias`;
  };

  it("vira compromisso com a cor da área e o responsável na descrição", () => {
    const [c] = demandasComoCompromissos(
      [d({ area: "financeiro", responsavel: "Fran" })],
      AGORA,
      palavras,
    );
    expect(c.origem).toBe("financeiro");
    expect(c.descricao).toBe("Demanda · Fran");
    expect(c.valor).toBe(0);
  });

  it("sem responsável, mostra As duas", () => {
    const [c] = demandasComoCompromissos([d({ responsavel: null })], AGORA, palavras);
    expect(c.descricao).toBe("Demanda · As duas");
  });

  it("a concluída não vai para o Dashboard", () => {
    expect(
      demandasComoCompromissos([d({ done_at: "2026-11-25T12:00:00Z" })], AGORA, palavras),
    ).toEqual([]);
  });

  it("o atrasado ganha a palavra venceu na frente", () => {
    const [c] = demandasComoCompromissos([d({ due_date: "2026-11-20" })], AGORA, palavras);
    expect(c.prazo.startsWith("venceu ")).toBe(true);
    expect(c.atrasado).toBe(true);
  });

  it("o que vence em até 3 dias já conta como urgente", () => {
    // É a mesma régua dos compromissos do financeiro nesta tela.
    const [perto] = demandasComoCompromissos([d({ due_date: "2026-11-28" })], AGORA, palavras);
    expect(perto.atrasado).toBe(true);
    const [longe] = demandasComoCompromissos([d({ due_date: "2026-12-15" })], AGORA, palavras);
    expect(longe.atrasado).toBe(false);
  });

  it("sem prazo não é urgente e vai para o fim", () => {
    const [c] = demandasComoCompromissos([d({ due_date: null })], AGORA, palavras);
    expect(c.dias).toBeNull();
    expect(c.atrasado).toBe(false);
  });

  it("o id não colide com o de um lançamento", () => {
    // Os dois entram na mesma lista do React, com key pelo id.
    const [c] = demandasComoCompromissos([d({ id: "abc" })], AGORA, palavras);
    expect(c.id).toBe("demanda-abc");
  });
});
