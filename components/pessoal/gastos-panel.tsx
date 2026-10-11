"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  alternarPagoPessoalAction,
  atualizarGastoPessoalAction,
  criarGastoPessoalAction,
  excluirGastoPessoalAction,
} from "@/lib/actions/pessoal";
import { paraCampo } from "@/lib/financeiro/valores";
import { CATEGORIAS_PESSOAIS } from "@/lib/pessoal/calculo";
import { toast } from "@/lib/ui/toast";
import { cn, formatarData, formatarMoeda } from "@/lib/utils";
import {
  GASTO_PESSOAL_PADRAO,
  gastoPessoalFormSchema,
  type GastoPessoalFormValues,
} from "@/lib/validation/pessoal";
import type { PersonalEntry } from "@/types";

interface GastosPanelProps {
  mes: string;
  lancamentos: PersonalEntry[];
  /** Categorias que esta pessoa já usou, para o autocompletar. */
  categoriasUsadas: string[];
}

/**
 * Os lançamentos do mês.
 *
 * O formulário de lançar fica SEMPRE aberto no topo, em uma linha. É a
 * ação que mais se repete — gasto pessoal se anota na hora, de pé na
 * fila do mercado — e abrir modal para isso mata o hábito. Os campos
 * menos usados (data, anotação, "ainda não paguei") ficam atrás de
 * "mais opções".
 */
export function GastosPanel({ mes, lancamentos, categoriasUsadas }: GastosPanelProps) {
  const [editando, setEditando] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<PersonalEntry | null>(null);
  const router = useRouter();
  const [processando, iniciar] = useTransition();

  const sugestoes = [
    ...new Set([...categoriasUsadas, ...CATEGORIAS_PESSOAIS]),
  ];

  function alternarPago(l: PersonalEntry) {
    iniciar(async () => {
      const r = await alternarPagoPessoalAction(l.id, !l.paid);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível atualizar.");
        return;
      }
      router.refresh();
    });
  }

  function excluir() {
    if (!excluindo) return;
    const alvo = excluindo;
    iniciar(async () => {
      const r = await excluirGastoPessoalAction(alvo.id);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível excluir.");
        return;
      }
      setExcluindo(null);
      toast.sucesso("Lançamento excluído.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <GastoForm mes={mes} sugestoes={sugestoes} />

      {lancamentos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <p className="font-medium text-gray-900">Nada lançado neste mês</p>
          <p className="mt-1 text-sm text-gray-500">
            Anote o primeiro gasto acima — leva cinco segundos.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {lancamentos.map((l) =>
            editando === l.id ? (
              <li key={l.id} className="p-3.5">
                <GastoForm
                  mes={mes}
                  sugestoes={sugestoes}
                  lancamento={l}
                  aoConcluir={() => setEditando(null)}
                />
              </li>
            ) : (
              <li
                key={l.id}
                className={cn(
                  "flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5",
                  l.kind === "Receita" ? "border-l-4 border-green-600" : "border-l-4 border-area",
                )}
              >
                <button
                  type="button"
                  onClick={() => alternarPago(l)}
                  disabled={processando}
                  aria-label={l.paid ? "Marcar como não pago" : "Marcar como pago"}
                  title={l.paid ? "Pago — clique para desmarcar" : "Em aberto — clique para marcar"}
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded border text-[11px] font-bold transition-colors",
                    l.paid
                      ? "border-gray-300 bg-gray-100 text-gray-500 hover:bg-gray-200"
                      : "border-alerta bg-alerta-soft text-alerta hover:brightness-95",
                  )}
                >
                  {l.paid ? "✓" : "!"}
                </button>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">
                    {l.description}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {l.category}
                    {l.entry_date ? ` · ${formatarData(l.entry_date)}` : ""}
                    {l.recurrence_id ? " · do plano fixo" : ""}
                    {l.paid ? "" : " · ainda não pago"}
                  </span>
                </span>

                <span
                  className={cn(
                    "w-28 shrink-0 text-right text-sm font-semibold tabular-nums",
                    l.kind === "Receita" ? "text-green-700" : "text-gray-900",
                  )}
                >
                  {l.kind === "Receita" ? "+" : "−"} {formatarMoeda(Number(l.amount))}
                </span>

                <span className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditando(l.id)}
                    className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setExcluindo(l)}
                    className="rounded px-2 py-1 text-xs font-medium text-gray-400 hover:bg-alerta-soft hover:text-alerta"
                  >
                    Excluir
                  </button>
                </span>
              </li>
            ),
          )}
        </ul>
      )}

      <ConfirmDialog
        aberto={excluindo !== null}
        titulo="Excluir este lançamento?"
        descricao={
          excluindo
            ? `"${excluindo.description}" — ${formatarMoeda(Number(excluindo.amount))}. Isso não tem volta.`
            : ""
        }
        textoConfirmar="Excluir"
        varianteConfirmar="perigo"
        carregando={processando}
        aoConfirmar={excluir}
        aoCancelar={() => setExcluindo(null)}
      />
    </div>
  );
}

interface GastoFormProps {
  mes: string;
  sugestoes: string[];
  lancamento?: PersonalEntry;
  aoConcluir?: () => void;
}

