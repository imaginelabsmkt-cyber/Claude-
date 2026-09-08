import { describe, it, expect } from "vitest";
import { paraCampo, paraNumero } from "@/lib/financeiro/valores";

describe("paraNumero", () => {
  it("aceita o formato brasileiro com milhar e decimal", () => {
    expect(paraNumero("1.700,00")).toBe(1700);
    expect(paraNumero("12.345,67")).toBe(12345.67);
  });

  it("aceita apenas vírgula decimal", () => {
    expect(paraNumero("1700,5")).toBe(1700.5);
    expect(paraNumero("86,05")).toBe(86.05);
  });

  it("distingue ponto de milhar de ponto decimal", () => {
    expect(paraNumero("1.700")).toBe(1700);
    expect(paraNumero("1700.50")).toBe(1700.5);
    expect(paraNumero("1.234.567")).toBe(1234567);
  });

  it("ignora prefixo de moeda e espaços", () => {
    expect(paraNumero("R$ 2.200,00")).toBe(2200);
    expect(paraNumero(" 159,90 ")).toBe(159.9);
  });

  it("devolve null para entradas inválidas ou vazias", () => {
    expect(paraNumero("")).toBeNull();
    expect(paraNumero("   ")).toBeNull();
    expect(paraNumero("abc")).toBeNull();
    expect(paraNumero(null)).toBeNull();
    expect(paraNumero(undefined)).toBeNull();
  });

  it("passa números adiante", () => {
    expect(paraNumero(2500)).toBe(2500);
    expect(paraNumero(Number.NaN)).toBeNull();
  });
});

describe("paraCampo", () => {
  it("formata com vírgula decimal e duas casas", () => {
    expect(paraCampo(1700)).toBe("1700,00");
    expect(paraCampo(86.05)).toBe("86,05");
    expect(paraCampo(null)).toBe("");
  });
});
