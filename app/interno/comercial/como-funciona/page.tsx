import { AreaHeader } from "@/components/interno/area-header";
import { ComercialTabs } from "@/components/comercial/comercial-tabs";
import { Secao } from "@/components/interno/secao";
import { ETAPAS, rotuloDaEtapa } from "@/lib/comercial/etapas";
import {
  LEAD_CHANNEL_DETAIL,
  LEAD_CHANNEL_OPTIONS,
  LEAD_TEMPERATURE_DESC,
  LEAD_TEMPERATURE_OPTIONS,
  LOST_REASON_OPTIONS,
} from "@/types";

export const metadata = { title: "Como funciona" };

/**
 * As regras do comercial, escritas.
 *
 * Do protótipo da Vitória, é a aba "Como funciona", e ela existe
 * para as duas usarem o sistema igual.
 *
 * A diferença para o protótipo: lá o texto é fixo, digitado à mão.
 * Aqui ele é LIDO do próprio sistema, as etapas saem de
 * `lib/comercial/etapas.ts`, as origens e os motivos saem de
 * `types`. Então esta página não tem como ficar desatualizada: se eu
 * mudar uma etapa e esquecer de avisar, ela muda aqui sozinha.
 */
export default function ComoFuncionaPage() {
  return (
    <>
      <AreaHeader contexto="Como funciona" />
      <ComercialTabs />

      <Secao titulo="A jornada da oportunidade">
        <ol className="space-y-2">
          {ETAPAS.map((e, i) => (
            <li
              key={e.id}
              className="grid grid-cols-[2rem_1fr] gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
            >
              <span className="text-xl font-bold text-area">
                {e.id === "Perdido" ? "×" : i + 1}
              </span>
              <div>
                <p className="font-semibold text-gray-900">{rotuloDaEtapa(e.id)}</p>
                <p className="text-sm text-gray-600">{e.descricao}</p>
                <p className="mt-1 text-sm text-gray-900">{e.oQueFazer}</p>
                {e.diasAteOProximoContato != null ? (
                  <p className="mt-1 text-xs text-gray-500">
                    Próximo contato sugerido:{" "}
                    {e.diasAteOProximoContato === 0
                      ? "no mesmo dia"
                      : e.diasAteOProximoContato === 1
                        ? "em 1 dia"
                        : `em ${e.diasAteOProximoContato} dias`}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </Secao>

      <Secao titulo="Temperatura">
        <div className="grid gap-3 sm:grid-cols-3">
          {LEAD_TEMPERATURE_OPTIONS.map((t) => (
            <div
              key={t}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
            >
              <p className="font-semibold text-gray-900">{t}</p>
              <p className="mt-1 text-sm text-gray-600">
                {LEAD_TEMPERATURE_DESC[t]}
              </p>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Origem: de onde a oportunidade veio">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <ul className="space-y-1.5 text-sm text-gray-700">
            {LEAD_CHANNEL_OPTIONS.map((c) => (
              <li key={c}>
                <strong className="font-semibold text-gray-900">{c}:</strong>{" "}
                {LEAD_CHANNEL_DETAIL[c].toLowerCase()}
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600">
            A origem é obrigatória no cadastro e não muda depois. É ela que
            alimenta o Painel de canais.
          </p>
        </div>
      </Secao>

      <Secao titulo="Por que não fechou">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <ul className="flex flex-wrap gap-2 text-sm">
            {LOST_REASON_OPTIONS.map((m) => (
              <li
                key={m}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700"
              >
                {m}
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600">
            Lista fechada, não texto livre: com texto livre, &ldquo;preço
            alto&rdquo; e &ldquo;achou caro&rdquo; viram dois motivos
            diferentes e a conta mente.
          </p>
        </div>
      </Secao>

      <Secao titulo="Quando fecha">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-sm text-gray-700">
            O comercial termina no contrato. Ao registrar o fechamento, o
            sistema pede o valor mensal e o mês de início, cria o cliente no
            Administrativo e lança a mensalidade no Financeiro.
          </p>
          <p className="mt-2 text-sm text-gray-700">
            Vai junto: nome, contato, origem, valor fechado, início e o
            histórico inteiro da negociação.
          </p>
        </div>
      </Secao>
    </>
  );
}
