"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/*
 * As cinco telas do protótipo da Vitória, nesta ordem.
 *
 * Antes eram três, com outros nomes: Funil, Encerradas, Prospecção.
 * "Encerradas" só mostrava quem já tinha acabado, e não existia um
 * lugar com TODO MUNDO; "Prospecção" é o painel de canais, mas o
 * nome não dizia isso.
 */
const ABAS = [
  { href: "/interno/comercial/hoje", label: "Hoje" },
  { href: "/interno/comercial/funil", label: "Funil" },
  { href: "/interno/comercial/leads", label: "Leads e clientes" },
  { href: "/interno/comercial/prospeccao", label: "Painel de canais" },
  { href: "/interno/comercial/como-funciona", label: "Como funciona" },
];

/** Navegação do comercial. Quem JÁ é cliente mora no Administrativo. */
export function ComercialTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-5 flex items-center gap-5 overflow-x-auto border-b border-gray-200">
      {ABAS.map((a) => {
        const ativa =
          a.href === "/interno/comercial"
            ? pathname === a.href
            : pathname.startsWith(a.href);
        return (
          <Link
            key={a.href}
            href={a.href}
            className={
              "-mb-px shrink-0 whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-semibold transition-colors " +
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
