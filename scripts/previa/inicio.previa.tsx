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
import { CartaoDoAno } from "@/components/interno/cartao-do-ano";
import { OrigemItem, OrigemLista } from "@/components/interno/origem-item";
import { Secao } from "@/components/interno/secao";
import { faturamentoAnual, type MesFaturamento } from "@/lib/interno/ano";
import { metaDoAno } from "@/lib/interno/meta";
import { rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

const MES = "2026-11";

/**
 * A planilha, linha por linha. Receitas e despesas são o TOTAL de cada
 * aba mensal; o saldo é o "Saldo Final do Mês" da própria planilha.
 *
 * Novembro ainda está em aberto: caíram três mensalidades (Laura,
 * Izabela e Natural Concept) e nenhuma despesa foi paga. O previsto é
 * o mês cheio.
 */
const REAIS: MesFaturamento[] = [
  { mes: "2026-04", receitas: 15271, despesas: 11548.03, receitasPrevistas: 15271, despesasPrevistas: 11548.03, saldoFinal: 3722.97 },
  { mes: "2026-05", receitas: 20958, despesas: 16224.11, receitasPrevistas: 20958, despesasPrevistas: 16224.11, saldoFinal: 8456.86 },
  { mes: "2026-06", receitas: 20418, despesas: 14767.16, receitasPrevistas: 20418, despesasPrevistas: 14767.16, saldoFinal: 14107.7 },
  { mes: "2026-07", receitas: 18747, despesas: 15567.02, receitasPrevistas: 18747, despesasPrevistas: 15567.02, saldoFinal: 17287.68 },
  { mes: "2026-08", receitas: 15500, despesas: 15900.22, receitasPrevistas: 15500, despesasPrevistas: 15900.22, saldoFinal: 16887.46 },
  { mes: "2026-09", receitas: 15650, despesas: 17813.92, receitasPrevistas: 15650, despesasPrevistas: 17813.92, saldoFinal: 14723.54 },
  { mes: "2026-10", receitas: 14150, despesas: 16950.16, receitasPrevistas: 14150, despesasPrevistas: 16950.16, saldoFinal: 11923.38 },
  { mes: "2026-11", receitas: 5050, despesas: 0, receitasPrevistas: 14450, despesasPrevistas: 13956.75, saldoFinal: 16973.38 },
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
            valor={formatarMoeda(16973.38)}
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
