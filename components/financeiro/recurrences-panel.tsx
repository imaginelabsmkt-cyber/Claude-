"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { RecurrenceForm } from "@/components/financeiro/recurrence-form";
import {
  definirAtivaRecorrenciaAction,
  excluirRecorrenciaAction,
} from "@/lib/actions/financeiro";
import {
  montarPlanoFixo,
  type GrupoFixo,
  type ItemFixo,
} from "@/lib/financeiro/fixos";
import { rotuloMesCurto } from "@/lib/financeiro/meses";
import {
  clienteSeFizerFalta,
  semRepetirOGrupo,
} from "@/lib/financeiro/nomes";
import { toast } from "@/lib/ui/toast";
import { formatarMoeda } from "@/lib/utils";
import type {
  Client,
  FinancialCategory,
  FinancialRecurrenceWithRelations,
} from "@/types";

/** O lançamento que uma recorrência já gerou no mês em foco. */
export interface LancamentoDoMes {
  id: string;
  status: string;
  due_date: string | null;
}

interface RecurrencesPanelProps {
  mes: string;
  recorrencias: FinancialRecurrenceWithRelations[];
  categorias: FinancialCategory[];
  clientes: Pick<Client, "id" | "name" | "active">[];
}

/**
 * Fixos e ferramentas: o que se repete todo mês, agrupado por
 * categoria, do grupo mais caro para o mais barato.
 *
 * Era uma lista achatada de vinte cartões, misturando a mensalidade do
 * Kiku Sushi com o iCloud da Vitória, cada linha do mesmo tamanho. A
 * Fran pediu "mais intuitiva e visível como na planilha", e a planilha
 * dela faz exatamente o que faltava: um subtítulo "↳ Assinaturas e
 * ferramentas digitais" com cada ferramenta embaixo e o total do grupo
 * do lado.
 *
 * O formato é TABELA, e não a lista com caixinha da folha do mês. A
 * Fran disse duas vezes que "o que está em Mês está repetido em Fixos
 * e ferramentas": duas telas com o mesmo desenho parecem a mesma
 * tela, mesmo respondendo coisas diferentes. Tabela com cabeçalho é a
 * forma de um cadastro — o que vale, em que dia, até quando. A folha
 * do mês é a forma de uma conferência.
 */
