"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  criarInvestimentoAction,
  excluirInvestimentoAction,
} from "@/lib/actions/comercial";
import { rotuloMes } from "@/lib/financeiro/meses";
import { toast } from "@/lib/ui/toast";
import { formatarMoeda } from "@/lib/utils";
import {
  investimentoFormSchema,
  type InvestimentoFormValues,
} from "@/lib/validation/comercial";
import { LEAD_CHANNEL_OPTIONS } from "@/types";
import type { Investment } from "@/types";

/**
 * O que foi gasto em cada canal, por mês.
 *
 * Sem isto o Painel de canais não consegue dizer qual canal compensa:
 * ele sabe quantos fecharam, e não quanto custou. É tráfego, ingresso
 * e viagem de evento, comissão de parceiro, bônus de indicação.
 */
export function InvestimentosPanel({
  investimentos,
  mes,
}: {
  investimentos: Investment[];
  /** Mês em foco, para o campo já abrir no lugar certo. */
  mes: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<InvestimentoFormValues>({
    mes,
    channel: "Tráfego pago",
    amount: "",
    notes: "",
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [excluindo, setExcluindo] = useState<Investment | null>(null);
  const [processando, iniciar] = useTransition();

  function lancar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = investimentoFormSchema.safeParse(values);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const novos: Record<string, string> = {};
      for (const [c, m] of Object.entries(fe)) if (m?.length) novos[c] = m[0];
      setErros(novos);
      return;
    }
    setErros({});

    iniciar(async () => {
      const r = await criarInvestimentoAction(parsed.data);
      if (!r.ok) {
        setErros(r.fieldErrors ?? {});
        toast.erro(r.error ?? "Não foi possível lançar.");
        return;
      }
      setValues((v) => ({ ...v, amount: "", notes: "" }));
      router.refresh();
    });
  }

  function confirmarExclusao() {
    if (!excluindo) return;
    const id = excluindo.id;
    iniciar(async () => {
      const r = await excluirInvestimentoAction(id);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível excluir.");
        return;
      }
      setExcluindo(null);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <form onSubmit={lancar} className="grid gap-3 sm:grid-cols-4" noValidate>
        <div>
          <Label htmlFor="i-mes">Mês</Label>
          <Input
            id="i-mes"
            type="month"
            value={values.mes}
            onChange={(e) => setValues((v) => ({ ...v, mes: e.target.value }))}
            aria-invalid={Boolean(erros.mes)}
          />
          {erros.mes ? (
            <p className="mt-1 text-xs text-alerta">{erros.mes}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="i-canal">Canal</Label>
          <Select
            id="i-canal"
            value={values.channel}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                channel: e.target.value as InvestimentoFormValues["channel"],
              }))
            }
          >
            {LEAD_CHANNEL_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="i-valor">Valor (R$)</Label>
          <Input
            id="i-valor"
            inputMode="decimal"
            value={values.amount}
            onChange={(e) =>
              setValues((v) => ({ ...v, amount: e.target.value }))
            }
            placeholder="500,00"
            aria-invalid={Boolean(erros.amount)}
          />
          {erros.amount ? (
            <p className="mt-1 text-xs text-alerta">{erros.amount}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="i-nota">Descrição</Label>
          <Input
            id="i-nota"
            value={values.notes ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
            placeholder="Ex.: Meta Ads novembro"
          />
        </div>

        <div className="sm:col-span-4">
          <Button type="submit" disabled={processando}>
            {processando ? "Lançando..." : "Lançar"}
          </Button>
        </div>
      </form>

      {investimentos.length > 0 ? (
        <ul className="mt-4 divide-y divide-gray-100 border-t border-gray-200">
          {investimentos.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2.5"
            >
              <span className="min-w-0 flex-1">
                <span className="text-sm font-medium text-gray-900">
                  {i.channel}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  {rotuloMes(i.mes)}
                  {i.notes ? ` · ${i.notes}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                {formatarMoeda(Number(i.amount))}
              </span>
              <button
                type="button"
                onClick={() => setExcluindo(i)}
                disabled={processando}
                className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-gray-500 hover:bg-alerta-soft hover:text-alerta disabled:opacity-50"
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <ConfirmDialog
        aberto={Boolean(excluindo)}
        titulo="Excluir lançamento?"
        descricao={
          excluindo
            ? `${excluindo.channel}, ${formatarMoeda(Number(excluindo.amount))} em ${rotuloMes(excluindo.mes)}.`
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
