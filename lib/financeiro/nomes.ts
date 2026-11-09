/** Tira acento e põe em minúscula, para comparar palavra com palavra. */
function simples(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** A primeira palavra, já simplificada. Hífen conta como parte dela. */
function primeiraPalavra(texto: string): string {
  const m = simples(texto).match(/^[a-z0-9-]+/);
  return m ? m[0] : "";
}

/**
 * Tamanho mínimo da palavra para valer a pena cortar.
 *
 * Com três letras o corte erra: "DAS do Simples Nacional" dentro da
 * categoria "DAS - Simples Nacional" viraria "do Simples Nacional".
 * Palavra curta é ambígua demais para o corte ser seguro.
 */
const MINIMO = 5;

/**
 * O nome da linha sem repetir o que o grupo já disse.
 *
 * Numa lista agrupada, "MENSALIDADES / CLIENTES RECORRENTES" com sete
 * linhas começando em "Mensalidade" é a mesma palavra oito vezes na
 * mesma tela. O que a pessoa precisa ler é o nome do cliente.
 *
 * Só corta quando tem certeza: a primeira palavra da descrição precisa
 * ter pelo menos cinco letras e a categoria precisa COMEÇAR por ela.
 * Em qualquer outro caso devolve a descrição inteira, porque um nome
 * cortado errado é pior do que um nome repetido.
 */
export function semRepetirOGrupo(
  descricao: string,
  categoria: string | null,
): string {
  if (!categoria) return descricao;

  const palavra = primeiraPalavra(descricao);
  if (palavra.length < MINIMO) return descricao;
  if (!primeiraPalavra(categoria).startsWith(palavra)) return descricao;

  const resto = descricao.slice(descricao.search(/[a-z0-9-]/i) + palavra.length);
  const limpo = resto.replace(/^[\s:·,-]+/, "").trim();
  return limpo.length > 0 ? limpo : descricao;
}

/**
 * O nome do cliente, só quando o texto ao lado já não o diz.
 *
 * Na lista de fixos a linha já se chama "Kiku Sushi" depois do corte
 * do grupo; escrever "Kiku Sushi · dia 10" do outro lado é o mesmo
 * nome duas vezes na mesma linha.
 */
export function clienteSeFizerFalta(
  nomeNaTela: string,
  cliente: string | null,
): string | null {
  if (!cliente) return null;
  return nomeNaTela.toLowerCase().includes(cliente.toLowerCase())
    ? null
    : cliente;
}
