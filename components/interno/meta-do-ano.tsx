import type { MetaDoAno } from "@/lib/interno/meta";
import { formatarMoeda } from "@/lib/utils";

/**
 * A meta de faturamento do ano, com o ritmo junto.
 *
 * A barra é quanto da meta já entrou. O risquinho em cima dela é onde
 * o ano estaria se viesse parelho, mês a mês: estar à esquerda dele é
 * estar atrasado, estar à direita é estar na frente. Sem esse risco a
 * barra só diz "90%", e 90% em março é ótimo e em dezembro é pouco.
 */
export function MetaDoAnoCartao({ meta }: { meta: MetaDoAno }) {
  const cheia = Math.min(Math.max(meta.fatia, 0), 1) * 100;
  const risco = Math.min(Math.max(meta.esperado / meta.meta, 0), 1) * 100;
  const bateu = meta.falta <= 0;

  return (
    <figure className="m-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Meta do ano
        </span>
        <span className="text-sm font-bold tabular-nums text-gray-900">
          {formatarMoeda(meta.meta)}
        </span>
      </div>

      <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-brand-600"
          style={{ width: `${cheia}%` }}
        />
        {/* O risco do ritmo. Não aparece no começo nem no fim do ano,
            onde cairia em cima da borda e viraria sujeira. */}
        {risco > 2 && risco < 98 ? (
          <span
            aria-hidden
            className="absolute top-0 h-full w-0.5 bg-gray-600"
            style={{ left: `${risco}%` }}
          />
        ) : null}
      </div>

      <figcaption className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-xs text-gray-600">
        <span>
          <strong className="font-semibold tabular-nums text-gray-900">
            {formatarMoeda(meta.recebido)}
          </strong>{" "}
          até aqui
        </span>
        {bateu ? (
          <span className="font-semibold text-green-800">Meta batida.</span>
        ) : meta.mesesRestantes > 0 ? (
          <span>
            faltam{" "}
            <strong
              className={
                "font-semibold tabular-nums " +
                (meta.noRitmo ? "text-gray-900" : "text-alerta")
              }
            >
              {formatarMoeda(meta.porMes)}
            </strong>{" "}
            por mês nos {meta.mesesRestantes} que restam
          </span>
        ) : (
          <span className="font-semibold text-alerta">
            Faltaram {formatarMoeda(meta.falta)}.
          </span>
        )}
        {!bateu && meta.mesesRestantes > 0 ? (
          <span className={meta.noRitmo ? "text-gray-500" : "font-semibold text-alerta"}>
            {meta.noRitmo ? "no ritmo" : "atrás do ritmo"}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
