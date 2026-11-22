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
import { etapa } from "@/lib/comercial/etapas";
import {
  instanteDaReuniao,
  paraCampoDeReuniao,
} from "@/lib/comercial/reuniao";
import {
  LEAD_FORM_PADRAO,
  leadFormSchema,
  type LeadFormValues,
} from "@/lib/validation/comercial";
import {
  LEAD_CHANNEL_DETAIL,
  LEAD_CHANNEL_OPTIONS,
  LEAD_STAGES_ABERTAS,
  LEAD_TEMPERATURE_DESC,
  LEAD_TEMPERATURE_OPTIONS,
} from "@/types";
import type { Lead } from "@/types";

interface LeadFormProps {
  lead?: Lead;
  aoConcluir?: () => void;
}

/**
 * Formulário de oportunidade (criação e edição).
 *
 * TRÊS CAMPOS À VISTA, o resto guardado.
 *
 * A Fran: "o cadastro está bem confuso, não é usual". Eram nove
 * campos de uma vez — nome, valor, etapa, canal, detalhe, contato,
 * e-mail, telefone e anotações — para anotar uma conversa que acabou
 * de acontecer no WhatsApp. Quem lança uma oportunidade na hora sabe
 * três coisas: quem é, quanto mais ou menos, e de onde veio.
 *
 * O resto não sumiu: está em "Mais detalhes", que abre sozinho quando
 * algum desses campos já tem conteúdo (que é sempre o caso na
 * edição) ou quando algum deles deu erro — senão o erro ficaria
 * escondido atrás de um bloco fechado.
 *
 * A ETAPA entrou no bloco de baixo porque etapa não se digita: se
 * arrasta no quadro. Oportunidade nova nasce em "Contato feito", que
 * é onde ela está mesmo quando você acabou de falar com a pessoa.
 */
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
          channel: lead.channel,
          stage: lead.stage,
          estimated_monthly: paraCampo(Number(lead.estimated_monthly)),
          temperature: lead.temperature ?? "Morno",
          next_contact_on: lead.next_contact_on ?? "",
          meeting_at: paraCampoDeReuniao(lead.meeting_at),
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

    /* O campo devolve "2026-11-12T16:05", sem fuso. A conversão para
       instante é a da agência — Boa Vista, UTC-4 o ano inteiro — e
       não a do relógio da máquina: o servidor roda em UTC e
       transformaria as 16h daqui em 12h. */
    const dados = {
      ...parsed.data,
      meeting_at: instanteDaReuniao(parsed.data.meeting_at) ?? "",
    };

    iniciar(async () => {
      const r = edicao
        ? await atualizarLeadAction(lead!.id, dados)
        : await criarLeadAction(dados);

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

  /**
   * "Mais detalhes" começa aberto se já tem o que ver lá dentro, ou se
   * algum campo de lá deu erro — senão o erro ficava escondido atrás
   * de um bloco fechado e o formulário não salvava sem dizer por quê.
   */
  const GUARDADOS = [
    "contact_name",
    "contact_email",
    "contact_phone",
    "source",
    "notes",
  ] as const;
  const detalhesAbertos =
    GUARDADOS.some((c) => (values[c] ?? "").trim().length > 0) ||
    GUARDADOS.some((c) => Boolean(erros[c])) ||
    values.stage !== "Novo lead";

  return (
    <form onSubmit={aoEnviar} className="space-y-4" noValidate>
      {mensagem ? <Alert variante="erro">{mensagem}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="l-channel">Origem</Label>
          <Select
            id="l-channel"
            value={values.channel}
            onChange={(e) =>
              atualizar("channel", e.target.value as LeadFormValues["channel"])
            }
          >
            {LEAD_CHANNEL_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </div>

        {/* A temperatura fica à vista, ao lado da origem, e não
            escondida em "Mais detalhes": é ela que diz onde gastar a
            próxima hora. Sem ela, dois leads de R$ 2.500 parecem
            iguais. A definição aparece embaixo porque a diferença
            entre morno e frio não é óbvia, e duas pessoas
            classificando diferente destroem a fila. */}
        <div>
          <Label htmlFor="l-temp">Temperatura *</Label>
          <Select
            id="l-temp"
            value={values.temperature}
            onChange={(e) =>
              atualizar(
                "temperature",
                e.target.value as LeadFormValues["temperature"],
              )
            }
            aria-invalid={Boolean(erros.temperature)}
          >
            {LEAD_TEMPERATURE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          {erro("temperature") ?? (
            <p className="mt-1 text-xs text-gray-500">
              {LEAD_TEMPERATURE_DESC[values.temperature]}
            </p>
          )}
        </div>
      </div>

      {/* A data só aparece quando a etapa é a da reunião — ou quando
          já existe uma marcada, para não sumir com o que foi
          preenchido ao voltar a oportunidade para trás. Campo que não
          serve para a etapa atual é campo a mais, e campo a mais foi
          exatamente a reclamação. */}
      <div className="grid gap-4 sm:grid-cols-2">
        {values.stage === "Reunião marcada" ||
        (values.meeting_at ?? "") !== "" ? (
          <div>
            <Label htmlFor="l-reuniao">Data da reunião</Label>
            <Input
              id="l-reuniao"
              type="datetime-local"
              value={values.meeting_at ?? ""}
              onChange={(e) => atualizar("meeting_at", e.target.value)}
              aria-invalid={Boolean(erros.meeting_at)}
            />
            {erro("meeting_at")}
          </div>
        ) : null}

        {/* O compromisso, e não o alarme. Sugerido pela etapa ao
            mover o cartão; aqui dá para mudar quando a pessoa
            combinou outra coisa com o cliente. */}
        <div>
          <Label htmlFor="l-prox">Próximo contato</Label>
          <Input
            id="l-prox"
            type="date"
            value={values.next_contact_on ?? ""}
            onChange={(e) => atualizar("next_contact_on", e.target.value)}
            aria-invalid={Boolean(erros.next_contact_on)}
          />
          {erro("next_contact_on") ?? (
            <p className="mt-1 text-xs text-gray-500">
              {etapa(values.stage).oQueFazer}
            </p>
          )}
        </div>
      </div>

      <details open={detalhesAbertos} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <summary className="cursor-pointer select-none text-sm font-semibold text-gray-700">
          Mais detalhes
        </summary>

        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="l-stage">Etapa</Label>
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

            </div>
            <div>
              <Label htmlFor="l-source">
                {LEAD_CHANNEL_DETAIL[values.channel]}
              </Label>
              <Input
                id="l-source"
                value={values.source ?? ""}
                onChange={(e) => atualizar("source", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="l-contact">Contato</Label>
              <Input
                id="l-contact"
                value={values.contact_name ?? ""}
                onChange={(e) => atualizar("contact_name", e.target.value)}
                placeholder="Nome de quem fala"
              />
            </div>
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
        </div>
      </details>

      <div className="flex gap-3">
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : edicao ? "Salvar" : "Cadastrar"}
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
