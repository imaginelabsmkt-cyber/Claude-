"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  atualizarRecorrenciaAction,
  criarRecorrenciaAction,
} from "@/lib/actions/financeiro";
import { paraCampo } from "@/lib/financeiro/valores";
import {
  recorrenciaFormSchema,
  recorrenciaPadrao,
  type RecorrenciaFormValues,
} from "@/lib/validation/financeiro";
import type { Client, FinancialCategory, FinancialRecurrence } from "@/types";

interface RecurrenceFormProps {
  mes: string;
  categorias: FinancialCategory[];
  clientes: Pick<Client, "id" | "name" | "active">[];
  recorrencia?: FinancialRecurrence;
  /** Chamado ao concluir (fecha o formulário na tela de recorrências). */
  aoConcluir?: () => void;
}

/**
 * Formulário de recorrência: a "regra" de uma mensalidade ou custo fixo.
 * Cadastrar uma vez aqui evita redigitar o mesmo lançamento todo mês.
 */
export function RecurrenceForm({
  mes,
  categorias,
  clientes,
  recorrencia,
  aoConcluir,
}: RecurrenceFormProps) {
  const router = useRouter();
  const edicao = Boolean(recorrencia);

  const [values, setValues] = useState<RecorrenciaFormValues>(
    recorrencia
      ? {
          description: recorrencia.description,
          kind: recorrencia.kind,
          category_id: recorrencia.category_id,
          client_id: recorrencia.client_id ?? "",
          amount: paraCampo(Number(recorrencia.amount)),
          due_day: recorrencia.due_day ? String(recorrencia.due_day) : "",
          start_month: recorrencia.start_month,
          end_month: recorrencia.end_month ?? "",
          active: recorrencia.active,
          notes: recorrencia.notes ?? "",
        }
      : recorrenciaPadrao(mes),
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [salvando, iniciarSalvamento] = useTransition();

  const categoriasDoTipo = useMemo(
    () => categorias.filter((c) => c.kind === values.kind && c.active),
    [categorias, values.kind],
  );

  function atualizar<K extends keyof RecorrenciaFormValues>(
    campo: K,
    valor: RecorrenciaFormValues[K],
  ) {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensagem(null);

    const parsed = recorrenciaFormSchema.safeParse(values);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const novos: Record<string, string> = {};
      for (const [campo, msgs] of Object.entries(fe)) {
        if (msgs && msgs.length) novos[campo] = msgs[0];
      }
      setErros(novos);
      return;
    }
    setErros({});

    iniciarSalvamento(async () => {
      const r = edicao
        ? await atualizarRecorrenciaAction(recorrencia!.id, parsed.data)
        : await criarRecorrenciaAction(parsed.data);

      if (!r.ok) {
        setErros(r.fieldErrors ?? {});
        setMensagem(r.error ?? "Não foi possível salvar.");
        return;
      }

      if (!edicao) setValues(recorrenciaPadrao(mes));
      aoConcluir?.();
      router.refresh();
    });
  }

  const erro = (campo: string) =>
    erros[campo] ? <p className="mt-1 text-xs text-red-600">{erros[campo]}</p> : null;

  return (
    <form onSubmit={aoEnviar} className="space-y-4" noValidate>
      {mensagem ? <Alert variante="erro">{mensagem}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="r-description">Descrição *</Label>
          <Input
            id="r-description"
            value={values.description}
            onChange={(e) => atualizar("description", e.target.value)}
            placeholder="Ex.: Mensalidade Kiku Sushi"
            aria-invalid={Boolean(erros.description)}
          />
          {erro("description")}
        </div>

        <div>
          <Label htmlFor="r-kind">Tipo *</Label>
          <Select
            id="r-kind"
            value={values.kind}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                kind: e.target.value as RecorrenciaFormValues["kind"],
                category_id: "",
              }))
            }
          >
            <option value="Receita">Receita (entrada)</option>
            <option value="Despesa">Despesa (saída)</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="r-category">Categoria *</Label>
          <Select
            id="r-category"
            value={values.category_id}
            onChange={(e) => atualizar("category_id", e.target.value)}
            aria-invalid={Boolean(erros.category_id)}
          >
            <option value="">Selecione...</option>
            {categoriasDoTipo.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {erro("category_id")}
        </div>

        <div>
          <Label htmlFor="r-amount">Valor mensal (R$) *</Label>
          <Input
            id="r-amount"
            inputMode="decimal"
            value={values.amount}
            onChange={(e) => atualizar("amount", e.target.value)}
            placeholder="1.700,00"
            aria-invalid={Boolean(erros.amount)}
          />
          {erro("amount")}
        </div>

        <div>
          <Label htmlFor="r-due-day">Dia do vencimento</Label>
          <Input
            id="r-due-day"
            inputMode="numeric"
            value={values.due_day ?? ""}
            onChange={(e) => atualizar("due_day", e.target.value)}
            placeholder="10"
            aria-invalid={Boolean(erros.due_day)}
          />
          {erro("due_day")}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="r-client">Cliente</Label>
          <Select
            id="r-client"
            value={values.client_id ?? ""}
            onChange={(e) => atualizar("client_id", e.target.value)}
          >
            <option value="">— sem cliente —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.active ? "" : " (inativo)"}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="r-start">Começa em *</Label>
          <Input
            id="r-start"
            type="month"
            value={values.start_month}
            onChange={(e) => atualizar("start_month", e.target.value)}
            aria-invalid={Boolean(erros.start_month)}
          />
          {erro("start_month")}
        </div>

        <div>
          <Label htmlFor="r-end">Termina em</Label>
          <Input
            id="r-end"
            type="month"
            value={values.end_month ?? ""}
            onChange={(e) => atualizar("end_month", e.target.value)}
            aria-invalid={Boolean(erros.end_month)}
          />
          {erro("end_month") ?? (
            <p className="mt-1 text-xs text-gray-500">Vazio = sem data para acabar.</p>
          )}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={values.active}
          onChange={(e) => atualizar("active", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        Ativa (entra na geração dos lançamentos do mês)
      </label>

      <div className="flex gap-3">
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : edicao ? "Salvar alterações" : "Adicionar recorrência"}
        </Button>
        {aoConcluir ? (
          <Button
            type="button"
            variante="secundaria"
            onClick={aoConcluir}
            disabled={salvando}
          >
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
