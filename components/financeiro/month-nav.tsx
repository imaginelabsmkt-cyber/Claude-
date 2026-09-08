"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { deslocarMes, rotuloMes } from "@/lib/financeiro/meses";

interface MonthNavProps {
  mes: string;
}

/**
 * Navegação de mês (anterior / atual / próximo). O mês vive na URL (?mes=),
 * então o link é compartilhável e o botão "voltar" do navegador funciona.
 */
export function MonthNav({ mes }: MonthNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function irPara(novoMes: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", novoMes);
    router.push(`${pathname}?${params.toString()}`);
  }

  const botao =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={botao}
        onClick={() => irPara(deslocarMes(mes, -1))}
        aria-label="Mês anterior"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <input
        type="month"
        value={mes}
        onChange={(e) => {
          if (e.target.value) irPara(e.target.value);
        }}
        aria-label="Mês de competência"
        className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />

      <button
        type="button"
        className={botao}
        onClick={() => irPara(deslocarMes(mes, 1))}
        aria-label="Próximo mês"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <span className="hidden text-sm text-gray-500 sm:inline">{rotuloMes(mes)}</span>
    </div>
  );
}
