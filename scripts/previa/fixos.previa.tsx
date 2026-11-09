/**
 * Prévia visual de "Fixos e ferramentas".
 *
 * Não é teste: não afirma nada. Desenha a tela com os valores reais da
 * planilha de novembro/2026 para a gente abrir e olhar se o
 * agrupamento ficou legível com vinte linhas na tela.
 *
 * O painel de verdade é um componente de cliente (tem formulário e
 * botões), então aqui o markup das linhas é copiado dele. O que
 * importa, que é o desenho, é o mesmo.
 */
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { Secao } from "@/components/interno/secao";
import {
  montarPlanoFixo,
  type GrupoFixo,
  type RecorrenciaFixa,
} from "@/lib/financeiro/fixos";
import { formatarMoeda } from "@/lib/utils";

const BARRA = {
  Despesa: "bg-brand-400",
  Receita: "bg-green-700",
} as const;

function d(
  description: string,
  amount: number,
  categoria: string,
  due_day = 10,
): RecorrenciaFixa {
  return {
    id: description,
    description,
    kind: "Despesa",
    amount,
    active: true,
    due_day,
    start_month: "2026-01",
    end_month: null,
    categoria,
    cliente: null,
  };
}

function r(description: string, amount: number, cliente: string): RecorrenciaFixa {
  return {
    ...d(description, amount, "Mensalidades / clientes recorrentes"),
    kind: "Receita",
    cliente,
  };
}

const FERRAMENTAS = "Assinaturas e ferramentas digitais";

const REAIS: RecorrenciaFixa[] = [
  d("Pró-labore Fran", 6500, "Pró-labore (sócias)", 5),
  d("Pró-labore Vitória", 6500, "Pró-labore (sócias)", 5),
  d("Claude Max", 454.1, FERRAMENTAS),
  d("ChatGPT Plus", 119.9, FERRAMENTAS),
  d("Adobe", 95, FERRAMENTAS),
  d("iCloud Fran", 66.9, FERRAMENTAS),
  d("iCloud Vitória", 66.9, FERRAMENTAS),
  d("Canva", 53, FERRAMENTAS),
  d("Captions", 51.9, FERRAMENTAS),
  { ...d("CapCut", 32.9, FERRAMENTAS), active: false },
  d("Honorários da contabilidade", 159.9, "Contabilidade / MEI"),
  d("DAS do Simples Nacional", 86.05, "DAS - Simples Nacional", 20),
  r("Mensalidade Malukies Cookies & Co", 2600, "Malukies Cookies & Co"),
  r("Mensalidade Kiku Sushi", 2200, "Kiku Sushi"),
  r("Mensalidade Dra. Hemilayne", 2000, "Dra. Hemilayne"),
  r("Mensalidade Izabela Schipitoski", 1800, "Izabela Schipitoski"),
  r("Mensalidade Natural Concept", 1700, "Natural Concept"),
  r("Mensalidade Laura Chioquetta", 1550, "Laura Chioquetta"),
  r("Mensalidade Studio Bambu", 1300, "Studio Bambu"),
];

function Grupo({ grupo }: { grupo: GrupoFixo }) {
  const comparar = grupo.itens.filter((i) => i.vigente).length > 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-baseline justify-between gap-3 border-b border-gray-100 bg-gray-50 px-3 py-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
          {grupo.categoria}
        </h3>
        <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900">
          {formatarMoeda(grupo.total)}
        </span>
      </div>
      <ul className="divide-y divide-gray-100">
        {grupo.itens.map((item) => (
          <li
            key={item.id}
            className={"px-3 py-2 " + (item.vigente ? "" : "opacity-60")}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">
                {item.description}
                {item.vigente ? null : (
                  <span className="ml-2 inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 align-middle text-xs font-medium text-gray-700">
                    Pausada
                  </span>
                )}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                {formatarMoeda(item.amount)}
              </span>
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-gray-500">
                {comparar && item.vigente && item.fatia > 0
                  ? `${Math.round(item.fatia * 100)}%`
                  : ""}
              </span>
              <span className="flex shrink-0 gap-0.5">
                {["Editar", "Pausar", "Excluir"].map((a) => (
                  <span
                    key={a}
                    className="rounded px-1.5 py-0.5 text-xs font-medium text-gray-500"
                  >
                    {a}
                  </span>
                ))}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {comparar ? (
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={"h-full rounded-full " + BARRA[item.kind]}
                    style={{
                      width: `${Math.max(item.fatia * 100, item.vigente ? 2 : 0)}%`,
                    }}
                  />
                </div>
              ) : (
                <span className="flex-1" />
              )}
              <span className="shrink-0 text-xs text-gray-400">
                {item.cliente ? `${item.cliente} · ` : ""}
                {item.due_day ? `dia ${item.due_day}` : "sem dia fixo"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tela() {
  const plano = montarPlanoFixo(REAIS, "2026-11");

  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          {
            r: "Entra todo mês",
            v: formatarMoeda(plano.entra),
            d: "mensalidades em contrato",
          },
          {
            r: "Sai todo mês",
            v: formatarMoeda(plano.sai),
            d: "pró-labore, ferramentas, impostos",
          },
          {
            r: "Falta todo mês",
            v: formatarMoeda(Math.abs(plano.sobra)),
            d: "só do que se repete",
            alerta: true,
          },
        ].map((x) => (
          <div
            key={x.r}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
              {x.r}
            </p>
            <p
              className={
                "mt-0.5 text-xl font-bold tabular-nums " +
                (x.alerta ? "text-alerta" : "text-gray-900")
              }
            >
              {x.v}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">{x.d}</p>
          </div>
        ))}
      </div>

      <Secao
        titulo="O que sai todo mês"
        explicacao="Por categoria, da mais cara para a mais barata. A barrinha é a fatia do item dentro do grupo dele."
      >
        <div className="space-y-3">
          {plano.gruposDespesa.map((g) => (
            <Grupo key={g.categoria} grupo={g} />
          ))}
        </div>
      </Secao>

      <Secao
        titulo="O que entra todo mês"
        explicacao="As mensalidades em contrato. Mudou aqui, muda a cobrança do mês."
      >
        <div className="space-y-3">
          {plano.gruposReceita.map((g) => (
            <Grupo key={g.categoria} grupo={g} />
          ))}
        </div>
      </Secao>
    </>
  );
}

describe("prévia", () => {
  it("escreve o HTML de Fixos e ferramentas", () => {
    writeFileSync(
      process.env.SAIDA_FIXOS!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="app.css"></head>
<body data-area="financeiro"><div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">${renderToStaticMarkup(
        <Tela />,
      )}</div></body></html>`,
    );
  });
});
