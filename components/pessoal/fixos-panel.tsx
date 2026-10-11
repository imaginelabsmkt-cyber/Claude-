"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  atualizarFixoPessoalAction,
  criarFixoPessoalAction,
  excluirFixoPessoalAction,
  gerarFixosDoMesAction,
} from "@/lib/actions/pessoal";
import { paraCampo } from "@/lib/financeiro/valores";
import { rotuloMes } from "@/lib/financeiro/meses";
import { toast } from "@/lib/ui/toast";
import { cn, formatarMoeda } from "@/lib/utils";
import {
  FIXO_PESSOAL_PADRAO,
  fixoPessoalFormSchema,
  type FixoPessoalFormValues,
} from "@/lib/validation/pessoal";
import type { PersonalRecurrence } from "@/types";

interface FixosPanelProps {
  mes: string;
  fixos: PersonalRecurrence[];
  /** Quantos ainda não viraram lançamento neste mês. */
  pendentes: number;
}

/**
 * O plano fixo pessoal: aluguel, academia, assinaturas.
 *
 * Mesmo mecanismo do financeiro da empresa — cadastra uma vez, e o
 * botão cria os lançamentos do mês. Clicar duas vezes não duplica:
 * o banco tem `unique (recurrence_id, reference_month)`.
 *
 * Os gerados nascem EM ABERTO (não pago), porque um fixo do mês que
 * vem ainda não aconteceu.
 */
