"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LEAD_CHANNEL_OPTIONS, LEAD_STAGES_ABERTAS } from "@/types";

/**
 * Modo de exibição e filtros do funil.
 *
 * Vem do raio-X do Zoho que a Vitória fez: todo módulo tem a MESMA
 * barra — exibição, filtro, e os modos lista / quadro. "Um padrão de
 * tela só" é a lição que ela destacou no fim do estudo.
 *
 * Aqui o funil só tinha QUADRO, e a Fran: "os clientes que estão em
 * prospecção não aparecem, só aparece quantitativo". No quadro o nome
 * aparece, mas espalhado em cinco colunas que rolam de lado no
 * celular; não existia um lugar que respondesse "me mostra todas, em
 * ordem". Agora existe, e é o modo que abre primeiro.
 *
 * Tudo mora na URL: o recorte sobrevive à recarga e dá para mandar o
 * link para a Vitória.
 */
export function BarraDoFunil({ quantos }: { quantos: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const modo = searchParams.get("v") === "quadro" ? "quadro" : "lista";

  function aplicar(chave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor && valor !== "todos") params.set(chave, valor);
    else params.delete(chave);
    router.push(`${pathname}?${params.toString()}`);
  }

  const botao = (destino: "lista" | "quadro", rotulo: string) => (
    <button
      type="button"
      onClick={() => aplicar("v", destino)}
      aria-pressed={modo === destino}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
        modo === destino
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-600 hover:text-gray-900",
      )}
    >
      {rotulo}
    </button>
  );

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
        {botao("lista", "Lista")}
        {botao("quadro", "Quadro")}
      </div>

      <Select
        aria-label="Filtrar por etapa"
        className="w-auto"
        value={searchParams.get("etapa") ?? "todos"}
        onChange={(e) => aplicar("etapa", e.target.value)}
      >
        <option value="todos">Todas as etapas</option>
        {LEAD_STAGES_ABERTAS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Filtrar por canal"
        className="w-auto"
        value={searchParams.get("canal") ?? "todos"}
        onChange={(e) => aplicar("canal", e.target.value)}
      >
        <option value="todos">De qualquer canal</option>
        {LEAD_CHANNEL_OPTIONS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>

      <span className="ml-auto text-sm text-gray-500">
        {quantos === 1 ? "1 oportunidade" : `${quantos} oportunidades`}
      </span>
    </div>
  );
}
