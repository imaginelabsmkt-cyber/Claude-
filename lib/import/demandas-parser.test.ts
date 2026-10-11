import { describe, it, expect } from "vitest";
import {
  parseDemandasGrade,
  parsePrazo,
  textoParaGrade,
} from "./demandas-parser";

const GRADE: string[][] = [
  ["FAVIE · Demandas para tudo acontecer"],
  ["Preencha só a coluna Status (A fazer, Fazendo ou Feito)."],
  ["Nº", "Demanda", "Responsável", "Prazo", "Mês", "Área", "Pronto quando", "Status"],
  ["1", "Primeira reunião de abertura", "As duas", "46307", "Outubro 2026", "Gestão", "Ata salva", "A fazer"],
  ["2", "Fechar o dia fixo de gravação", "Fran", "46311", "Outubro 2026", "Produção", "Agenda do mês", "Fazendo"],
  ["3", "Enviar comunicado da nova rotina", "Vitória", "46313", "Outubro 2026", "Atendimento", "Enviado aos 9", "Feito"],
];

describe("parseDemandasGrade", () => {
  const itens = parseDemandasGrade(GRADE);

  it("lê todas as linhas, ignorando título e instruções", () => {
    expect(itens.length).toBe(3);
    expect(itens[0].title).toBe("Primeira reunião de abertura");
  });

  it("mapeia responsável, área, pronto quando e status", () => {
    expect(itens[0].responsavel).toBe("As duas");
    expect(itens[0].area).toBe("Gestão");
    expect(itens[0].prontoQuando).toBe("Ata salva");
    expect(itens[0].status).toBe("A fazer");
    expect(itens[1].status).toBe("Fazendo");
    expect(itens[2].status).toBe("Feita"); // "Feito" -> "Feita"
  });

  it("converte o prazo (serial do Excel) em data ISO", () => {
    expect(itens[0].dueDate).toBe("2026-10-12");
    expect(itens[1].dueDate).toBe("2026-10-16");
  });
});

describe("parsePrazo", () => {
  it("entende serial, dd/mm/aaaa e ISO", () => {
    expect(parsePrazo("46307")).toBe("2026-10-12");
    expect(parsePrazo("13/08/2026")).toBe("2026-08-13");
    expect(parsePrazo("2026-11-01")).toBe("2026-11-01");
    expect(parsePrazo("")).toBeNull();
    expect(parsePrazo("texto")).toBeNull();
  });
});

describe("textoParaGrade", () => {
  it("quebra por TAB e por |", () => {
    expect(textoParaGrade("a\tb\tc")).toEqual([["a", "b", "c"]]);
    expect(textoParaGrade("a | b | c")).toEqual([["a", "b", "c"]]);
  });
});
