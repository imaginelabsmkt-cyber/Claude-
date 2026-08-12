import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classes do Tailwind de forma segura, resolvendo conflitos.
 * Uso: cn("px-2", condicao && "px-4") -> "px-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata uma data ISO para o padrão brasileiro (dd/mm/aaaa).
 * Retorna "—" quando a data é nula.
 */
export function formatarData(data: string | null): string {
  if (!data) return "—";
  // Datas "YYYY-MM-DD" devem ser lidas como LOCAIS (senão new Date() assume
  // meia-noite UTC e, em fusos negativos, exibe o dia anterior — além de
  // causar mismatch de hidratação em componentes client).
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(data);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/**
 * Escapa os curingas de LIKE (%, _ e \) para que a busca trate o termo
 * como texto literal (ex.: buscar "50%" não vira wildcard).
 */
export function escaparLike(termo: string): string {
  return termo.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Formata um valor numérico como moeda brasileira (R$ 1.234,56).
 * Retorna "—" quando o valor é nulo/indefinido.
 */
export function formatarMoeda(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

/**
 * Formata um número de WhatsApp (apenas dígitos) para exibição amigável.
 * Ex.: "5511987654321" -> "+55 (11) 98765-4321". Se não reconhecer o
 * padrão brasileiro, devolve o valor original.
 */
export function formatarWhatsapp(numero: string | null | undefined): string {
  if (!numero) return "—";
  const d = numero.replace(/\D/g, "");
  const br = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(d);
  if (br) return `+55 (${br[1]}) ${br[2]}-${br[3]}`;
  return numero;
}

/**
 * Normaliza um número de WhatsApp para apenas dígitos com DDI 55.
 * Aceita entradas com máscara, espaços ou +. Assume Brasil quando o DDI
 * não é informado. Retorna null se não sobrar número utilizável.
 */
export function normalizarWhatsapp(
  numero: string | null | undefined,
): string | null {
  if (!numero) return null;
  let d = numero.replace(/\D/g, "");
  if (!d) return null;
  // Já veio com DDI 55 (12 ou 13 dígitos): mantém.
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return d;
  // 10 ou 11 dígitos (DDD + número, sem DDI): prefixa 55.
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d;
}

/**
 * Formata data e hora no padrão brasileiro (dd/mm/aaaa às HH:mm).
 * Retorna "—" quando a data é nula.
 */
export function formatarDataHora(data: string | null): string {
  if (!data) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}
