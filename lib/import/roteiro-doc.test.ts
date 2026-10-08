import { describe, it, expect } from "vitest";
import { parseRoteiroDoc, roteiroDocParaScript } from "./roteiro-doc";
import { COL_DELIM } from "./planning-parser";

// Texto como sai do PDF modelo (colunas "achatadas": FALA, depois CENAS).
const TEXTO = `##############################################################################
CONTEÚDO 8: REELS: SERÁ QUE O PROBLEMA É O PESO? A VERDADE SOBRE DOR NA LOMBAR
E MUSCULAÇÃO
DATA DA POSTAGEM: 13/08 (QUINTA-FEIRA)
LOCAL: ACADEMIA
VESTIMENTA: ROUPA DE ACADEMIA
FALA / LETTERING CENAS
FALA: Sua lombar dói porque você treina
pesado? Então por que tem gente levantando
muito mais peso e não sente nada?
LETTERING: Será que o problema é o peso?
Fisio olhando direto pra câmera, plano médio.
FALA: Na maioria das vezes o problema não é o
peso, seu corpo se adapta à carga.
FALA: A dor aparece quando o treino cobra
mais do que você recupera, ou quando seu
corpo compensa e sobrecarrega a lombar, até
sem peso.
LETTERING: Nem sempre é o peso, às vezes é o
movimento
Exercício 1: fisio executando agachamento ou
terra enquanto a fala segue em off, volta pra
câmera na parte do "sem peso".
FALA: Como saber se é seu caso? Dor muscular
pós-treino é normal, agora dor na coluna que
volta todo treino ou não passa em poucos dias
é seu corpo avisando.
LETTERING: Dor recorrente não é adaptação
Fisio na câmera, ângulo mais fechado, tom de
quem explica pra um amigo.`;

describe("parseRoteiroDoc", () => {
  const r = parseRoteiroDoc(TEXTO);

  it("reconhece o modelo e reconstrói as linhas", () => {
    expect(r).not.toBeNull();
    expect(r!.linhas.length).toBe(3);
  });

  it("não deixa o cabeçalho (CONTEÚDO/DATA/LOCAL) virar roteiro", () => {
    const todo = r!.linhas.map((l) => `${l.fala} ${l.cena}`).join(" ");
    expect(todo).not.toMatch(/DATA DA POSTAGEM/i);
    expect(todo).not.toMatch(/LOCAL: ACADEMIA/i);
    expect(todo).not.toMatch(/CONTE[UÚ]DO 8/i);
    expect(todo).not.toMatch(/####/);
  });

  it("separa FALA/LETTERING da CENA corretamente", () => {
    const l1 = r!.linhas[0];
    expect(l1.fala).toMatch(/^FALA: Sua lombar/);
    expect(l1.fala).toMatch(/LETTERING: Será que o problema é o peso\?$/);
    expect(l1.cena).toBe("Fisio olhando direto pra câmera, plano médio.");

    const l2 = r!.linhas[1];
    expect(l2.fala).toMatch(/^FALA: Na maioria/);
    expect(l2.fala).toMatch(/LETTERING: Nem sempre é o peso/);
    expect(l2.cena).toMatch(/^Exercício 1: fisio executando/);
    expect(l2.cena).toMatch(/sem peso/);
  });

  it("gera script de 2 colunas com o separador certo", () => {
    const script = roteiroDocParaScript(r!);
    const linhas = script.split("\n");
    expect(linhas[0]).toBe(`FALA / LETTERING${COL_DELIM}CENAS`);
    expect(linhas[1].split(COL_DELIM).length).toBe(2);
  });

  it("retorna null quando não é esse modelo", () => {
    expect(parseRoteiroDoc("qualquer texto solto\nsem tabela")).toBeNull();
  });
});
