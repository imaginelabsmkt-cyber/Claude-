"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/interno/comercial/funil", label: "Funil" },
  { href: "/interno/comercial/prospeccao", label: "Prospecção" },
];

/** Navegação do comercial. Quem JÁ é cliente mora no Administrativo. */
export function ComercialTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-5 flex items-center gap-5 border-b border-gray-200">
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
              "-mb-px border-b-2 px-1 pb-2 text-sm font-semibold transition-colors " +
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
