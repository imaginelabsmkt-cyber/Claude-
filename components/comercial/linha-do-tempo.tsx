import { dataCurta } from "@/lib/comercial/reuniao";
import type { PassoDaEtapa } from "@/lib/data/comercial";

/**
 * A linha do tempo da oportunidade: por onde ela passou e quando.
 *
 * Do raio-X do Zoho: "a aba Linha do tempo mostra o histórico do
 * registro em ordem de data", e, nas lições do fim, "datas gravadas
 * desde o primeiro dia — é o que permite calcular tempo de ciclo e
 * conversão depois".
 *
 * O sistema guardava só a data da etapa ATUAL e jogava o resto fora a
 * cada movimento. Agora cada passo fica, e dá para ver que a proposta
 * ficou vinte dias parada antes de virar negociação.
 */
export function LinhaDoTempo({
  passos,
  agora,
}: {
  passos: PassoDaEtapa[];
  agora: Date;
}) {
  if (passos.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        A linha do tempo começa na próxima mudança de etapa.
      </p>
    );
  }

  /** Quantos dias a oportunidade ficou em cada passo. */
  const parados = passos.map((p, i) => {
    const fim = i + 1 < passos.length ? new Date(passos[i + 1].em) : agora;
    const dias = Math.max(
      Math.round(
        (fim.getTime() - new Date(p.em).getTime()) / 86_400_000,
      ),
      0,
    );
    return dias;
  });

  return (
    <ol className="space-y-0">
      {passos.map((p, i) => {
        const dias = parados[i];
        const ultimo = i === passos.length - 1;
        return (
          <li key={p.id} className="flex gap-3">
            {/* O fio que liga os pontos. O último não tem fio para
                baixo: a história acaba ali, por enquanto. */}
            <div className="flex flex-col items-center">
              <span
                className={
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full " +
                  (ultimo ? "bg-area" : "bg-gray-300")
                }
              />
              {!ultimo ? <span className="w-px flex-1 bg-gray-200" /> : null}
            </div>

            <div className={ultimo ? "pb-0" : "pb-4"}>
              <p className="text-sm font-medium text-gray-900">
                {p.de ? `${p.de} → ${p.para}` : `Entrou em ${p.para}`}
              </p>
              {/* A DATA, e não "foi há 24 dias": a linha do tempo é um
                  registro, e registro tem data. O tempo que a
                  oportunidade passou em cada etapa vem logo depois,
                  que é a informação que o registro sozinho não dá. */}
              <p className="text-xs text-gray-500">
                {dataCurta(p.em)}
                {dias > 0 ? (
                  <>
                    {" · "}
                    {dias} dia{dias > 1 ? "s" : ""}
                    {ultimo ? " nesta etapa" : " até a mudança"}
                  </>
                ) : null}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