export function RecurrencesPanel({
  mes,
  recorrencias,
  categorias,
  clientes,
}: RecurrencesPanelProps) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<FinancialRecurrenceWithRelations | null>(
    null,
  );
  const [processando, iniciar] = useTransition();

  const porId = new Map(recorrencias.map((r) => [r.id, r]));
  const plano = montarPlanoFixo(
    recorrencias.map((r) => ({
      id: r.id,
      description: r.description,
      kind: r.kind,
      amount: Number(r.amount),
      active: r.active,
      due_day: r.due_day,
      start_month: r.start_month,
      end_month: r.end_month,
      categoria: r.category?.name ?? null,
      cliente: r.client?.name ?? null,
    })),
    mes,
  );

  function alternarAtiva(r: FinancialRecurrenceWithRelations) {
    iniciar(async () => {
      const resultado = await definirAtivaRecorrenciaAction(r.id, !r.active);
      if (!resultado.ok) {
        toast.erro(resultado.error ?? "Não foi possível atualizar.");
        return;
      }
      toast.sucesso(r.active ? "Recorrência pausada." : "Recorrência reativada.");
      router.refresh();
    });
  }

  function confirmarExclusao() {
    if (!excluindo) return;
    const id = excluindo.id;
    iniciar(async () => {
      const resultado = await excluirRecorrenciaAction(id);
      if (!resultado.ok) {
        toast.erro(resultado.error ?? "Não foi possível excluir.");
        return;
      }
      setExcluindo(null);
      toast.sucesso("Recorrência excluída. Os lançamentos já gerados foram mantidos.");
      router.refresh();
    });
  }

  function Linha({
    item,
    categoria,
    sozinho,
  }: {
    item: ItemFixo;
    categoria: string;
    sozinho: boolean;
  }) {
    const r = porId.get(item.id);
    if (!r) return null;

    if (editando === item.id) {
      return (
        <tr>
          <td colSpan={5} className="px-3 py-3">
            <Card>
              <CardHeader>
                <CardTitle>Editar</CardTitle>
              </CardHeader>
              <CardContent>
                <RecurrenceForm
                  mes={mes}
                  categorias={categorias}
                  clientes={clientes}
                  recorrencia={r}
                  aoConcluir={() => setEditando(null)}
                />
              </CardContent>
            </Card>
          </td>
        </tr>
      );
    }

    const nome = sozinho
      ? item.description
      : semRepetirOGrupo(item.description, categoria);
    const cliente = clienteSeFizerFalta(nome, item.cliente);

    const acao =
      "rounded px-1.5 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900";

    return (
      <tr className={item.vigente ? "" : "opacity-60"}>
        <td className="px-3 py-2">
          <span className="text-sm font-medium text-gray-900">{nome}</span>
          {cliente ? (
            <span className="ml-2 text-xs text-gray-500">{cliente}</span>
          ) : null}
          {item.vigente ? null : (
            <Badge tom="cinza" className="ml-2 align-middle">
              {!item.active
                ? "Pausada"
                : item.start_month > mes
                  ? `começa em ${rotuloMesCurto(item.start_month)}`
                  : item.end_month
                    ? `terminou em ${rotuloMesCurto(item.end_month)}`
                    : "fora deste mês"}
            </Badge>
          )}
        </td>

        <td className="whitespace-nowrap px-3 py-2 text-right text-sm font-semibold tabular-nums text-gray-900">
          {formatarMoeda(item.amount)}
        </td>

        <td className="whitespace-nowrap px-3 py-2 text-right text-sm tabular-nums text-gray-600">
          {item.due_day ? `dia ${item.due_day}` : "—"}
        </td>

        <td className="whitespace-nowrap px-3 py-2 text-right text-xs text-gray-500">
          {item.end_month ? `até ${rotuloMesCurto(item.end_month)}` : "sem fim"}
        </td>

        <td className="whitespace-nowrap px-3 py-2 text-right">
          <span className="inline-flex items-center gap-0.5">
            <button type="button" className={acao} onClick={() => setEditando(item.id)}>
              Editar
            </button>
            <button
              type="button"
              className={acao}
              onClick={() => alternarAtiva(r)}
              disabled={processando}
            >
              {r.active ? "Pausar" : "Reativar"}
            </button>
            <button
              type="button"
              className={acao + " hover:bg-alerta-soft hover:text-alerta"}
              onClick={() => setExcluindo(r)}
              disabled={processando}
            >
              Excluir
            </button>
          </span>
        </td>
      </tr>
    );
  }

  /**
   * A lista do que se repete, em TABELA.
   *
   * Era o mesmo desenho da folha do mês — cartão por categoria,
   * linhas com barrinha —, e a Fran disse duas vezes: "o que está em
   * Mês está repetido em Fixos e ferramentas". Duas telas com o mesmo
   * formato parecem a mesma tela, mesmo quando respondem coisas
   * diferentes.
   *
   * Tabela com cabeçalho é a forma de um CADASTRO, e é isso que esta
   * tela é: o que vale, em que dia, até quando. A folha do mês
   * continua sendo lista com caixinha de marcar, que é a forma de uma
   * CONFERÊNCIA.
   */
  function Tabela({ grupos }: { grupos: GrupoFixo[] }) {
    return (
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
            <tr>
              <th scope="col" className="px-3 py-2.5 text-left font-bold">
                Conta
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-bold">
                Valor
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-bold">
                Vence
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-bold">
                Até quando
              </th>
              <th scope="col" className="px-3 py-2.5" />
            </tr>
          </thead>
          {grupos.map((grupo) => (
            <tbody key={grupo.categoria} className="divide-y divide-gray-100">
              <tr className="bg-gray-50/70">
                <th
                  scope="colgroup"
                  className="px-3 py-1.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-600"
                >
                  {grupo.categoria}
                </th>
                <td className="px-3 py-1.5 text-right text-sm font-bold tabular-nums text-gray-900">
                  {formatarMoeda(grupo.total)}
                </td>
                <td colSpan={3} />
              </tr>
              {grupo.itens.map((i) => (
                <Linha
                  key={i.id}
                  item={i}
                  categoria={grupo.categoria}
                  sozinho={grupo.itens.length === 1}
                />
              ))}
            </tbody>
          ))}
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* O botão de ADICIONAR fica no topo, antes das listas.
          Estava embaixo dos três cartões e a Fran não achou: "as
          ferramentas de novembro eu não sei onde eu adiciono". É aqui
          que se põe uma ferramenta nova, e é aqui que se põe o que
          dura alguns meses — a Mentoria até fevereiro — pelos campos
          "Começa em" e "Termina em". */}
      {/* Duas portas, lado a lado, porque a pergunta dela foi exata:
          "e se for uma conta nova que NÃO se repete, como que eu
          adiciono?". Esta tela só sabia da que se repete, e a outra
          morava em outra aba. */}
      {criando ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setCriando(true)}>
            Conta que se repete todo mês
          </Button>
          <Link href={`/interno/financeiro/lancamentos/novo?mes=${mes}`}>
            <Button variante="secundaria">Conta avulsa, só deste mês</Button>
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            r: "Receitas",
            v: formatarMoeda(plano.entra),
            d: "mensalidades em contrato",
          },
          {
            r: "Despesas",
            v: formatarMoeda(plano.sai),
            d: "custo fixo por mês",
          },
          {
            r: plano.sobra >= 0 ? "Sobra" : "Falta",
            v: formatarMoeda(Math.abs(plano.sobra)),
            d:
              plano.sobra >= 0
                ? "antes de qualquer gasto novo"
                : "só do que se repete",
            alerta: plano.sobra < 0,
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

      {criando ? (
        <Card>
          <CardHeader>
            <CardTitle>Uma conta que se repete todo mês</CardTitle>
          </CardHeader>
          <CardContent>
            <RecurrenceForm
              mes={mes}
              categorias={categorias}
              clientes={clientes}
              aoConcluir={() => setCriando(false)}
            />
          </CardContent>
        </Card>
      ) : null}

      {recorrencias.length === 0 ? (
        <EmptyState
          titulo="Nenhuma recorrência cadastrada"
          descricao="Cadastre as mensalidades dos clientes e os custos fixos. Depois, em cada mês, um clique em 'Gerar do plano fixo' cria todos os lançamentos."
        />
      ) : (
        <div className="space-y-6">
          {plano.gruposDespesa.length > 0 ? (
            <section>
              <h2 className="mb-3 text-base font-bold text-gray-900">
                Despesas
              </h2>
              <Tabela grupos={plano.gruposDespesa} />
            </section>
          ) : null}

          {plano.gruposReceita.length > 0 ? (
            <section>
              <h2 className="mb-3 text-base font-bold text-gray-900">
                Receitas
              </h2>
              <Tabela grupos={plano.gruposReceita} />
            </section>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        aberto={Boolean(excluindo)}
        titulo="Excluir recorrência?"
        descricao={
          excluindo
            ? `"${excluindo.description}" deixará de gerar lançamentos. Os lançamentos já criados nos meses anteriores permanecem no fluxo de caixa. Se for só uma pausa, prefira "Pausar".`
            : undefined
        }
        textoConfirmar="Excluir"
        varianteConfirmar="perigo"
        carregando={processando}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setExcluindo(null)}
      />
    </div>
  );
}
