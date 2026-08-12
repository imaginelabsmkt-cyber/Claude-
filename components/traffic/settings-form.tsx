"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { salvarSettingsAction } from "@/lib/actions/traffic";
import {
  trafficSettingsSchema,
  type TrafficSettingsFormValues,
} from "@/lib/validation/traffic";
import type { TrafficSettings } from "@/types";

interface SettingsFormProps {
  settings: TrafficSettings;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();
  const [salvando, iniciar] = useTransition();
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<
    { tipo: "sucesso" | "erro"; texto: string } | null
  >(null);
  const [values, setValues] = useState<TrafficSettingsFormValues>({
    reminder_days: String(settings.reminder_days),
    reminder_interval: String(settings.reminder_interval),
    reminder_max: String(settings.reminder_max),
    due_offset_days: String(settings.due_offset_days),
    charge_template: settings.charge_template,
    reminder_template: settings.reminder_template,
  });

  function atualizar<K extends keyof TrafficSettingsFormValues>(
    campo: K,
    valor: TrafficSettingsFormValues[K],
  ) {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem(null);
    const parsed = trafficSettingsSchema.safeParse(values);
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
    iniciar(async () => {
      const r = await salvarSettingsAction(parsed.data);
      if (!r.ok) {
        setErros(r.fieldErrors ?? {});
        setMensagem({ tipo: "erro", texto: r.error ?? "Erro ao salvar." });
        return;
      }
      setMensagem({ tipo: "sucesso", texto: "Configurações salvas." });
      router.refresh();
    });
  }

  return (
    <form onSubmit={aoEnviar} className="max-w-2xl space-y-5" noValidate>
      {mensagem ? (
        <Alert variante={mensagem.tipo === "sucesso" ? "sucesso" : "erro"}>
          {mensagem.texto}
        </Alert>
      ) : null}

      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-semibold text-gray-900">
          Regras de cobrança e lembrete
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo
            id="due_offset_days"
            rotulo="Vencimento (dias após a segunda)"
            ajuda="0 = vence na própria segunda-feira."
            valor={values.due_offset_days}
            erro={erros.due_offset_days}
            onChange={(v) => atualizar("due_offset_days", v)}
          />
          <Campo
            id="reminder_days"
            rotulo="1º lembrete após (dias de atraso)"
            valor={values.reminder_days}
            erro={erros.reminder_days}
            onChange={(v) => atualizar("reminder_days", v)}
          />
          <Campo
            id="reminder_interval"
            rotulo="Intervalo entre lembretes (dias)"
            valor={values.reminder_interval}
            erro={erros.reminder_interval}
            onChange={(v) => atualizar("reminder_interval", v)}
          />
          <Campo
            id="reminder_max"
            rotulo="Máximo de lembretes"
            valor={values.reminder_max}
            erro={erros.reminder_max}
            onChange={(v) => atualizar("reminder_max", v)}
          />
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Modelos de mensagem
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Use os atalhos entre chaves — eles são trocados pelos dados reais no
            envio: <code>{"{cliente}"}</code>, <code>{"{valor}"}</code>,{" "}
            <code>{"{pix}"}</code>, <code>{"{semana}"}</code>,{" "}
            <code>{"{vencimento}"}</code>.
          </p>
        </div>

        <div>
          <Label htmlFor="charge_template">Mensagem de cobrança</Label>
          <Textarea
            id="charge_template"
            rows={6}
            value={values.charge_template}
            onChange={(e) => atualizar("charge_template", e.target.value)}
            aria-invalid={Boolean(erros.charge_template)}
          />
          {erros.charge_template ? (
            <p className="mt-1 text-xs text-red-600">{erros.charge_template}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="reminder_template">Mensagem de lembrete</Label>
          <Textarea
            id="reminder_template"
            rows={5}
            value={values.reminder_template}
            onChange={(e) => atualizar("reminder_template", e.target.value)}
            aria-invalid={Boolean(erros.reminder_template)}
          />
          {erros.reminder_template ? (
            <p className="mt-1 text-xs text-red-600">
              {erros.reminder_template}
            </p>
          ) : null}
        </div>
      </Card>

      <div>
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </form>
  );
}

function Campo({
  id,
  rotulo,
  ajuda,
  valor,
  erro,
  onChange,
}: {
  id: string;
  rotulo: string;
  ajuda?: string;
  valor: string;
  erro?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{rotulo}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(erro)}
      />
      {ajuda ? <p className="mt-1 text-xs text-gray-500">{ajuda}</p> : null}
      {erro ? <p className="mt-1 text-xs text-red-600">{erro}</p> : null}
    </div>
  );
}
