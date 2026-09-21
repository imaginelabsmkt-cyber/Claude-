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
  atualizarPropostaAction,
  criarPropostaAction,
  excluirPropostaAction,
} from "@/lib/actions/comercial";
import { propostaVencida } from "@/lib/comercial/funil";
import { paraCampo } from "@/lib/financeiro/valores";
import { toast } from "@/lib/ui/toast";
import { formatarData, formatarMoeda } from "@/lib/utils";
import {
  PROPOSTA_FORM_PADRAO,
  propostaFormSchema,
  type PropostaFormValues,
} from "@/lib/validation/comercial";
import { PROPOSAL_STATUS_OPTIONS, PROPOSAL_STATUS_TONE } from "@/types";
import type { Proposal } from "@/types";

/** Propostas de uma oportunidade: criar, editar e acompanhar a validade. */
export function PropostasPanel({
  leadId,
  propostas,
}: {
  leadId: string;
  propostas: Proposal[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | "nova" | null>(null);
  const [processando, iniciar] = useTransition();

  const lista = [...propostas].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );

  function excluir(id: string) {
    iniciar(async () => {
      const r = await excluirPropostaAction(id);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível excluir.");
        return;
      }
      toast.sucesso("Proposta excluída.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {lista.map((p) =>
        editando === p.id ? (
          <PropostaForm
            key={p.id}
            leadId={leadId}
            proposta={p}
            aoConcluir={() => setEditando(null)}
          />
        ) : (
          <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold tabular-nums text-gray-900">
                {formatarMoeda(Number(p.monthly_amount))}
                <span className="ml-1 text-xs font-normal text-gray-400">/mês</span>
              </span>
              {Number(p.setup_amount) > 0 ? (
                <span className="text-xs text-gray-500">
                  + {formatarMoeda(Number(p.setup_amount))} de entrada
                </span>
              ) : null}
              <Badge tom={PROPOSAL_STATUS_TONE[p.status]}>{p.status}</Badge>
              {propostaVencida(p) ? (
                <span className="text-xs font-semibold text-alerta">
                  passou da validade
                </span>
              ) : null}
            </div>

            <p className="mt-1 text-xs text-gray-500">
              {p.monthly_goal ? `${p.monthly_goal} conteúdos/mês · ` : ""}
              {p.sent_at ? `enviada ${formatarData(p.sent_at)}` : "ainda não enviada"}
              {p.valid_until ? ` · vale até ${formatarData(p.valid_until)}` : ""}
            </p>

            {p.scope ? (
              <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{p.scope}</p>
            ) : null}

            <div className="mt-3 flex gap-2">
              <Button tamanho="sm" variante="secundaria" onClick={() => setEditando(p.id)}>
                Editar
              </Button>
              <Button
                tamanho="sm"
                variante="fantasma"
                onClick={() => excluir(p.id)}
                disabled={processando}
              >
                Excluir
              </Button>
            </div>
          </div>
        ),
      )}

      {editando === "nova" ? (
        <PropostaForm leadId={leadId} aoConcluir={() => setEditando(null)} />
      ) : (
        <Button variante="secundaria" onClick={() => setEditando("nova")}>
          Nova proposta
        </Button>
      )}

      {lista.length === 0 && editando !== "nova" ? (
        <p className="text-sm text-gray-500">
          Nenhuma proposta ainda. O valor da proposta é o que vira a mensalidade
          quando o negócio é ganho.
        </p>
      ) : null}
    </div>
  );
}

/** Formulário de proposta. */
function PropostaForm({
  leadId,
  proposta,
  aoConcluir,
}: {
  leadId: string;
  proposta?: Proposal;
  aoConcluir: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<PropostaFormValues>(
    proposta
      ? {
          monthly_amount: paraCampo(Number(proposta.monthly_amount)),
          setup_amount: proposta.setup_amount
            ? paraCampo(Number(proposta.setup_amount))
            : "",
          monthly_goal: proposta.monthly_goal ? String(proposta.monthly_goal) : "",
          scope: proposta.scope ?? "",
          status: proposta.status,
          sent_at: proposta.sent_at ?? "",
          valid_until: proposta.valid_until ?? "",
          notes: proposta.notes ?? "",
        }
      : PROPOSTA_FORM_PADRAO,
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function set<K extends keyof PropostaFormValues>(c: K, v: PropostaFormValues[K]) {
    setValues((atual) => ({ ...atual, [c]: v }));
  }

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem(null);

    const parsed = propostaFormSchema.safeParse(values);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const novos: Record<string, string> = {};
      for (const [c, m] of Object.entries(fe)) if (m?.length) novos[c] = m[0];
      setErros(novos);
      return;
    }
    setErros({});

    iniciar(async () => {
      const r = proposta
        ? await atualizarPropostaAction(proposta.id, parsed.data)
        : await criarPropostaAction(leadId, parsed.data);

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
          <Label htmlFor="p-mensal">Valor mensal (R$) *</Label>
          <Input
            id="p-mensal"
            inputMode="decimal"
            value={values.monthly_amount}
            onChange={(e) => set("monthly_amount", e.target.value)}
            placeholder="1.900,00"
            aria-invalid={Boolean(erros.monthly_amount)}
          />
          {erro("monthly_amount")}
        </div>
        <div>
          <Label htmlFor="p-setup">Entrada (R$)</Label>
          <Input
            id="p-setup"
            inputMode="decimal"
            value={values.setup_amount ?? ""}
            onChange={(e) => set("setup_amount", e.target.value)}
            placeholder="0,00"
          />
          {erro("setup_amount")}
        </div>
        <div>
          <Label htmlFor="p-meta">Conteúdos por mês</Label>
          <Input
            id="p-meta"
            inputMode="numeric"
            value={values.monthly_goal ?? ""}
            onChange={(e) => set("monthly_goal", e.target.value)}
            placeholder="8"
          />
          {erro("monthly_goal")}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="p-status">Situação *</Label>
          <Select
            id="p-status"
            value={values.status}
            onChange={(e) => set("status", e.target.value as PropostaFormValues["status"])}
          >
            {PROPOSAL_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="p-envio">Enviada em</Label>
          <Input
            id="p-envio"
            type="date"
            value={values.sent_at ?? ""}
            onChange={(e) => set("sent_at", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="p-validade">Vale até</Label>
          <Input
            id="p-validade"
            type="date"
            value={values.valid_until ?? ""}
            onChange={(e) => set("valid_until", e.target.value)}
            aria-invalid={Boolean(erros.valid_until)}
          />
          {erro("valid_until")}
        </div>
      </div>

      <div>
        <Label htmlFor="p-escopo">O que está incluso</Label>
        <Textarea
          id="p-escopo"
          rows={3}
          value={values.scope ?? ""}
          onChange={(e) => set("scope", e.target.value)}
          placeholder="8 conteúdos por mês, 1 dia de gravação, stories semanais..."
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : proposta ? "Salvar proposta" : "Criar proposta"}
        </Button>
        <Button type="button" variante="secundaria" onClick={aoConcluir} disabled={salvando}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
