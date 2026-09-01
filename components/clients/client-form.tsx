"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import {
  criarClienteAction,
  atualizarClienteAction,
} from "@/lib/actions/clients";
import {
  clienteFormSchema,
  CLIENTE_FORM_PADRAO,
  type ClienteFormValues,
} from "@/lib/validation/client";
import type { Client } from "@/types";

interface ClientFormProps {
  /** Quando informado, o formulário está em modo de edição. */
  cliente?: Client;
}

/**
 * Formulário reutilizável de cliente (criação e edição).
 * Validação com Zod (cliente + servidor), estados de loading e mensagens
 * de sucesso/erro. No modo edição, o status (ativo) é gerido na página do
 * cliente com confirmação — por isso não aparece aqui.
 */
export function ClientForm({ cliente }: ClientFormProps) {
  const router = useRouter();
  const edicao = Boolean(cliente);

  const [values, setValues] = useState<ClienteFormValues>(
    cliente
      ? {
          name: cliente.name,
          color: cliente.color ?? "",
          niche: cliente.niche ?? "",
          monthly_goal:
            cliente.monthly_goal != null ? String(cliente.monthly_goal) : "",
          notes: cliente.notes ?? "",
          active: cliente.active,
        }
      : CLIENTE_FORM_PADRAO,
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<
    { tipo: "sucesso" | "erro"; texto: string } | null
  >(null);
  const [salvando, iniciarSalvamento] = useTransition();

  function atualizar<K extends keyof ClienteFormValues>(
    campo: K,
    valor: ClienteFormValues[K],
  ) {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensagem(null);

    // Validação no cliente (feedback imediato).
    const parsed = clienteFormSchema.safeParse(values);
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
      const resultado = edicao
        ? await atualizarClienteAction(cliente!.id, parsed.data)
        : await criarClienteAction(parsed.data);

      if (!resultado.ok) {
        setErros(resultado.fieldErrors ?? {});
        setMensagem({
          tipo: "erro",
          texto: resultado.error ?? "Não foi possível salvar.",
        });
        return;
      }

      if (edicao) {
        setMensagem({ tipo: "sucesso", texto: "Cliente atualizado com sucesso." });
        router.refresh();
      } else {
        router.push(`/clientes/${resultado.id}`);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={aoEnviar} className="max-w-2xl space-y-5" noValidate>
      {mensagem ? (
        <Alert variante={mensagem.tipo === "sucesso" ? "sucesso" : "erro"}>
          {mensagem.texto}
        </Alert>
      ) : null}

      <div>
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          value={values.name}
          onChange={(e) => atualizar("name", e.target.value)}
          placeholder="Nome do cliente"
          aria-invalid={Boolean(erros.name)}
        />
        {erros.name ? (
          <p className="mt-1 text-xs text-red-600">{erros.name}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="color">Cor</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Selecionar cor"
              value={/^#([0-9a-fA-F]{6})$/.test(values.color ?? "") ? values.color : "#6a2336"}
              onChange={(e) => atualizar("color", e.target.value)}
              className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-gray-300"
            />
            <Input
              id="color"
              value={values.color ?? ""}
              onChange={(e) => atualizar("color", e.target.value)}
              placeholder="#6a2336"
              aria-invalid={Boolean(erros.color)}
            />
          </div>
          {erros.color ? (
            <p className="mt-1 text-xs text-red-600">{erros.color}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="niche">Nicho</Label>
          <Input
            id="niche"
            value={values.niche ?? ""}
            onChange={(e) => atualizar("niche", e.target.value)}
            placeholder="Ex.: Dentista, Advogado, Loja de cookies"
            aria-invalid={Boolean(erros.niche)}
          />
          {erros.niche ? (
            <p className="mt-1 text-xs text-red-600">{erros.niche}</p>
          ) : null}
        </div>
      </div>

      <div className="sm:w-64">
        <Label htmlFor="monthly_goal">Meta de conteúdos por mês</Label>
        <Input
          id="monthly_goal"
          type="number"
          min={0}
          value={values.monthly_goal ?? ""}
          onChange={(e) => atualizar("monthly_goal", e.target.value)}
          placeholder="Ex.: 12 (opcional)"
          aria-invalid={Boolean(erros.monthly_goal)}
        />
        <p className="mt-1 text-xs text-gray-500">
          Combo contratado no mês. Deixe em branco se não houver número fixo.
        </p>
        {erros.monthly_goal ? (
          <p className="mt-1 text-xs text-red-600">{erros.monthly_goal}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          rows={4}
          value={values.notes ?? ""}
          onChange={(e) => atualizar("notes", e.target.value)}
          placeholder="Anotações internas sobre o cliente"
          aria-invalid={Boolean(erros.notes)}
        />
        {erros.notes ? (
          <p className="mt-1 text-xs text-red-600">{erros.notes}</p>
        ) : null}
      </div>

      {!edicao ? (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={values.active}
            onChange={(e) => atualizar("active", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          Cliente ativo
        </label>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : edicao ? "Salvar alterações" : "Criar cliente"}
        </Button>
        <Button
          type="button"
          variante="secundaria"
          onClick={() => router.back()}
          disabled={salvando}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
