import { describe, expect, it } from "vitest";
import { ABAS_FINANCEIRO, ABA_CONFIGURACAO, abaAtiva } from "./abas";

/**
 * TODA tela do financeiro tem que acender alguma coisa na barra. Se
 * uma não acende, a pessoa abre e acha que saiu do financeiro — foi a
 * reclamação: "a gente vai pra outra aba e aí essa aba não existe".
 */
const TELAS = [
  "/interno/financeiro",
  "/interno/financeiro/lancamentos",
  "/interno/financeiro/lancamentos/novo",
  "/interno/financeiro/lancamentos/0d0f6a6e-1111-2222-3333-444455556666/editar",
  "/interno/financeiro/recorrencias",
  "/interno/financeiro/resumo-anual",
  "/interno/financeiro/estimativa",
  "/interno/financeiro/metas",
  "/interno/financeiro/relatorios",
  "/interno/financeiro/fluxo-caixa",
  "/interno/financeiro/impostos",
  "/interno/financeiro/rentabilidade",
  "/interno/relatorio",
];

describe("abaAtiva", () => {
  it("toda tela do financeiro acende exatamente uma aba", () => {
    for (const tela of TELAS) {
      const ativa = abaAtiva(tela);
      expect(ativa, `nenhuma aba acende em ${tela}`).not.toBeNull();
      expect(
        ABAS_FINANCEIRO.some((a) => a.href === ativa),
        `${tela} acendeu "${ativa}", que não é uma aba`,
      ).toBe(true);
    }
  });

  it("o formulário de lançamento acende o Mês", () => {
    // Era o caso que quebrava: o id no meio do caminho não casava com
    // chave nenhuma e a barra ficava apagada.
    expect(abaAtiva("/interno/financeiro/lancamentos/abc-123/editar")).toBe(
      "/interno/financeiro",
    );
    expect(abaAtiva("/interno/financeiro/lancamentos/novo")).toBe(
      "/interno/financeiro",
    );
  });

  it("o Mês não acende nas telas das outras abas", () => {
    expect(abaAtiva("/interno/financeiro/recorrencias")).toBe(
      "/interno/financeiro/recorrencias",
    );
    expect(abaAtiva("/interno/financeiro/resumo-anual")).toBe(
      "/interno/financeiro/resumo-anual",
    );
  });

  it("as telas que viraram link acendem a aba de onde vieram", () => {
    // Todas penduradas no Resumo, que absorveu os Relatórios.
    for (const tela of [
      "/interno/financeiro/fluxo-caixa",
      "/interno/financeiro/impostos",
      "/interno/financeiro/rentabilidade",
      "/interno/relatorio",
      "/interno/financeiro/relatorios",
    ]) {
      expect(abaAtiva(tela), tela).toBe("/interno/financeiro/resumo-anual");
    }
  });

  it("as abas têm os nomes que a Favie pediu", () => {
    expect(ABAS_FINANCEIRO.map((a) => a.label)).toEqual([
      "Este mês",
      "Contas fixas",
      "Estimativa",
      "Metas",
      "Resumo",
    ]);
  });

  it("a Configuração não acende aba nenhuma: tem o canto dela", () => {
    expect(abaAtiva(ABA_CONFIGURACAO)).toBeNull();
  });
});
