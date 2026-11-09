import { describe, expect, it } from "vitest";
import { calcularFolego } from "./folego";

const r = (mes: string, resultado: number, movimento = 1) => ({
  mes,
  resultado,
  movimento,
});

describe("calcularFolego", () => {
  it("usa só os três últimos meses", () => {
    const f = calcularFolego(
      10000,
      [
        r("2026-05", 5000),
        r("2026-06", 5000),
        r("2026-08", -1000),
        r("2026-09", -2000),
        r("2026-10", -3000),
      ],
      "2026-11",
    );
    // Média dos três últimos: (-1000 -2000 -3000) / 3
    expect(f.mediaMensal).toBe(-2000);
    expect(f.meses).toBe(5);
    expect(f.ate).toBe("2027-04");
  });

  it("ganhando dinheiro, o caixa não acaba", () => {
    const f = calcularFolego(10000, [r("2026-10", 3000)], "2026-11");
    expect(f.mediaMensal).toBe(3000);
    expect(f.meses).toBeNull();
    expect(f.ate).toBeNull();
  });

  it("empatando também não acaba", () => {
    const f = calcularFolego(10000, [r("2026-10", 0)], "2026-11");
    expect(f.meses).toBeNull();
  });

  it("ignora mês sem movimento, que costuma ser mês não lançado", () => {
    const f = calcularFolego(
      6000,
      [r("2026-08", -2000), r("2026-09", 0, 0), r("2026-10", -1000)],
      "2026-11",
    );
    // Só agosto e outubro entram: média -1500.
    expect(f.mediaMensal).toBe(-1500);
    expect(f.meses).toBe(4);
  });

  it("sem histórico nenhum, não inventa número", () => {
    const f = calcularFolego(10000, [], "2026-11");
    expect(f.mediaMensal).toBe(0);
    expect(f.meses).toBeNull();
    expect(f.ate).toBeNull();
  });

  it("caixa negativo não vira fôlego positivo", () => {
    const f = calcularFolego(-500, [r("2026-10", -1000)], "2026-11");
    expect(f.meses).toBeNull();
  });

  it("queima maior que o caixa dá zero mês, não negativo", () => {
    const f = calcularFolego(500, [r("2026-10", -2000)], "2026-11");
    expect(f.meses).toBe(0);
    expect(f.ate).toBe("2026-11");
  });

  it("os números reais da Favie", () => {
    const f = calcularFolego(
      11923.38,
      [
        r("2026-08", -400.22),
        r("2026-09", -2163.92),
        r("2026-10", -2800.16),
      ],
      "2026-11",
    );
    expect(f.mediaMensal).toBe(-1788.1);
    expect(f.meses).toBe(6);
    expect(f.ate).toBe("2027-05");
  });
});
