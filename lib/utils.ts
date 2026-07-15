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
