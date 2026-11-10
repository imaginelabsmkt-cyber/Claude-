import { arredondar } from "@/lib/financeiro/calculo";
import { paraNumero } from "@/lib/financeiro/valores";

/** Uma parcela da conta: o que foi digitado e quanto vale. */
export interface Parcela {
  texto: string;
  valor: number;
}

export interface Soma {
  parcelas: Parcela[];
  total: number;
  /** O que foi digitado e não virou número. */
  ignorados: string[];
}

/**
 * Soma o que foi digitado, aceitando como a pessoa escreve.
 *
 * A Fran: "queria que desse pra fazer uma calculadora bem básica.
 * Preciso somar o que eu preciso mandar pra Vitória: o pró-labore
 * dela, a mentoria e o iCloud dela. Quanto dá no total?".
 *
 * Então o separador é qualquer coisa que uma pessoa usaria: quebra de
 * linha, "+", vírgula entre itens, ponto e vírgula. E cada parcela
 * passa pelo mesmo leitor de número do resto do sistema, que entende
 * "R$ 6.500,00", "6500,00" e "6500".
 *
 * Texto que não vira número não some calado: volta em `ignorados`,
 * para a tela poder dizer que não entendeu, em vez de somar errado.
 *
 * Uma pegadinha de português: "2.166,70 + 66,90" tem vírgula DENTRO
 * do número e "+" entre eles. Por isso a vírgula só separa parcelas
 * quando não está entre dígitos.
 */
export function somar(texto: string): Soma {
  const pedacos = texto
    // vírgula entre itens ("100, 200") separa; vírgula decimal
    // ("1,50") não.
    .replace(/,(?!\d)/g, "\n")
    .replace(/(?<!\d),/g, "\n")
    .split(/[\n;+]+/);

  const parcelas: Parcela[] = [];
  const ignorados: string[] = [];

  for (const bruto of pedacos) {
    const limpo = bruto.trim();
    if (!limpo) continue;
    const valor = paraNumero(limpo);
    if (valor === null || !Number.isFinite(valor)) {
      ignorados.push(limpo);
      continue;
    }
    parcelas.push({ texto: limpo, valor });
  }

  return {
    parcelas,
    total: arredondar(parcelas.reduce((t, p) => t + p.valor, 0)),
    ignorados,
  };
}
