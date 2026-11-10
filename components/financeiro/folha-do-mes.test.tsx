/**
 * O que a folha do mês ESCREVE.
 *
 * Não julga layout nem cor — isso é olho, e para isso existem as
 * prévias. Aqui ficam as regras de escrita que a Fran pediu e que já
 * voltaram a ser quebradas por refatoração minha:
 *
 *   "nao precisa repetir mensalidade"  →  "busque coisas que se repitam"
 *
 * A regra morreu uma vez porque eu amarrei o encurtamento do nome à
 * mesma condição que mostra o subtítulo da categoria. Com uma
 * categoria só na coluna, o subtítulo some (certo) e o nome deixava
 * de encurtar (errado), e "Mensalidade" voltou nas oito linhas.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => "/interno/financeiro",
  useSearchParams: () => new URLSearchParams(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { FolhaDoMes } from "@/components/financeiro/folha-do-mes";
import type { LancamentoFolha } from "@/lib/financeiro/folha";

const MENSALIDADES = "Mensalidades / clientes recorrentes";
const FERRAMENTAS = "Assinaturas e ferramentas digitais";

function receita(nome: string, valor: number): LancamentoFolha {
  return {
    id: "r-" + nome,
    description: `Mensalidade ${nome}`,
    kind: "Receita",
    amount: valor,
    status: "Pendente",
    due_date: "2026-12-10",
    categoria: MENSALIDADES,
    cliente: nome,
  };
}

function despesa(nome: string, valor: number, categoria: string): LancamentoFolha {
  return {
    id: "d-" + nome,
    description: nome,
    kind: "Despesa",
    amount: valor,
    status: "Pendente",
    due_date: "2026-12-20",
    categoria,
    cliente: null,
  };
}

/**
 * O texto que a pessoa LÊ, sem as marcações.
 *
 * Tem que tirar as tags: o nome inteiro continua (e deve continuar)
 * dentro de `title` e `aria-label`, para quem usa leitor de tela e
 * para quem passa o mouse. O que não pode é estar escrito na linha.
 */
const desenhar = (lancamentos: LancamentoFolha[]) =>
  renderToStaticMarkup(
    <FolhaDoMes mes="2026-11" hoje="2026-11-10" lancamentos={lancamentos} />,
  )
    // Fora o texto de leitor de tela: ali o nome inteiro DEVE estar
    // ("Marcar Mensalidade Kiku Sushi como pago"), porque quem não vê
    // a coluna não tem o grupo para completar a frase.
    .replace(/<span class="sr-only">.*?<\/span>/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ");

describe("folha do mês: o que está escrito", () => {
  it("não repete a palavra da categoria em cada linha", () => {
    const html = desenhar([
      receita("Kiku Sushi", 2200),
      receita("Studio Bambu", 1300),
      receita("Natural Concept", 1700),
    ]);

    expect(html).toContain("Kiku Sushi");
    expect(html).toContain("Studio Bambu");
    // A palavra só pode aparecer onde ela significa alguma coisa: no
    // nome da categoria. Nunca grudada em cada cliente.
    expect(html).not.toContain("Mensalidade Kiku Sushi");
    expect(html).not.toContain("Mensalidade Studio Bambu");
  });

  it("encurta mesmo quando a coluna tem UMA categoria só", () => {
    // Foi exatamente este caso que quebrou: sem subtítulo de
    // categoria na tela, o nome voltava inteiro.
    const html = desenhar([receita("Kiku Sushi", 2200), receita("Salte", 1300)]);
    expect(html).not.toContain("Mensalidade");
  });

  it("deixa o nome inteiro quando o grupo tem uma linha só", () => {
    // Com uma linha só não há repetição para cortar, e cortar
    // deixaria a linha sem nome ("DAS - Simples Nacional" viraria
    // vazio).
    const html = desenhar([
      despesa("DAS do Simples Nacional", 86.05, "DAS - Simples Nacional"),
    ]);
    expect(html).toContain("DAS do Simples Nacional");
  });

  it("escreve o total no fim de cada coluna", () => {
    const html = desenhar([
      receita("Kiku Sushi", 2200),
      receita("Salte", 1300),
      despesa("Canva", 35, FERRAMENTAS),
    ]);
    // Escrito em minúscula; quem deixa em caixa alta é o CSS.
    expect(html).toContain("Total receitas");
    expect(html).toContain("Total despesas");
    expect(html).toContain("3.500,00");
  });

  it("põe Editar em toda linha", () => {
    const html = desenhar([receita("Kiku Sushi", 2200)]);
    expect(html).toContain("Editar");
  });
});
