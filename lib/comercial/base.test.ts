import { describe, expect, it } from "vitest";
import {
  contar,
  filtrar,
  ordenar,
  rotuloDaSituacao,
  situacaoDe,
  type DaBase,
} from "@/lib/comercial/base";

function um(over: Partial<DaBase> = {}): DaBase {
  return {
    id: "l1",
    name: "Studio Ravel",
    channel: "Indicação",
    stage: "Negociação",
    temperature: "Quente",
    next_contact_on: "2026-11-25",
    estimated_monthly: 1900,
    client: null,
    ...over,
  };
}

describe("situação", () => {
  it("em aberto é negociação, e a coluna mostra a etapa", () => {
    const l = um({ stage: "Diagnóstico" });
    expect(situacaoDe(l)).toBe("Em negociação");
    expect(rotuloDaSituacao(l)).toBe("Diagnóstico");
  });

  it("fechado com cliente ativo é cliente", () => {
    const l = um({ stage: "Fechado", client: { active: true } });
    expect(situacaoDe(l)).toBe("Cliente ativo");
    expect(rotuloDaSituacao(l)).toBe("Cliente ativo");
  });

  it("fechado com cliente desativado é ex-cliente", () => {
    expect(situacaoDe(um({ stage: "Fechado", client: { active: false } }))).toBe(
      "Ex-cliente",
    );
  });

  it("fechado sem cliente ainda conta como cliente ativo", () => {
    // O cliente nasce no fechamento; se a criação falhou, a
    // oportunidade não pode virar ex-cliente por engano.
    expect(situacaoDe(um({ stage: "Fechado", client: null }))).toBe(
      "Cliente ativo",
    );
  });

  it("perdido é 'não fechou' — nunca 'perdemos'", () => {
    expect(situacaoDe(um({ stage: "Perdido" }))).toBe("Não fechou");
  });
});

describe("filtros", () => {
  const base = [
    um({ id: "a", name: "Dra. Hemilayne", channel: "Indicação", temperature: "Quente" }),
    um({ id: "b", name: "Kiku Sushi", channel: "Tráfego pago", temperature: "Frio", stage: "Perdido" }),
    um({ id: "c", name: "Studio Bambu", channel: "Indicação", temperature: "Morno", stage: "Fechado", client: { active: true } }),
  ];

  it("filtro vazio não filtra", () => {
    expect(filtrar(base, {})).toHaveLength(3);
    expect(filtrar(base, { busca: "", origem: "", situacao: "" })).toHaveLength(3);
  });

  it("acha sem acento e sem caixa", () => {
    expect(filtrar(base, { busca: "hemilayne" }).map((l) => l.id)).toEqual(["a"]);
    expect(filtrar(base, { busca: "HEMILAYNE" }).map((l) => l.id)).toEqual(["a"]);
  });

  it("filtro que não acha nada devolve lista vazia", () => {
    // E não a lista inteira: o contrário mente.
    expect(filtrar(base, { busca: "não existe" })).toEqual([]);
  });

  it("combina origem, temperatura e situação", () => {
    expect(filtrar(base, { origem: "Indicação" }).map((l) => l.id)).toEqual(["a", "c"]);
    expect(filtrar(base, { temperatura: "Frio" }).map((l) => l.id)).toEqual(["b"]);
    expect(filtrar(base, { situacao: "Cliente ativo" }).map((l) => l.id)).toEqual(["c"]);
    expect(
      filtrar(base, { origem: "Indicação", situacao: "Cliente ativo" }).map((l) => l.id),
    ).toEqual(["c"]);
  });
});

describe("ordem e contagem", () => {
  it("em negociação primeiro, maior valor em cima", () => {
    const r = ordenar([
      um({ id: "cliente", stage: "Fechado", client: { active: true }, estimated_monthly: 9000 }),
      um({ id: "pequena", estimated_monthly: 800 }),
      um({ id: "grande", estimated_monthly: 3000 }),
      um({ id: "nao-fechou", stage: "Perdido", estimated_monthly: 9999 }),
    ]);
    expect(r.map((l) => l.id)).toEqual(["grande", "pequena", "cliente", "nao-fechou"]);
  });

  it("conta cada situação", () => {
    const c = contar([
      um({ stage: "Fechado", client: { active: true } }),
      um({ stage: "Fechado", client: { active: false } }),
      um({ stage: "Perdido" }),
      um(),
    ]);
    expect(c).toEqual({
      "Em negociação": 1,
      "Cliente ativo": 1,
      "Ex-cliente": 1,
      "Não fechou": 1,
    });
  });
});
