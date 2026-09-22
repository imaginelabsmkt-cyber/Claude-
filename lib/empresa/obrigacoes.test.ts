import { describe, it, expect } from "vitest";
import {
  periodoCorrente,
  periodosProximos,
  rotuloPeriodo,
  textoPrazo,
  vencimentoAberto,
  vencimentoDoPeriodo,
  type PrazoObrigacao,
} from "@/lib/empresa/obrigacoes";

const HOJE = new Date(2026, 8, 22); // 22/09/2026

const mensal: PrazoObrigacao = {
  cadence: "Mensal",
  due_day: 15,
  due_month: null,
  due_date: null,
  alert_days: 3,
  since: "2026-03-01",
};

const anual: PrazoObrigacao = {
  cadence: "Anual",
  due_day: 31,
  due_month: 3,
  due_date: null,
  alert_days: 30,
  since: "2025-01-01",
};

const trimestral: PrazoObrigacao = {
  cadence: "Trimestral",
  due_day: 20,
  due_month: 3, // âncora em março: mar, jun, set, dez
  due_date: null,
  alert_days: 7,
};

const unica: PrazoObrigacao = {
  cadence: "Única",
  due_day: null,
  due_month: null,
  due_date: "2026-10-05",
  alert_days: 15,
};

describe("vencimentoDoPeriodo", () => {
  it("resolve o dia dentro do mês do período", () => {
    expect(vencimentoDoPeriodo(mensal, "2026-09")).toBe("2026-09-15");
    expect(vencimentoDoPeriodo(anual, "2026")).toBe("2026-03-31");
    expect(vencimentoDoPeriodo(unica, "unica")).toBe("2026-10-05");
  });

  it("dia que não existe no mês cai no último dia", () => {
    const dia31 = { ...mensal, due_day: 31 };
    expect(vencimentoDoPeriodo(dia31, "2026-04")).toBe("2026-04-30");
    expect(vencimentoDoPeriodo(dia31, "2026-02")).toBe("2026-02-28");
    // 2028 é bissexto.
    expect(vencimentoDoPeriodo(dia31, "2028-02")).toBe("2028-02-29");
  });

  it("devolve null sem dados suficientes", () => {
    expect(vencimentoDoPeriodo({ ...mensal, due_day: null }, "2026-09")).toBeNull();
    expect(vencimentoDoPeriodo(anual, "sem-ano")).toBeNull();
  });
});

describe("periodosProximos", () => {
  it("mensal traz os meses anteriores e o próximo", () => {
    const p = periodosProximos(mensal, HOJE);
    expect(p).toContain("2026-09");
    expect(p).toContain("2026-10");
    expect(p).toContain("2026-03");
    expect(p[p.length - 1]).toBe("2026-10");
  });

  it("trimestral só traz meses alinhados à âncora", () => {
    const p = periodosProximos(trimestral, HOJE);
    // Âncora em março -> só mar/jun/set/dez.
    expect(p).toContain("2026-09");
    expect(p).toContain("2026-06");
    expect(p).not.toContain("2026-08");
    expect(p).not.toContain("2026-07");
  });

  it("anual traz o ano anterior, o atual e o seguinte", () => {
    expect(periodosProximos(anual, HOJE)).toEqual(["2025", "2026", "2027"]);
  });

  it("única tem um período só", () => {
    expect(periodosProximos(unica, HOJE)).toEqual(["unica"]);
  });
});

