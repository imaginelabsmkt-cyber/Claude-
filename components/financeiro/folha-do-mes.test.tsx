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
 * mesma condição que mostrava o subtítulo da categoria: sem subtítulo
 * na tela o nome deixava de encurtar, e "Mensalidade" voltou nas oito
 * linhas.
 *
 * Hoje o cabeçalho da categoria aparece em TODO grupo — era o outro
 * pedido: "o item parece fazer parte da categoria de cima". Como o
 * grupo está sempre escrito, o corte também vale sempre, e as duas
 * regras pararam de brigar.
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
    // Foi exatamente este caso que quebrou uma vez: o nome voltava
    // inteiro nas oito linhas. A palavra pode (e deve) aparecer no
    // cabeçalho do grupo; o que não pode é grudada em cada cliente.
    const html = desenhar([receita("Kiku Sushi", 2200), receita("Salte", 1300)]);
    expect(html).not.toContain("Mensalidade Kiku Sushi");
    expect(html).not.toContain("Mensalidade Salte");
  });

  it("não corta palavra curta nem com o grupo escrito em cima", () => {
    // "DAS" tem três letras: cortar deixaria "do Simples Nacional",
    // que é pior do que repetir. O corte é conservador de propósito.
    const html = desenhar([
      despesa("DAS do Simples Nacional", 86.05, "DAS - Simples Nacional"),
    ]);
    expect(html).toContain("DAS do Simples Nacional");
  });

  it("escreve nome e total de TODA categoria, inclusive a de um lançamento só", () => {
    // O pedido: "o título da categoria não aparece quando ela tem só
    // um lançamento, e o item parece fazer parte da categoria de
    // cima". Aqui o DAS é o grupo de uma linha, depois de um grupo
    // maior — e tem que ter cabeçalho próprio.
    const html = desenhar([
      despesa("Canva", 35, FERRAMENTAS),
      despesa("Claude Max", 572, FERRAMENTAS),
      despesa("DAS do Simples Nacional", 86.05, "DAS - Simples Nacional"),
    ]);

    expect(html).toContain("DAS - Simples Nacional");
    expect(html).toContain("86,05");
    expect(html).toContain(FERRAMENTAS);
    expect(html).toContain("607,00");
  });

  it("escreve o cabeçalho mesmo quando a coluna tem uma categoria só", () => {
    const html = desenhar([receita("Kiku Sushi", 2200)]);
    expect(html).toContain(MENSALIDADES);
  });

  it("encurta o nome do grupo de uma linha só, porque o grupo está escrito em cima", () => {
    const html = desenhar([receita("Kiku Sushi", 2200)]);
    expect(html).toContain("Kiku Sushi");
    expect(html).not.toContain("Mensalidade Kiku Sushi");
  });

  it("escreve o total da coluna quando há mais de uma categoria", () => {
    const html = desenhar([
      despesa("Canva", 35, FERRAMENTAS),
      despesa("DAS", 86.05, "DAS - Simples Nacional"),
    ]);
    // Escrito em minúscula; quem deixa em caixa alta é o CSS.
    expect(html).toContain("Total despesas");
    expect(html).toContain("121,05");
  });

  it("não repete o total quando a coluna tem uma categoria só", () => {
    /* O total do grupo e o total da coluna seriam o MESMO número em
       duas linhas coladas. A Fran lia as duas procurando a diferença
       entre elas: "acho tudo confuso ainda". */
    const html = desenhar([
      receita("Kiku Sushi", 2200),
      receita("Salte", 1300),
    ]);
    expect(html).toContain("3.500,00");
    expect(html).not.toContain("Total receitas");
  });

  it("põe Editar em toda linha", () => {
    const html = desenhar([receita("Kiku Sushi", 2200)]);
    expect(html).toContain("Editar");
  });
});
