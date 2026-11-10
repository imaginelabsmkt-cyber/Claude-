"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Abas de CLIENTES.
 *
 * Já foram cinco itens de menu em duas áreas: Comercial (funil,
 * prospecção) e Administrativo (clientes, equipe, documentos). São
 * abas de um item só porque respondem partes da mesma pergunta: quem
 * paga a gente, quem pode vir a pagar, e o que a empresa combinou com
 * cada um.
 *
 * As rotas não mudaram — só o lugar de onde se chega nelas.
 */
const ABAS = [
  { href: "/interno/administrativo/clientes", label: "Clientes" },
  {
    href: "/interno/comercial/funil",
    label: "Oportunidades",
    /** Outras rotas que acendem esta aba. */
    tambem: ["/interno/comercial"],
  },
  { href: "/interno/administrativo/equipe", label: "Equipe" },
  { href: "/interno/administrativo/documentos", label: "Documentos" },
];

export function ClientesTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-5 flex items-center gap-5 overflow-x-auto border-b border-gray-200">
      {ABAS.map((a) => {
        const ativa =
          pathname.startsWith(a.href) ||
          (a.tambem ?? []).some(
            (r) => pathname === r || pathname.startsWith(`${r}/`),
          );
        return (
          <Link
            key={a.href}
            href={a.href}
            className={
              "-mb-px shrink-0 border-b-2 px-1 pb-2 text-sm font-semibold transition-colors " +
              (ativa
                ? "border-area text-area"
                : "border-transparent text-gray-500 hover:text-gray-800")
            }
          >
            {a.label}
          </Link>
        );
      })}
    </div>
  );
}
