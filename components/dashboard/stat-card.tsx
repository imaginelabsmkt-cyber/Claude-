import Link from "next/link";

/** Tons de cor disponíveis para o chip do indicador. */
export type StatTom =
  | "indigo"
  | "azul"
  | "ambar"
  | "verde"
  | "vermelho"
  | "cinza";

const CHIP: Record<StatTom, string> = {
  indigo: "bg-brand-100 text-brand-700",
  azul: "bg-blue-100 text-blue-700",
  ambar: "bg-amber-100 text-amber-700",
  verde: "bg-green-100 text-green-700",
  vermelho: "bg-red-100 text-red-700",
  cinza: "bg-gray-100 text-gray-600",
};

const HOVER: Record<StatTom, string> = {
  indigo: "hover:border-brand-300 hover:bg-brand-50/50",
  azul: "hover:border-blue-300 hover:bg-blue-50/50",
  ambar: "hover:border-amber-300 hover:bg-amber-50/50",
  verde: "hover:border-green-300 hover:bg-green-50/50",
  vermelho: "hover:border-red-300 hover:bg-red-50/50",
  cinza: "hover:border-gray-300 hover:bg-gray-50",
};

interface StatCardProps {
  rotulo: string;
  valor: number;
  href: string;
  /** Realça o número em vermelho quando > 0 (ex.: atrasados). */
  destaque?: boolean;
  /** Emoji/ícone exibido no chip colorido. */
  icone?: string;
  /** Cor do chip e do hover. */
  tom?: StatTom;
}

/** Card de indicador clicável que leva para uma listagem filtrada. */
export function StatCard({
  rotulo,
  valor,
  href,
  destaque,
  icone,
  tom = "cinza",
}: StatCardProps) {
  const alerta = destaque && valor > 0;
  return (
    <Link href={href} className="block">
      <div
        className={
          "flex h-full items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition-colors " +
          (alerta ? "border-red-200 " : "border-gray-200 ") +
          HOVER[alerta ? "vermelho" : tom]
        }
      >
        {icone ? (
          <span
            className={
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg " +
              CHIP[alerta ? "vermelho" : tom]
            }
            aria-hidden="true"
          >
            {icone}
          </span>
        ) : null}
        <div className="min-w-0">
          <p
            className={
              "text-2xl font-bold leading-none " +
              (alerta ? "text-red-600" : "text-gray-900")
            }
          >
            {valor}
          </p>
          <p className="mt-1 text-xs leading-tight text-gray-500">{rotulo}</p>
        </div>
      </div>
    </Link>
  );
}
