"use client";

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

/**
 * Cor da barra de fatia.
 *
 * Vinho claro da marca para despesa e verde para receita. Despesa em
 * vermelho forte seriam vinte barras gritando na mesma tela, e aí
 * nenhuma chama atenção. Os dois passam de 3:1 sobre o papel do cartão,
 * que é o mínimo para uma marca colorida.
 */
const BARRA = {
  Despesa: "bg-brand-400",
  Receita: "bg-green-700",
} as const;

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
  /** Por id de recorrência, o lançamento dela neste mês. */
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
 * Aqui cada item ainda ganha uma barrinha com a fatia dele dentro do
 * grupo, que é o que responde de olho a pergunta real: "o que está
 * pesando?". Com oito ferramentas, uma delas é metade da conta, e numa
 * lista de números iguais isso não aparece.
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
    comparar,
    categoria,
    sozinho,
  }: {
    item: ItemFixo;
    comparar: boolean;
    categoria: string;
    sozinho: boolean;
  }) {
    const r = porId.get(item.id);
    if (!r) return null;

    if (editando === item.id) {
      return (
        <li className="px-3 py-3">
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
        </li>
      );
    }

    const nome = sozinho
      ? item.description
      : semRepetirOGrupo(item.description, categoria);
    const cliente = clienteSeFizerFalta(nome, item.cliente);

    const acao =
      "rounded px-1.5 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900";

    return (
      <li className={"group px-3 py-2 " + (item.vigente ? "" : "opacity-60")}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">
            {nome}
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
          </span>

          <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
            {formatarMoeda(item.amount)}
          </span>

          <span className="flex shrink-0 items-center gap-0.5">
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
        </div>

        {/* A barrinha é a fatia dentro do grupo: é ela que responde
            "o que está pesando?" sem ninguém fazer conta.

            Num grupo de um item só ela não aparece: seria sempre uma
            barra cheia dizendo "100% de si mesmo", que é tinta sem
            informação nenhuma. */}
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
            {cliente ? `${cliente} · ` : ""}
            {item.due_day ? `dia ${item.due_day}` : "sem dia fixo"}
            {item.end_month ? ` · até ${rotuloMesCurto(item.end_month)}` : ""}
          </span>
        </div>
      </li>
    );
  }

  function Grupo({ grupo }: { grupo: GrupoFixo }) {
    // Só faz sentido comparar fatias quando há com o que comparar.
    const comparar = grupo.itens.filter((i) => i.vigente).length > 1;

    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Categoria de uma linha só não ganha subtítulo: o subtítulo e
            a linha diriam quase a mesma coisa, uma embaixo da outra. */}
        {grupo.itens.length > 1 ? (
          <div className="flex items-baseline justify-between gap-3 border-b border-gray-100 bg-gray-50 px-3 py-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
              {grupo.categoria}
            </h3>
            <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900">
              {formatarMoeda(grupo.total)}
            </span>
          </div>
        ) : null}
        <ul className="divide-y divide-gray-100">
          {grupo.itens.map((i) => (
            <Linha
              key={i.id}
              item={i}
              comparar={comparar}
              categoria={grupo.categoria}
              sozinho={grupo.itens.length === 1}
            />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            r: "Entra",
            v: formatarMoeda(plano.entra),
            d: "mensalidades em contrato",
          },
          {
            r: "Sai",
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
            <CardTitle>Nova recorrência</CardTitle>
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
      ) : (
        <Button variante="secundaria" onClick={() => setCriando(true)}>
          Nova recorrência
        </Button>
      )}

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
                O que sai
              </h2>
              <div className="space-y-3">
                {plano.gruposDespesa.map((g) => (
                  <Grupo key={`d-${g.categoria}`} grupo={g} />
                ))}
              </div>
            </section>
          ) : null}

          {plano.gruposReceita.length > 0 ? (
            <section>
              <h2 className="mb-3 text-base font-bold text-gray-900">
                O que entra
              </h2>
              <div className="space-y-3">
                {plano.gruposReceita.map((g) => (
                  <Grupo key={`r-${g.categoria}`} grupo={g} />
                ))}
              </div>
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
