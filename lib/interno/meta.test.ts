import { describe, expect, it } from "vitest";
import { metaDoAno } from "./meta";

describe("metaDoAno", () => {
  it("não existe sem meta", () => {
    expect(metaDoAno(null, 100, 2026, "2026-11")).toBeNull();
    expect(metaDoAno(0, 100, 2026, "2026-11")).toBeNull();
  });

  it("conta o mês de hoje como mês que ainda rende", () => {
    // Em novembro, dez meses já se foram: sobram novembro e dezembro.
    const m = metaDoAno(120_000, 100_000, 2026, "2026-11")!;
    expect(m.mesesRestantes).toBe(2);
    expect(m.falta).toBe(20_000);
    expect(m.porMes).toBe(10_000);
  });

  it("diz se o ano vem no ritmo", () => {
    // Até o fim de outubro o parelho seria 10/12 da meta: 100.000.
    expect(metaDoAno(120_000, 100_000, 2026, "2026-11")!.noRitmo).toBe(true);
    expect(metaDoAno(120_000, 99_999, 2026, "2026-11")!.noRitmo).toBe(false);
  });

  it("meta batida não deixa falta negativa", () => {
    const m = metaDoAno(100_000, 130_000, 2026, "2026-11")!;
    expect(m.falta).toBe(0);
    expect(m.porMes).toBe(0);
    expect(m.fatia).toBeCloseTo(1.3);
  });

  it("ano que já passou não tem mês restante", () => {
    const m = metaDoAno(100_000, 80_000, 2025, "2026-11")!;
    expect(m.mesesRestantes).toBe(0);
    expect(m.porMes).toBe(0);
    expect(m.esperado).toBe(100_000);
  });

  it("ano que ainda nem começou tem os doze meses", () => {
    const m = metaDoAno(100_000, 0, 2027, "2026-11")!;
    expect(m.mesesRestantes).toBe(12);
    expect(m.esperado).toBe(0);
    expect(m.noRitmo).toBe(true);
  });

  it("em janeiro nenhum mês se foi", () => {
    const m = metaDoAno(120_000, 0, 2026, "2026-01")!;
    expect(m.mesesRestantes).toBe(12);
    expect(m.porMes).toBe(10_000);
  });
});