function GastoForm({ mes, sugestoes, lancamento, aoConcluir }: GastoFormProps) {
  const editando = Boolean(lancamento);
  const router = useRouter();
  const [processando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [abrirMais, setAbrirMais] = useState(editando);

  const [valores, setValores] = useState<GastoPessoalFormValues>(
    lancamento
      ? {
          reference_month: lancamento.reference_month,
          kind: lancamento.kind,
          category: lancamento.category,
          description: lancamento.description,
          amount: paraCampo(Number(lancamento.amount)),
          entry_date: lancamento.entry_date ?? "",
          paid: lancamento.paid,
          notes: lancamento.notes ?? "",
        }
      : { ...GASTO_PESSOAL_PADRAO, reference_month: mes },
  );

  function campo<K extends keyof GastoPessoalFormValues>(
    chave: K,
    valor: GastoPessoalFormValues[K],
  ) {
    setValores((v) => ({ ...v, [chave]: valor }));
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setErros({});

    const parsed = gastoPessoalFormSchema.safeParse(valores);
    if (!parsed.success) {
      const campos: Record<string, string> = {};
      for (const [k, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (msgs && msgs.length) campos[k] = msgs[0];
      }
      setErros(campos);
      setErro("Verifique os campos destacados.");
      return;
    }

    iniciar(async () => {
      const r = lancamento
        ? await atualizarGastoPessoalAction(lancamento.id, parsed.data)
        : await criarGastoPessoalAction(parsed.data);

      if (!r.ok) {
        setErro(r.error ?? "Não foi possível salvar.");
        setErros(r.fieldErrors ?? {});
        return;
      }

      toast.sucesso(editando ? "Lançamento atualizado." : "Lançado.");
      if (aoConcluir) aoConcluir();
      else
        setValores({
          ...GASTO_PESSOAL_PADRAO,
          reference_month: mes,
          // Mantém o tipo escolhido: quem está lançando receita
          // provavelmente vai lançar outra.
          kind: valores.kind,
        });
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={enviar}
      className={cn(
        "rounded-xl border bg-white p-3.5",
        editando ? "border-area" : "border-gray-200",
      )}
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full sm:w-32">
          <Label htmlFor={`kind-${lancamento?.id ?? "novo"}`}>Tipo</Label>
          <Select
            id={`kind-${lancamento?.id ?? "novo"}`}
            value={valores.kind}
            onChange={(e) =>
              campo("kind", e.target.value as GastoPessoalFormValues["kind"])
            }
          >
            <option value="Despesa">Gasto</option>
            <option value="Receita">Entrada</option>
          </Select>
        </div>

        <div className="min-w-[8rem] flex-1">
          <Label htmlFor={`cat-${lancamento?.id ?? "novo"}`}>Categoria</Label>
          <Input
            id={`cat-${lancamento?.id ?? "novo"}`}
            list={`cats-${lancamento?.id ?? "novo"}`}
            value={valores.category}
            onChange={(e) => campo("category", e.target.value)}
            placeholder="Mercado"
            aria-invalid={Boolean(erros.category)}
          />
          <datalist id={`cats-${lancamento?.id ?? "novo"}`}>
            {sugestoes.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="min-w-[10rem] flex-[2]">
          <Label htmlFor={`desc-${lancamento?.id ?? "novo"}`}>Descrição</Label>
          <Input
            id={`desc-${lancamento?.id ?? "novo"}`}
            value={valores.description}
            onChange={(e) => campo("description", e.target.value)}
            placeholder="Compra da semana"
            aria-invalid={Boolean(erros.description)}
          />
        </div>

        <div className="w-full sm:w-32">
          <Label htmlFor={`val-${lancamento?.id ?? "novo"}`}>Valor</Label>
          <Input
            id={`val-${lancamento?.id ?? "novo"}`}
            inputMode="decimal"
            value={valores.amount}
            onChange={(e) => campo("amount", e.target.value)}
            placeholder="120,50"
            aria-invalid={Boolean(erros.amount)}
          />
        </div>

        <Button type="submit" disabled={processando}>
          {processando ? "Salvando..." : editando ? "Salvar" : "Lançar"}
        </Button>

        {editando ? (
          <Button type="button" variante="secundaria" onClick={aoConcluir}>
            Cancelar
          </Button>
        ) : null}
      </div>

      {abrirMais ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
          <div className="w-full sm:w-40">
            <Label htmlFor={`data-${lancamento?.id ?? "novo"}`}>Dia</Label>
            <Input
              id={`data-${lancamento?.id ?? "novo"}`}
              type="date"
              value={valores.entry_date ?? ""}
              onChange={(e) => campo("entry_date", e.target.value)}
            />
          </div>

          <div className="min-w-[12rem] flex-1">
            <Label htmlFor={`obs-${lancamento?.id ?? "novo"}`}>Anotação</Label>
            <Input
              id={`obs-${lancamento?.id ?? "novo"}`}
              value={valores.notes ?? ""}
              onChange={(e) => campo("notes", e.target.value)}
              placeholder="opcional"
            />
          </div>

          <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={!valores.paid}
              onChange={(e) => campo("paid", !e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Ainda não paguei
          </label>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAbrirMais(true)}
          className="mt-2 text-xs font-medium text-gray-500 hover:text-gray-800 hover:underline"
        >
          mais opções (dia, anotação, ainda não paguei)
        </button>
      )}

      {erro ? (
        <Alert variante="erro" className="mt-3">
          {erro}
        </Alert>
      ) : null}

      {Object.entries(erros).length > 0 ? (
        <ul className="mt-2 space-y-0.5 text-xs text-alerta">
          {Object.entries(erros).map(([campo, msg]) => (
            <li key={campo}>{msg}</li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
