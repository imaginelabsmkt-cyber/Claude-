import { formatarMoeda } from "@/lib/utils";

export type MoneyTom = "verde" | "vermelho" | "azul" | "ambar" | "cinza" | "indigo";

const CHIP: Record<MoneyTom, string> = {
  verde: "bg-green-100 text-green-700",
  vermelho: "bg-red-100 text-red-700",
  azul: "bg-blue-100 text-blue-700",
  ambar: "bg-amber-100 text-amber-700",
  cinza: "bg-gray-100 text-gray-600",
  indigo: "bg-brand-100 text-brand-700",
};

interface MoneyStatProps {
  rotulo: string;
  valor: number;
  /** Cor do chip lateral. */
  tom?: MoneyTom;
  /** Linha de apoio (ex.: "3 lançamentos em aberto"). */
  detalhe?: string;
  /**
   * Pinta o valor de verde/vermelho conforme o sinal — usado em resultado
   * e saldo, onde o sinal é a informação mais importante.
   */
  colorirPeloSinal?: boolean;
}

/** Indicador monetário do painel financeiro. */
export function MoneyStat({
  rotulo,
  valor,
  tom = "cinza",
  detalhe,
  colorirPeloSinal = false,
}: MoneyStatProps) {
  const corValor = colorirPeloSinal
    ? valor > 0
      ? "text-green-700"
      : valor < 0
        ? "text-red-600"
        : "text-gray-900"
    : "text-gray-900";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${CHIP[tom]}`} aria-hidden="true" />
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {rotulo}
        </p>
      </div>
      <p className={`mt-2 text-xl font-bold leading-tight sm:text-2xl ${corValor}`}>
        {formatarMoeda(valor)}
      </p>
      {detalhe ? <p className="mt-1 text-xs text-gray-500">{detalhe}</p> : null}
    </div>
  );
}