describe("vencimentoAberto", () => {
  it("acusa atraso do mês corrente quando não foi cumprido", () => {
    // Obrigação criada em setembro; dia 15 já passou em 22/09.
    const nova = { ...mensal, since: "2026-09-01" };
    const v = vencimentoAberto(nova, [], HOJE);
    expect(v?.periodo).toBe("2026-09");
    expect(v?.situacao).toBe("Atrasada");
    expect(v?.dias).toBe(-7);
  });

  it("pendência antiga vem antes da recente", () => {
    // Existe desde agosto; setembro cumprido, agosto não.
    const desdeAgosto = { ...mensal, since: "2026-08-01" };
    const v = vencimentoAberto(desdeAgosto, ["2026-09"], HOJE);
    expect(v?.periodo).toBe("2026-08");
    expect(v?.situacao).toBe("Atrasada");
  });

  it("não inventa atraso anterior à criação da obrigação", () => {
    // Cadastrada hoje (22/09), depois do vencimento dia 15: o próximo
    // em aberto é outubro, e nada de setembro para trás conta.
    const hojeMesmo = { ...mensal, since: "2026-09-22" };
    const v = vencimentoAberto(hojeMesmo, [], HOJE);
    expect(v?.periodo).toBe("2026-10");
    expect(v?.situacao).toBe("Em dia");
  });

  it("tudo em dia: olha o próximo e respeita a janela de aviso", () => {
    const cumpridos = [
      "2026-03","2026-04","2026-05","2026-06","2026-07","2026-08","2026-09",
    ];
    const v = vencimentoAberto(mensal, cumpridos, HOJE);
    // Outubro vence dia 15; faltam 23 dias e o aviso é de 3 -> em dia.
    expect(v?.periodo).toBe("2026-10");
    expect(v?.situacao).toBe("Em dia");
    expect(v?.dias).toBe(23);
  });

  it("entra em 'vence em breve' dentro da janela de aviso", () => {
    // Em 13/10, outubro vence dia 15: faltam 2 dias, aviso de 3.
    const emOutubro = new Date(2026, 9, 13);
    const cumpridos = periodosProximos(mensal, emOutubro).filter((p) => p !== "2026-10");
    const v = vencimentoAberto(mensal, cumpridos, emOutubro);
    expect(v?.periodo).toBe("2026-10");
    expect(v?.situacao).toBe("Vence em breve");
    expect(v?.dias).toBe(2);
  });

  it("anual já cumprido aponta o ano seguinte, ainda longe", () => {
    const v = vencimentoAberto(anual, ["2025", "2026"], HOJE);
    expect(v?.periodo).toBe("2027");
    expect(v?.situacao).toBe("Em dia");
  });

  it("anual não cumprido do ano corrente está atrasado", () => {
    // 31/03/2026 já passou.
    const v = vencimentoAberto(anual, ["2025"], HOJE);
    expect(v?.periodo).toBe("2026");
    expect(v?.situacao).toBe("Atrasada");
  });

  it("única cumprida não devolve nada", () => {
    expect(vencimentoAberto(unica, ["unica"], HOJE)).toBeNull();
  });

  it("única pendente respeita a janela de aviso", () => {
    // 05/10 está a 13 dias de 22/09, e o aviso é de 15.
    const v = vencimentoAberto(unica, [], HOJE);
    expect(v?.situacao).toBe("Vence em breve");
    expect(v?.dias).toBe(13);
  });
});

describe("textos", () => {
  it("descreve o prazo em português", () => {
    expect(textoPrazo({ periodo: "x", data: "x", dias: -7, situacao: "Atrasada" })).toBe(
      "venceu há 7 dias",
    );
    expect(textoPrazo({ periodo: "x", data: "x", dias: -1, situacao: "Atrasada" })).toBe(
      "venceu ontem",
    );
    expect(textoPrazo({ periodo: "x", data: "x", dias: 0, situacao: "Vence em breve" })).toBe(
      "vence hoje",
    );
    expect(textoPrazo({ periodo: "x", data: "x", dias: 1, situacao: "Vence em breve" })).toBe(
      "vence amanhã",
    );
    expect(textoPrazo({ periodo: "x", data: "x", dias: 9, situacao: "Em dia" })).toBe(
      "em 9 dias",
    );
  });

  it("rotula o período conforme a periodicidade", () => {
    expect(rotuloPeriodo("2026-09")).toBe("Set/2026");
    expect(rotuloPeriodo("2026")).toBe("2026");
    expect(rotuloPeriodo("unica")).toBe("uma vez");
  });
});

describe("periodoCorrente", () => {
  it("dá a chave do período que se cumpre agora", () => {
    expect(periodoCorrente(mensal, HOJE)).toBe("2026-09");
    expect(periodoCorrente(anual, HOJE)).toBe("2026");
    expect(periodoCorrente(unica, HOJE)).toBe("unica");
  });

  it("trimestral recua até o mês alinhado à âncora", () => {
    // Em 22/09 com âncora em março, o trimestre corrente é setembro.
    expect(periodoCorrente(trimestral, HOJE)).toBe("2026-09");
    // Em 05/11, o trimestre corrente ainda é o de setembro.
    expect(periodoCorrente(trimestral, new Date(2026, 10, 5))).toBe("2026-09");
  });
});
