/**
 * Conversão de valores digitados em português para número.
 *
 * A pessoa que usa o sistema digita como está acostumada na planilha:
 * "1.700,00", "1700,5", "R$ 250" ou "250.75". Todas essas formas precisam
 * chegar ao banco como um number em reais.
 */

/**
 * Converte texto em número. Devolve null quando não há um número válido
 * (campo vazio, letras soltas, etc.), para o Zod acusar o erro.
 */
export function paraNumero(texto: string | number | null | undefined): number | null {
  if (typeof texto === "number") return Number.isFinite(texto) ? texto : null;
  if (texto == null) return null;

  const limpo = texto
    .toString()
    .trim()
    .replace(/R\$/gi, "")
    .replace(/\s/g, "");
  if (!limpo) return null;

  const temVirgula = limpo.includes(",");
  const temPonto = limpo.includes(".");

  let normalizado = limpo;
  if (temVirgula && temPonto) {
    // "1.700,50" -> ponto é separador de milhar, vírgula é decimal.
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (temVirgula) {
    // "1700,50" -> vírgula é decimal.
    normalizado = limpo.replace(",", ".");
  } else if (temPonto) {
    // "1.700" (milhar) x "1700.50" (decimal): só é milhar quando o grupo
    // final tem exatamente 3 dígitos e há mais de um grupo.
    const partes = limpo.split(".");
    const ehMilhar = partes.length > 1 && partes.slice(1).every((p) => p.length === 3);
    normalizado = ehMilhar ? partes.join("") : limpo;
  }

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Formata um número para edição em campo de texto ("1700,5" -> "1700,50").
 * Usa vírgula decimal e não coloca separador de milhar, para o campo
 * continuar fácil de editar.
 */
export function paraCampo(valor: number | null | undefined): string {
  if (valor == null) return "";
  return valor.toFixed(2).replace(".", ",");
}
