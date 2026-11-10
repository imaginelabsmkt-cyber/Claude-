/**
 * Prévia visual do Dashboard.
 *
 * Não é teste: não afirma nada. Desenha a tela para a gente abrir e
 * olhar antes de subir.
 *
 * DUAS REGRAS, as duas aprendidas errando:
 *
 * 1. NÚMEROS DE VERDADE. Os valores daqui são os da planilha do Drive
 *    (Fluxo_Caixa_Imagine_Labs_2026, aba Resumo Anual), mês a mês. A
 *    versão anterior tinha números inventados, eu mandei a imagem para
 *    a Fran como se fosse o sistema dela, e ela viu um ano que não é o
 *    dela — "teve mês que a gente faturou 20.000 e você não levou em
 *    consideração". Era maio: R$ 20.958,00. Estava certo no sistema e
 *    errado só aqui.
 *
 * 2. SEM CÓPIA DO MARKUP. O cartão do ano é <CartaoDoAno>, o mesmo
 *    componente que a página renderiza. Cópia envelhece.
 */
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { BarrasRanqueadas } from "@/components/interno/barras-ranqueadas";
import { CartaoDoAno } from "@/components/interno/cartao-do-ano";
import { OrigemItem, OrigemLista } from "@/components/interno/origem-item";
import { Secao } from "@/components/interno/secao";
import { faturamentoAnual, type MesFaturamento } from "@/lib/interno/ano";
import { metaDoAno } from "@/lib/interno/meta";
import { rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

const MES = "2026-11";

/**
 * A planilha, linha por linha. `receitas` e `despesas` são o TOTAL de
 * cada aba mensal — tudo que foi lançado, caído ou não, que é como a
 * planilha soma. `recebido` e `pago` são a marcação: o que já caiu.
 *
 * Em outubro a Malukies (R$ 2.600,00) está "Pendente": entra no total
 * e fica de fora do recebido. Novembro tem três mensalidades caídas
 * (Laura, Izabela, Natural Concept) e nenhuma despesa paga.
 */
const REAIS: MesFaturamento[] = [
  { mes: "2026-04", receitas: 15271, despesas: 11548.03, recebido: 15271, pago: 11548.03, saldoFinal: 3722.97 },
  { mes: "2026-05", receitas: 20958, despesas: 16224.11, recebido: 20958, pago: 16224.11, saldoFinal: 8456.86 },
  { mes: "2026-06", receitas: 20418, despesas: 14767.16, recebido: 20418, pago: 14767.16, saldoFinal: 14107.7 },
  { mes: "2026-07", receitas: 18747, despesas: 15567.02, recebido: 18747, pago: 15567.02, saldoFinal: 17287.68 },
  { mes: "2026-08", receitas: 15500, despesas: 15900.22, recebido: 15500, pago: 15900.22, saldoFinal: 16887.46 },
  { mes: "2026-09", receitas: 15650, despesas: 17813.92, recebido: 15650, pago: 17813.92, saldoFinal: 14723.54 },
  { mes: "2026-10", receitas: 14150, despesas: 16950.16, recebido: 11550, pago: 16950.16, saldoFinal: 11923.38 },
  { mes: "2026-11", receitas: 14450, despesas: 13956.75, recebido: 5050, pago: 0, saldoFinal: 12416.63 },
];

/** Exemplo: a meta de verdade é a Fran que define nas Configurações. */
const META_DE_EXEMPLO = 200000;

/** Igual ao <Indicador> da página. */
function Indicador({
  rotulo,
  valor,
  detalhe,
  alerta,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  alerta?: boolean;
}) {
  return (
    <span
      className={
        "block rounded-2xl border bg-white px-4 py-3 shadow-sm " +
        (alerta ? "border-alerta" : "border-gray-200")
      }
    >
      <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
        {rotulo}
      </span>
      <span
        className={
          "mt-0.5 block text-xl font-bold tabular-nums " +
          (alerta ? "text-alerta" : "text-gray-900")
        }
      >
        {valor}
      </span>
      {detalhe ? (
        <span className="mt-0.5 block text-xs text-gray-500">{detalhe}</span>
      ) : null}
    </span>
  );
}

function Tela() {
  const ano = faturamentoAnual(2026, REAIS);
  const meta = metaDoAno(META_DE_EXEMPLO, ano.recebido, ano.ano, MES);

  return (
    <>
      <Secao
        titulo={`O ano de ${ano.ano}`}
        acao={<span className="font-medium text-gray-600">Abrir o resumo do ano</span>}
      >
        <CartaoDoAno ano={ano} meta={meta} />
      </Secao>

      <Secao titulo={rotuloMes(MES)}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Indicador
            rotulo="Em caixa"
            valor={formatarMoeda(12416.63)}
            detalhe="cobre até Maio/2027"
          />
          <Indicador
            rotulo="Vencido a receber"
            valor={formatarMoeda(0)}
            detalhe="nada vencido"
          />
          <Indicador
            rotulo="Vencido a pagar"
            valor={formatarMoeda(0)}
            detalhe="nada vencido"
          />
          <Indicador
            rotulo="No funil"
            valor={formatarMoeda(5400)}
            detalhe="3 oportunidades"
          />
          <Indicador rotulo="Contratos" valor="2" detalhe="pedem conversa" alerta />
        </div>
      </Secao>

      <div className="grid gap-x-4 lg:grid-cols-2">
        <Secao
          titulo="O funil, por etapa"
          acao={<span className="font-medium text-gray-600">Abrir o comercial</span>}
        >
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <BarrasRanqueadas
              itens={[
                { rotulo: "Contato feito", valor: 1800, detalhe: "2 oportunidades" },
                { rotulo: "Diagnóstico", valor: 2200, detalhe: "1 oportunidade" },
                { rotulo: "Proposta enviada", valor: 1400, detalhe: "1 oportunidade" },
              ]}
              cor="#7a2740"
              ordenar={false}
            />
          </div>
        </Secao>

        <Secao
          titulo="Quem paga a conta em 2026"
          acao={<span className="font-medium text-gray-600">Abrir os clientes</span>}
        >
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <BarrasRanqueadas
              itens={[
                { rotulo: "Kiku Sushi", valor: 17600 },
                { rotulo: "Malukies Cookies & Co", valor: 15400 },
                { rotulo: "Laura Chioquetta", valor: 12400 },
                { rotulo: "Natural Concept", valor: 11900 },
                { rotulo: "Dra. Hemilayne", valor: 9794 },
                { rotulo: "Izabela Schipitoski", valor: 7200 },
                { rotulo: "Studio Bambu", valor: 3900 },
              ]}
              cor="#1d5a9e"
              limite={6}
            />
          </div>
        </Secao>
      </div>

      <Secao titulo="Precisa de você">
        <OrigemLista>
          <OrigemItem
            origem="financeiro"
            titulo="Pró-labore Fran"
            descricao="Pró-labore (sócias)"
            valor={formatarMoeda(6500)}
            prazo="vence amanhã"
          />
          <OrigemItem
            origem="comercial"
            titulo="Renovar contrato: Studio Bambu"
            descricao="contrato vai até 2026-12"
            valor={formatarMoeda(1300)}
            prazo="em 2 meses"
          />
          <OrigemItem
            origem="administrativo"
            titulo="Enviar relatório para a Dra. Hemilayne"
            descricao="Clientes"
            prazo="dia 30"
          />
        </OrigemLista>
      </Secao>
    </>
  );
}

describe("prévia", () => {
  it("escreve o HTML do Dashboard", () => {
    writeFileSync(
      process.env.SAIDA!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="app.css"></head>
<body data-area="inicio"><div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">${renderToStaticMarkup(
        <Tela />,
      )}</div></body></html>`,
    );
  });
});