export function FixosPanel({ mes, fixos, pendentes }: FixosPanelProps) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | "novo" | null>(null);
  const [excluindo, setExcluindo] = useState<PersonalRecurrence | null>(null);
  const [processando, iniciar] = useTransition();

  function gerar() {
    iniciar(async () => {
      const r = await gerarFixosDoMesAction(mes);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível gerar.");
        return;
      }
      toast.sucesso(
        r.criados
          ? `${r.criados} lançamento(s) criado(s) em ${rotuloMes(mes)}.`
          : "Os fixos deste mês já estavam lançados.",
      );
      router.refresh();
    });
  }

  function excluir() {
    if (!excluindo) return;
    const alvo = excluindo;
    iniciar(async () => {
      const r = await excluirFixoPessoalAction(alvo.id);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível excluir.");
        return;
      }
      setExcluindo(null);
      toast.sucesso("Item do plano fixo excluído.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variante="secundaria"
          onClick={() => setEditando("novo")}
          disabled={processando}
        >
          Novo fixo
        </Button>
        {fixos.length > 0 ? (
          <Button variante="secundaria" onClick={gerar} disabled={processando}>
            {processando
              ? "Processando..."
              : `Lançar os fixos de ${rotuloMes(mes)}${pendentes ? ` (${pendentes})` : ""}`}
          </Button>
        ) : null}
      </div>

      {editando === "novo" ? (
        <FixoForm mes={mes} aoConcluir={() => setEditando(null)} />
      ) : null}

      {fixos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
          Nenhum fixo cadastrado. Aluguel, academia e assinaturas entram aqui
          uma vez e depois é um clique por mês.
        </p>
      ) : (
        <ul className="space-y-2">
          {fixos.map((f) =>
            editando === f.id ? (
              <li key={f.id}>
                <FixoForm mes={mes} fixo={f} aoConcluir={() => setEditando(null)} />
              </li>
            ) : (
              <li
                key={f.id}
                className={cn(
                  "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5",
                  f.active ? "" : "opacity-60",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-gray-900">
                      {f.description}
                    </span>
                    {f.kind === "Receita" ? (
                      <Badge tom="verde">Entrada</Badge>
                    ) : null}
                    {f.active ? null : <Badge tom="cinza">Pausado</Badge>}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {f.category}
                    {f.due_day ? ` · todo dia ${f.due_day}` : ""}
                    {f.end_month ? ` · até ${rotuloMes(f.end_month)}` : ""}
                  </span>
                </span>

                <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900">
                  {formatarMoeda(Number(f.amount))}
                </span>

                <span className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditando(f.id)}
                    className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setExcluindo(f)}
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
        titulo="Excluir do plano fixo?"
        descricao={
          excluindo
            ? `"${excluindo.description}" para de ser oferecido todo mês. Os lançamentos que já foram criados continuam onde estão.`
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

function FixoForm({
  mes,
  fixo,
  aoConcluir,
}: {
  mes: string;
  fixo?: PersonalRecurrence;
  aoConcluir: () => void;
}) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});

  const [valores, setValores] = useState<FixoPessoalFormValues>(
    fixo
      ? {
          kind: fixo.kind,
          category: fixo.category,
          description: fixo.description,
          amount: paraCampo(Number(fixo.amount)),
          due_day: fixo.due_day ? String(fixo.due_day) : "",
          start_month: fixo.start_month,
          end_month: fixo.end_month ?? "",
          active: fixo.active,
        }
      : { ...FIXO_PESSOAL_PADRAO, start_month: mes },
  );

  function campo<K extends keyof FixoPessoalFormValues>(
    chave: K,
    valor: FixoPessoalFormValues[K],
  ) {
    setValores((v) => ({ ...v, [chave]: valor }));
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setErros({});

    const parsed = fixoPessoalFormSchema.safeParse(valores);
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
      const r = fixo
        ? await atualizarFixoPessoalAction(fixo.id, parsed.data)
        : await criarFixoPessoalAction(parsed.data);

      if (!r.ok) {
        setErro(r.error ?? "Não foi possível salvar.");
        setErros(r.fieldErrors ?? {});
        return;
      }

      toast.sucesso(fixo ? "Fixo atualizado." : "Fixo cadastrado.");
      aoConcluir();
      router.refresh();
    });
  }

  const id = fixo?.id ?? "novo";

  return (
    <form onSubmit={enviar} className="rounded-xl border border-area bg-white p-3.5">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full sm:w-32">
          <Label htmlFor={`fkind-${id}`}>Tipo</Label>
          <Select
            id={`fkind-${id}`}
            value={valores.kind}
            onChange={(e) =>
              campo("kind", e.target.value as FixoPessoalFormValues["kind"])
            }
          >
            <option value="Despesa">Gasto</option>
            <option value="Receita">Entrada</option>
          </Select>
        </div>
        <div className="min-w-[8rem] flex-1">
          <Label htmlFor={`fcat-${id}`}>Categoria</Label>
          <Input
            id={`fcat-${id}`}
            value={valores.category}
            onChange={(e) => campo("category", e.target.value)}
            placeholder="Moradia"
          />
        </div>
        <div className="min-w-[10rem] flex-[2]">
          <Label htmlFor={`fdesc-${id}`}>Descrição</Label>
          <Input
            id={`fdesc-${id}`}
            value={valores.description}
            onChange={(e) => campo("description", e.target.value)}
            placeholder="Aluguel"
          />
        </div>
        <div className="w-full sm:w-32">
          <Label htmlFor={`fval-${id}`}>Valor</Label>
          <Input
            id={`fval-${id}`}
            inputMode="decimal"
            value={valores.amount}
            onChange={(e) => campo("amount", e.target.value)}
            placeholder="1.800,00"
          />
        </div>
        <div className="w-full sm:w-24">
          <Label htmlFor={`fdia-${id}`}>Dia</Label>
          <Input
            id={`fdia-${id}`}
            inputMode="numeric"
            value={valores.due_day ?? ""}
            onChange={(e) => campo("due_day", e.target.value)}
            placeholder="5"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-3">
        <div className="w-full sm:w-40">
          <Label htmlFor={`fini-${id}`}>Começa em</Label>
          <Input
            id={`fini-${id}`}
            type="month"
            value={valores.start_month}
            onChange={(e) => campo("start_month", e.target.value)}
          />
        </div>
        <div className="w-full sm:w-40">
          <Label htmlFor={`ffim-${id}`}>Termina em</Label>
          <Input
            id={`ffim-${id}`}
            type="month"
            value={valores.end_month ?? ""}
            onChange={(e) => campo("end_month", e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={valores.active}
            onChange={(e) => campo("active", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Ativo
        </label>

        <span className="ml-auto flex gap-2">
          <Button type="submit" disabled={processando}>
            {processando ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" variante="secundaria" onClick={aoConcluir}>
            Cancelar
          </Button>
        </span>
      </div>

      {erro ? (
        <Alert variante="erro" className="mt-3">
          {erro}
        </Alert>
      ) : null}
      {Object.entries(erros).length > 0 ? (
        <ul className="mt-2 space-y-0.5 text-xs text-alerta">
          {Object.entries(erros).map(([c, msg]) => (
            <li key={c}>{msg}</li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
