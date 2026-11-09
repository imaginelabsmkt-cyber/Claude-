"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone } from "@/components/interno/icone";
import { Sair } from "@/components/interno/sair";
import {
  AREAS_EMPRESA,
  AREAS_PESSOAIS,
  area,
  areaDaRota,
  type Area,
} from "@/lib/interno/areas";
import { cn } from "@/lib/utils";

interface InternoSidebarProps {
  aberta?: boolean;
  aoFechar?: () => void;
  nomeUsuario?: string;
}

/**
 * Menu do sistema interno.
 *
 * A estrutura é a mesma do sistema de demandas da Favie — logo na cor da
 * marca, ícone + rótulo, rodapé com avatar — porque é a mesma casa, e
 * trocar de sistema não devia parecer trocar de empresa.
 *
 * O que é só daqui: a COR DA ÁREA. O ícone de cada item carrega a cor da
 * sua área, e a área aberta usa o fundo suave dela. É o mesmo código de
 * cor que aparece nas tarjas das listas.
 *
 * Dois grupos, separados por uma linha: acima é a EMPRESA (as duas sócias
 * veem o mesmo dado); abaixo é PESSOAL (cada uma vê só o seu, garantido
 * por RLS no banco).
 */
export function InternoSidebar({
  aberta = false,
  aoFechar,
  nomeUsuario,
}: InternoSidebarProps) {
  const pathname = usePathname();
  const ativa = areaDaRota(pathname);
  const inicio = area("inicio");
  const noInicio = pathname === "/interno";

  const item = (a: Area, ligado: boolean) => (
    <Link
      key={a.id}
      href={a.href}
      onClick={aoFechar}
      data-area={a.id}
      aria-current={ligado ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        ligado
          ? "bg-area-soft text-area"
          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
      )}
    >
      <Icone
        nome={a.icone}
        className={cn("h-5 w-5 shrink-0", ligado ? "" : "text-area")}
      />
      {a.label}
    </Link>
  );

  return (
    <>
      {aberta ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={aoFechar}
          aria-hidden="true"
        />
      ) : null}

      <aside
        style={{ paddingTop: "env(safe-area-inset-top)" }}
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-gray-200 bg-white transition-transform lg:translate-x-0",
          aberta ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 flex-col justify-center border-b border-gray-200 px-5">
          <span className="text-2xl font-bold lowercase leading-none tracking-tight text-brand-600">
            favie
          </span>
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.22em] text-lilas-500">
            sistema interno
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {item(inicio, noInicio)}

          <div className="my-1.5 h-px bg-gray-200" />

          {AREAS_EMPRESA.map((a) => item(a, ativa === a.id))}

          <div className="mt-3 flex items-center gap-2 px-3 pb-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Só você vê
            </span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          {AREAS_PESSOAIS.map((a) => item(a, ativa === a.id))}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center gap-3 px-1">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {(nomeUsuario ?? "U").charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
              {nomeUsuario ?? "Usuário"}
            </span>
            <Sair />
          </div>
        </div>
      </aside>
    </>
  );
}
