"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Abas do Administrativo.
 *
 * Clientes, Equipe e Documentos já foram três itens de menu separados.
 * São abas porque respondem partes da mesma pergunta: como a empresa
 * se organiza. O cadastro do cliente e o contrato dele, quem trabalha
 * aqui e em que condição, e os papéis da empresa.
 */
const ABAS = [
  { href: "/interno/administrativo/clientes", label: "Clientes" },
  { href: "/interno/administrativo/equipe", label: "Equipe" },
  { href: "/interno/administrativo/documentos", label: "Documentos" },
];

export function AdministrativoTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-5 flex items-center gap-5 overflow-x-auto border-b border-gray-200">
      {ABAS.map((a) => {
        const ativa = pathname.startsWith(a.href);
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
