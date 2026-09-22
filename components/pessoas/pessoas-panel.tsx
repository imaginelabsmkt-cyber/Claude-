"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  atualizarPessoaAction,
  criarPessoaAction,
  definirAtivaPessoaAction,
} from "@/lib/actions/pessoas";
import { paraCampo } from "@/lib/financeiro/valores";
import { toast } from "@/lib/ui/toast";
import { cn, formatarMoeda } from "@/lib/utils";
import {
  PESSOA_FORM_PADRAO,
  pessoaFormSchema,
  type PessoaFormValues,
} from "@/lib/validation/pessoas";
import { TEAM_KIND_OPTIONS, TEAM_KIND_TONE } from "@/types";
import type { PessoaComCusto } from "@/lib/data/pessoas";

/**
 * Quem trabalha na agência e quanto custa.
 *
 * O valor de cada um vem do financeiro — aqui só se diz quem é quem.
 * Ninguém é excluído: desativar preserva o histórico de pagamentos.
 */
export function PessoasPanel({ pessoas }: { pessoas: PessoaComCusto[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | "nova" | null>(null);
  const [processando, iniciar] = useTransition();

  function alternar(p: PessoaComCusto) {
    iniciar(async () => {
      const r = await definirAtivaPessoaAction(p.id, !p.active);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível atualizar.");
        return;
      }
      toast.sucesso(p.active ? `${p.name} foi desativada.` : `${p.name} reativada.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {pessoas.map((p) =>
        editando === p.id ? (
          <PessoaForm key={p.id} pessoa={p} aoConcluir={() => setEditando(null)} />
        ) : (
          <div
            key={p.id}
            className={cn(
              "rounded-xl border border-gray-200 bg-white p-3.5",
              p.active ? "" : "opacity-60",
            )}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{p.name}</span>
                <Badge tom={TEAM_KIND_TONE[p.kind]}>{p.kind}</Badge>
                {p.active ? null : <Badge tom="cinza">Inativa</Badge>}
              </span>

              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold tabular-nums text-gray-900">
                  {formatarMoeda(p.noMes)}
                </span>
                <span className="block text-[11px] text-gray-500">pago no mês</span>
              </span>

              {p.emAberto > 0 ? (
                <span className="w-24 shrink-0 text-right text-xs font-semibold text-alerta">
                  {formatarMoeda(p.emAberto)} em aberto
                </span>
              ) : null}
            </div>

            <p className="mt-1 text-xs text-gray-500">
              {p.role ? `${p.role} · ` : ""}
              {p.default_rate
                ? `${formatarMoeda(p.default_rate)} de referência · `
                : ""}
              {formatarMoeda(p.noAno)} no ano
              {p.contact ? ` · ${p.contact}` : ""}
            </p>

            {p.lancamentos.length > 0 ? (
              <ul className="mt-2.5 space-y-1 border-t border-gray-100 pt-2.5">
                {p.lancamentos.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="min-w-0 truncate text-gray-600">
                      {l.description}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="tabular-nums text-gray-700">
                        {formatarMoeda(Number(l.amount))}
                      </span>
                      <span
                        className={
                          l.status === "Pago" ? "text-gray-400" : "text-alerta"
                        }
                      >
                        {l.status === "Pago" ? "pago" : "em aberto"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-3 flex gap-2">
              <Button
                tamanho="sm"
                variante="secundaria"
                onClick={() => setEditando(p.id)}
              >
                Editar
              </Button>
              <Button
                tamanho="sm"
                variante="fantasma"
                onClick={() => alternar(p)}
                disabled={processando}
              >
                {p.active ? "Desativar" : "Reativar"}
              </Button>
            </div>
          </div>
        ),
      )}

      {editando === "nova" ? (
        <PessoaForm aoConcluir={() => setEditando(null)} />
      ) : (
        <Button variante="secundaria" onClick={() => setEditando("nova")}>
          Cadastrar pessoa
        </Button>
      )}

      {pessoas.length === 0 && editando !== "nova" ? (
        <p className="text-sm text-gray-500">
          Ninguém cadastrado ainda. Cadastre as sócias e os freelancers para que os
          pagamentos do financeiro tenham dono.
        </p>
      ) : null}
    </div>
  );
}

/** Formulário de pessoa. */
function PessoaForm({
  pessoa,
  aoConcluir,
}: {
  pessoa?: PessoaComCusto;
  aoConcluir: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<PessoaFormValues>(
    pessoa
      ? {
          name: pessoa.name,
          kind: pessoa.kind,
          role: pessoa.role ?? "",
          default_rate: pessoa.default_rate ? paraCampo(pessoa.default_rate) : "",
          contact: pessoa.contact ?? "",
          payment_info: pessoa.payment_info ?? "",
          notes: pessoa.notes ?? "",
          active: pessoa.active,
        }
      : PESSOA_FORM_PADRAO,
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function set<K extends keyof PessoaFormValues>(c: K, v: PessoaFormValues[K]) {
    setValues((atual) => ({ ...atual, [c]: v }));
  }

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem(null);

    const parsed = pessoaFormSchema.safeParse(values);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const novos: Record<string, string> = {};
      for (const [c, m] of Object.entries(fe)) if (m?.length) novos[c] = m[0];
      setErros(novos);
      return;
    }
    setErros({});

    iniciar(async () => {
      const r = pessoa
        ? await atualizarPessoaAction(pessoa.id, parsed.data)
        : await criarPessoaAction(parsed.data);

      if (!r.ok) {
        setErros(r.fieldErrors ?? {});
        setMensagem(r.error ?? "Não foi possível salvar.");
        return;
      }
      aoConcluir();
      router.refresh();
    });
  }

  const erro = (c: string) =>
    erros[c] ? <p className="mt-1 text-xs text-alerta">{erros[c]}</p> : null;

  return (
    <form
      onSubmit={aoEnviar}
      className="space-y-4 rounded-xl border border-area bg-white p-4"
      noValidate
    >
      {mensagem ? <Alert variante="erro">{mensagem}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="pe-name">Nome *</Label>
          <Input
            id="pe-name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            aria-invalid={Boolean(erros.name)}
          />
          {erro("name")}
        </div>
        <div>
          <Label htmlFor="pe-kind">Vínculo *</Label>
          <Select
            id="pe-kind"
            value={values.kind}
            onChange={(e) => set("kind", e.target.value as PessoaFormValues["kind"])}
          >
            {TEAM_KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="pe-role">O que faz</Label>
          <Input
            id="pe-role"
            value={values.role ?? ""}
            onChange={(e) => set("role", e.target.value)}
            placeholder="Edição, design, tráfego..."
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="pe-rate">
            {values.kind === "Sócia" ? "Pró-labore (R$)" : "Diária ou cachê (R$)"}
          </Label>
          <Input
            id="pe-rate"
            inputMode="decimal"
            value={values.default_rate ?? ""}
            onChange={(e) => set("default_rate", e.target.value)}
            placeholder="6.500,00"
            aria-invalid={Boolean(erros.default_rate)}
          />
          {erro("default_rate") ?? (
            <p className="mt-1 text-xs text-gray-500">Só referência; o valor real vem do lançamento.</p>
          )}
        </div>
        <div>
          <Label htmlFor="pe-contact">Contato</Label>
          <Input
            id="pe-contact"
            value={values.contact ?? ""}
            onChange={(e) => set("contact", e.target.value)}
            placeholder="WhatsApp ou e-mail"
          />
        </div>
        <div>
          <Label htmlFor="pe-pay">Chave PIX</Label>
          <Input
            id="pe-pay"
            value={values.payment_info ?? ""}
            onChange={(e) => set("payment_info", e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="pe-notes">Observações</Label>
        <Textarea
          id="pe-notes"
          rows={2}
          value={values.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={values.active}
          onChange={(e) => set("active", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        Ativa
      </label>

      <div className="flex gap-2">
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : pessoa ? "Salvar" : "Cadastrar"}
        </Button>
        <Button type="button" variante="secundaria" onClick={aoConcluir} disabled={salvando}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
