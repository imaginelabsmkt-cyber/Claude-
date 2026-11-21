import { describe, expect, it } from "vitest";
import {
  SEM_MOTIVO,
  motivosDaPerda,
  placar,
  type Encerrada,
} from "./encerrados";

const perdida = (motivo: string | null, valor = 1000): Encerrada => ({
  stage: "Perdido",
  estimated_monthly: valor,
  lost_reason: motivo,
});

const ganha = (valor = 1000): Encerrada => ({
  stage: "Fechado",
  estimated_monthly: valor,
  lost_reason: null,
});

describe("motivosDaPerda", () => {
  it("junta o mesmo motivo escrito de jeitos diferentes", () => {
    const m = motivosDaPerda([
      perdida("Achou caro"),
      perdida("achou caro."),
      perdida("  ACHOU CARO  "),
    ]);
    expect(m).toHaveLength(1);
    expect(m[0].quantas).toBe(3);
    // O nome que aparece é a primeira forma escrita.
    expect(m[0].motivo).toBe("Achou caro");
  });

  it("junta com e sem acento", () => {
    const m = motivosDaPerda([perdida("Sumiu"), perdida("sumíu")]);
    expect(m).toHaveLength(1);
    expect(m[0].quantas).toBe(2);
  });

  it("soma a mensalidade que saiu por motivo", () => {
    const m = motivosDaPerda([perdida("Caro", 1500), perdida("Caro", 800)]);
    expect(m[0].valor).toBe(2300);
  });

  it("ordena do que mais acontece para o que menos", () => {
    const m = motivosDaPerda([
      perdida("Sumiu"),
      perdida("Caro"),
      perdida("Caro"),
    ]);
    expect(m.map((x) => x.motivo)).toEqual(["Caro", "Sumiu"]);
  });

  it("quem não anotou motivo não vira motivo vazio", () => {
    const m = motivosDaPerda([perdida(null), perdida("   ")]);
    expect(m).toHaveLength(1);
    expect(m[0].motivo).toBe(SEM_MOTIVO);
    expect(m[0].quantas).toBe(2);
  });

  it("ignora as ganhas", () => {
    expect(motivosDaPerda([ganha(), ganha()])).toEqual([]);
  });
});

describe("placar", () => {
  it("conta e soma os dois lados", () => {
    const p = placar([ganha(2000), ganha(1000), perdida("Caro", 500)]);
    expect(p.ganhas).toBe(2);
    expect(p.perdidas).toBe(1);
    expect(p.ganho).toBe(3000);
    expect(p.perdido).toBe(500);
  });

  it("aproveitamento em por cento", () => {
    expect(placar([ganha(), perdida("x"), perdida("y"), perdida("z")]).aproveitamento).toBe(25);
  });

  it("sem nada encerrado, aproveitamento é NADA e não 0%", () => {
    // Zero por cento diria "vocês perdem tudo", que é diferente de
    // "ainda não encerrou nenhuma".
    expect(placar([]).aproveitamento).toBeNull();
  });
});
