import { describe, expect, it } from "vitest";
import { controlesDaCurva, curvaSuave, type Ponto } from "@/lib/interno/curva";

const emX = (ys: number[]): Ponto[] => ys.map((y, i) => ({ x: i * 50, y }));

describe("curvaSuave", () => {
  it("não desenha nada sem ponto nenhum", () => {
    expect(curvaSuave([])).toBe("");
  });

  it("com um ponto só, só anda até ele", () => {
    expect(curvaSuave([{ x: 10, y: 20 }])).toBe("M10 20");
  });

  it("com dois pontos, é uma reta", () => {
    expect(
      curvaSuave([
        { x: 0, y: 0 },
        { x: 50, y: 10 },
      ]),
    ).toBe("M0 0 L50 10");
  });

  it("passa por todos os pontos", () => {
    const d = curvaSuave(emX([100, 60, 80, 20]));
    expect(d.startsWith("M0 100")).toBe(true);
    // Cada trecho termina exatamente no ponto seguinte.
    expect(d).toContain("50 60");
    expect(d).toContain("100 80");
    expect(d).toContain("150 20");
  });

  it("NÃO ultrapassa os pontos num trecho que só desce", () => {
    // É o motivo de a curva ser monotônica. Com a suavização comum, a
    // curva entre dois meses de queda desenha um fundo que nunca
    // existiu, e num gráfico de caixa isso é informação falsa.
    const ys = [120, 90, 40, 38, 10];
    const pontos = emX(ys);

    controlesDaCurva(pontos).forEach(({ c1, c2 }, i) => {
      const baixo = Math.min(ys[i], ys[i + 1]);
      const alto = Math.max(ys[i], ys[i + 1]);
      for (const c of [c1, c2]) {
        expect(c.y).toBeGreaterThanOrEqual(baixo - 0.01);
        expect(c.y).toBeLessThanOrEqual(alto + 0.01);
      }
    });
  });

  it("NÃO ultrapassa os pontos num sobe e desce", () => {
    const ys = [50, 10, 55, 12, 60, 8];
    const pontos = emX(ys);

    controlesDaCurva(pontos).forEach(({ c1, c2 }, i) => {
      const baixo = Math.min(ys[i], ys[i + 1]);
      const alto = Math.max(ys[i], ys[i + 1]);
      for (const c of [c1, c2]) {
        expect(c.y).toBeGreaterThanOrEqual(baixo - 0.01);
        expect(c.y).toBeLessThanOrEqual(alto + 0.01);
      }
    });
  });

  it("deixa reto o trecho que não muda de valor", () => {
    const [trecho] = controlesDaCurva(emX([40, 40, 40]));
    expect(trecho.c1.y).toBe(40);
    expect(trecho.c2.y).toBe(40);
  });

  it("aguenta o caixa negativo igual ao positivo", () => {
    const ys = [-30, -80, -20];
    controlesDaCurva(emX(ys)).forEach(({ c1, c2 }, i) => {
      const baixo = Math.min(ys[i], ys[i + 1]);
      const alto = Math.max(ys[i], ys[i + 1]);
      for (const c of [c1, c2]) {
        expect(c.y).toBeGreaterThanOrEqual(baixo - 0.01);
        expect(c.y).toBeLessThanOrEqual(alto + 0.01);
      }
    });
  });
});
