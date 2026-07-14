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
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(data));
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
