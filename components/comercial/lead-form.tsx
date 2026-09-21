"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { atualizarLeadAction, criarLeadAction } from "@/lib/actions/comercial";
import { paraCampo } from "@/lib/financeiro/valores";
import {
  LEAD_FORM_PADRAO,
  leadFormSchema,
  type LeadFormValues,
} from "@/lib/validation/comercial";
import { LEAD_SOURCE_OPTIONS, LEAD_STAGES_ABERTAS } from "@/types";
import type { Lead } from "@/types";

interface LeadFormProps {
  lead?: Lead;
  aoConcluir?: () => void;
}

/** Formulário de oportunidade (criação e edição). */
export function LeadForm({ lead, aoConcluir }: LeadFormProps) {
  const router = useRouter();
  const edicao = Boolean(lead);

  const [values, setValues] = useState<LeadFormValues>(
    lead
      ? {
          name: lead.name,
          contact_name: lead.contact_name ?? "",
          contact_email: lead.contact_email ?? "",
          contact_phone: lead.contact_phone ?? "",
          source: lead.source ?? "",
          stage: lead.stage,
          estimated_monthly: paraCampo(Number(lead.estimated_monthly)),
          notes: lead.notes ?? "",
        }
      : LEAD_FORM_PADRAO,
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function atualizar<K extends keyof LeadFormValues>(
    campo: K,
    valor: LeadFormValues[K],
  ) {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem(null);

    const parsed = leadFormSchema.safeParse(values);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const novos: Record<string, string> = {};
      for (const [c, m] of Object.entries(fe)) if (m?.length) novos[c] = m[0];
      setErros(novos);
      return;
    }
    setErros({});

    iniciar(async () => {
      const r = edicao
        ? await atualizarLeadAction(lead!.id, parsed.data)
        : await criarLeadAction(parsed.data);

      if (!r.ok) {
        setErros(r.fieldErrors ?? {});
        setMensagem(r.error ?? "Não foi possível salvar.");
        return;
      }

      if (aoConcluir) aoConcluir();
      else router.push(`/interno/comercial/${r.id}`);
      router.refresh();
    });
  }

  const erro = (campo: string) =>
    erros[campo] ? <p className="mt-1 text-xs text-alerta">{erros[campo]}</p> : null;

  return (
    <form onSubmit={aoEnviar} className="space-y-4" noValidate>
      {mensagem ? <Alert variante="erro">{mensagem}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="l-name">Nome da oportunidade *</Label>
          <Input
            id="l-name"
            value={values.name}
            onChange={(e) => atualizar("name", e.target.value)}
            placeholder="Ex.: Clínica Ventre"
            aria-invalid={Boolean(erros.name)}
          />
          {erro("name")}
        </div>
        <div>
          <Label htmlFor="l-valor">Valor mensal estimado (R$)</Label>
          <Input
            id="l-valor"
            inputMode="decimal"
            value={values.estimated_monthly ?? ""}
            onChange={(e) => atualizar("estimated_monthly", e.target.value)}
            placeholder="1.500,00"
            aria-invalid={Boolean(erros.estimated_monthly)}
          />
          {erro("estimated_monthly")}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="l-stage">Etapa *</Label>
          <Select
            id="l-stage"
            value={values.stage}
            onChange={(e) =>
              atualizar("stage", e.target.value as LeadFormValues["stage"])
            }
          >
            {LEAD_STAGES_ABERTAS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-gray-500">
            Ganhar e perder ficam na ficha.
          </p>
        </div>
        <div>
          <Label htmlFor="l-source">Como chegou</Label>
          <Select
            id="l-source"
            value={values.source ?? ""}
            onChange={(e) => atualizar("source", e.target.value)}
          >
            <option value="">—</option>
            {LEAD_SOURCE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="l-contact">Contato</Label>
          <Input
            id="l-contact"
            value={values.contact_name ?? ""}
            onChange={(e) => atualizar("contact_name", e.target.value)}
            placeholder="Nome de quem fala"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="l-email">E-mail</Label>
          <Input
            id="l-email"
            type="email"
            value={values.contact_email ?? ""}
            onChange={(e) => atualizar("contact_email", e.target.value)}
            aria-invalid={Boolean(erros.contact_email)}
          />
          {erro("contact_email")}
        </div>
        <div>
          <Label htmlFor="l-phone">Telefone</Label>
          <Input
            id="l-phone"
            value={values.contact_phone ?? ""}
            onChange={(e) => atualizar("contact_phone", e.target.value)}
            placeholder="(46) 90000-0000"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="l-notes">Anotações</Label>
        <Textarea
          id="l-notes"
          rows={3}
          value={values.notes ?? ""}
          onChange={(e) => atualizar("notes", e.target.value)}
          placeholder="O que essa pessoa precisa, o que foi combinado..."
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : edicao ? "Salvar" : "Criar oportunidade"}
        </Button>
        {aoConcluir ? (
          <Button type="button" variante="secundaria" onClick={aoConcluir} disabled={salvando}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
