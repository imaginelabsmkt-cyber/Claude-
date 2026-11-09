import { formatarMoeda } from "@/lib/utils";

/**
 * Uma conta escrita na horizontal, com os sinais à vista.
 *
 * Nasceu de uma frase da Fran sobre o dashboard: "saiu e sobrou, em
 * qual contexto? Lá na planilha estava dentro de um contexto, aqui a
 * gente não tem contexto nenhum para essa informação".
 *
 * Ela tem razão: número sozinho não quer dizer nada. Na planilha dela
 * eles se ligam — TOTAL RECEITAS, TOTAL DESPESAS, Resultado líquido,
 * um debaixo do outro, e a conta é óbvia. Aqui é a mesma coisa, só
 * que deitada, e com o − e o = desenhados no meio.
 *
 * Serve ao mês, ao ano e ao painel: é sempre a mesma conta.
 */

export interface ParcelaDaConta {
  rotulo: string;
  valor: number;
  /** O sinal que vem ANTES desta parcela. */
  sinal?: "−" | "+" | "=";
  /** Vermelho de alerta no valor. */
  alerta?: boolean;
  /** A primeira parcela pode ser o número grande da tela. */
  destaque?: boolean;
}

function Sinal({ children }: { children: string }) {
  return (
    <span aria-hidden className="pb-1 text-lg font-bold text-gray-400">
      {children}
    </span>
  );
}

export function Conta({ parcelas }: { parcelas: ParcelaDaConta[] }) {
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
      {parcelas.map((p) => (
        <div key={p.rotulo} className="flex items-end gap-x-4">
          {p.sinal ? <Sinal>{p.sinal}</Sinal> : null}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              {p.rotulo}
            </p>
            <p
              className={
                "mt-0.5 font-bold leading-none tabular-nums " +
                (p.destaque
                  ? "text-4xl tracking-tight sm:text-5xl "
                  : "text-xl ") +
                (p.alerta ? "text-alerta" : "text-gray-900")
              }
            >
              {formatarMoeda(p.valor)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
