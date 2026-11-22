import { describe, expect, it } from "vitest";
import { saldoDoMes } from "@/lib/financeiro/saldo";
import type { ParteDaFolha } from "@/lib/financeiro/folha";

const parte = (p: Partial<ParteDaFolha> = {}): ParteDaFolha => ({
  pago: 0,
  aVencer: 0,
  vencido: 0,
  total: 0,
  ...p,
});

describe("saldo hoje x previsão", () => {
  it("o saldo de hoje conta só o que tem baixa", () => {
    // Entraram 16.750 no mês, mas só 2.000 caíram na conta.
    const s = saldoDoMes(
      11360.76,
      parte({ total: 16750, pago: 2000, vencido: 4200, aVencer: 10550 }),
      parte({ total: 16825.9, pago: 0, aVencer: 16825.9 }),
    );
    expect(s.hoje).toBeCloseTo(13360.76, 2);
    expect(s.faltaReceber).toBeCloseTo(14750, 2);
    expect(s.faltaPagar).toBeCloseTo(16825.9, 2);
  });

  it("a previsão é o saldo de hoje mais o que está pendente", () => {
    const s = saldoDoMes(
      11360.76,
      parte({ total: 16750, pago: 2000 }),
      parte({ total: 16825.9, pago: 0 }),
    );
    expect(s.previsao).toBeCloseTo(11360.76 + 16750 - 16825.9, 2);
    expect(s.previsao).toBeCloseTo(s.hoje + s.faltaReceber - s.faltaPagar, 2);
  });

  it("com tudo baixado, hoje e previsão são o mesmo número", () => {
    // É o fim do mês fechado: não sobrou previsão nenhuma.
    const s = saldoDoMes(
      1000,
      parte({ total: 5000, pago: 5000 }),
      parte({ total: 3000, pago: 3000 }),
    );
    expect(s.hoje).toBe(3000);
    expect(s.previsao).toBe(3000);
    expect(s.faltaReceber).toBe(0);
    expect(s.faltaPagar).toBe(0);
  });

  it("com nada baixado, o saldo de hoje é o saldo inicial", () => {
    const s = saldoDoMes(
      11360.76,
      parte({ total: 16750 }),
      parte({ total: 16825.9 }),
    );
    expect(s.hoje).toBeCloseTo(11360.76, 2);
  });

  it("mês vazio não inventa número", () => {
    const s = saldoDoMes(500, parte(), parte());
    expect(s).toEqual({
      hoje: 500,
      previsao: 500,
      faltaReceber: 0,
      faltaPagar: 0,
    });
  });

  it("saldo inicial negativo continua negativo", () => {
    const s = saldoDoMes(-300, parte({ total: 100, pago: 100 }), parte());
    expect(s.hoje).toBe(-200);
  });
});
