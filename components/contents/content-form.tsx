"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import {
  criarConteudoAction,
  atualizarConteudoAction,
} from "@/lib/actions/contents";
import {
  contentFormSchema,
  CONTENT_FORM_PADRAO,
  type ContentFormValues,
} from "@/lib/validation/content";
import {
  FORMAT_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  WEEK_OPTIONS,
  type Content,
  type Profile,
} from "@/types";
import type { OpcaoCliente } from "@/lib/data/contents";

interface ContentFormProps {
  conteudo?: Content;
  clientes: OpcaoCliente[];
  perfis: Profile[];
}

/** Converte um conteúdo do banco nos valores (strings) do formulário. */
function conteudoParaForm(c: Content): ContentFormValues {
  const s = (v: string | null) => v ?? "";
  return {
    client_id: c.client_id,
    title: c.title,
    format: c.format ?? "",
    status: c.status,
    priority: c.priority,
    reference_month: c.reference_month ?? "",
    planned_week: c.planned_week != null ? String(c.planned_week) : "1",
    description: s(c.description),
    content_pillar: s(c.content_pillar),
    objective: s(c.objective),
    recording_location: s(c.recording_location),
    participants: c.participants.join(", "),
    outfit: s(c.outfit),
    required_materials: c.required_materials.join(", "),
    notes: s(c.notes),
    planned_date: s(c.planned_date),
    actual_post_date: s(c.actual_post_date),
    recording_date: s(c.recording_date),
    script_deadline: s(c.script_deadline),
    recording_deadline: s(c.recording_deadline),
    editing_deadline: s(c.editing_deadline),
    script_url: s(c.script_url),
    raw_files_url: s(c.raw_files_url),
    edited_file_url: s(c.edited_file_url),
    published_url: s(c.published_url),
    planner_id: s(c.planner_id),
    recorder_id: s(c.recorder_id),
    editor_id: s(c.editor_id),
    publisher_id: s(c.publisher_id),
    revision_count: String(c.revision_count ?? 0),
    requires_recording: c.requires_recording,
    is_fixed_date: c.is_fixed_date,
    is_campaign: c.is_campaign,
  };
}

/** Seção do formulário com título. */
function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-gray-100 pt-5">
      <legend className="text-sm font-semibold text-gray-900">{titulo}</legend>
      {children}
    </fieldset>
  );
}

export function ContentForm({ conteudo, clientes, perfis }: ContentFormProps) {
  const router = useRouter();
  const edicao = Boolean(conteudo);

  const [values, setValues] = useState<ContentFormValues>(
    conteudo ? conteudoParaForm(conteudo) : CONTENT_FORM_PADRAO,
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<
    { tipo: "sucesso" | "erro"; texto: string } | null
  >(null);
  const [salvando, iniciar] = useTransition();

  function set<K extends keyof ContentFormValues>(
    campo: K,
    valor: ContentFormValues[K],
  ) {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  const erro = (campo: string) =>
    erros[campo] ? (
      <p className="mt-1 text-xs text-red-600">{erros[campo]}</p>
    ) : null;

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem(null);

    const parsed = contentFormSchema.safeParse(values);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const novos: Record<string, string> = {};
      for (const [campo, msgs] of Object.entries(fe)) {
        if (msgs && msgs.length) novos[campo] = msgs[0];
      }
      setErros(novos);
      setMensagem({ tipo: "erro", texto: "Verifique os campos destacados." });
      return;
    }
    setErros({});

    iniciar(async () => {
      const r = edicao
        ? await atualizarConteudoAction(conteudo!.id, values)
        : await criarConteudoAction(values);

      if (!r.ok) {
        setErros(r.fieldErrors ?? {});
        setMensagem({ tipo: "erro", texto: r.error ?? "Não foi possível salvar." });
        return;
      }

      if (edicao) {
        setMensagem({ tipo: "sucesso", texto: "Conteúdo atualizado com sucesso." });
        router.refresh();
      } else {
        router.push(`/conteudos/${r.id}`);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={aoEnviar} className="space-y-6" noValidate>
      {mensagem ? (
        <Alert variante={mensagem.tipo === "sucesso" ? "sucesso" : "erro"}>
          {mensagem.texto}
        </Alert>
      ) : null}

      {/* Identificação (obrigatórios) */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-900">
          Identificação
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="client_id">Cliente *</Label>
            <Select
              id="client_id"
              value={values.client_id}
              onChange={(e) => set("client_id", e.target.value)}
            >
              <option value="">Selecione...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {erro("client_id")}
          </div>

          <div>
            <Label htmlFor="format">Formato *</Label>
            <Select
              id="format"
              value={values.format}
              onChange={(e) => set("format", e.target.value)}
            >
              <option value="">Selecione...</option>
              {FORMAT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
            {erro("format")}
          </div>
        </div>

        <div>
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Título do conteúdo"
          />
          {erro("title")}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="status">Status *</Label>
            <Select
              id="status"
              value={values.status}
              onChange={(e) => set("status", e.target.value as Content["status"])}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            {erro("status")}
          </div>
          <div>
            <Label htmlFor="priority">Prioridade *</Label>
            <Select
              id="priority"
              value={values.priority}
              onChange={(e) =>
                set("priority", e.target.value as Content["priority"])
              }
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            {erro("priority")}
          </div>
          <div>
            <Label htmlFor="reference_month">Mês de referência *</Label>
            <Input
              id="reference_month"
              type="month"
              value={values.reference_month}
              onChange={(e) => set("reference_month", e.target.value)}
            />
            {erro("reference_month")}
          </div>
          <div>
            <Label htmlFor="planned_week">Semana prevista *</Label>
            <Select
              id="planned_week"
              value={values.planned_week}
              onChange={(e) => set("planned_week", e.target.value)}
            >
              {WEEK_OPTIONS.map((w) => (
                <option key={w} value={String(w)}>
                  Semana {w}
                </option>
              ))}
            </Select>
            {erro("planned_week")}
          </div>
        </div>
      </fieldset>

      {/* Detalhes */}
      <Secao titulo="Detalhes">
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            rows={3}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
          />
          {erro("description")}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="content_pillar">Pilar de conteúdo</Label>
            <Input
              id="content_pillar"
              value={values.content_pillar}
              onChange={(e) => set("content_pillar", e.target.value)}
            />
            {erro("content_pillar")}
          </div>
          <div>
            <Label htmlFor="objective">Objetivo</Label>
            <Input
              id="objective"
              value={values.objective}
              onChange={(e) => set("objective", e.target.value)}
            />
            {erro("objective")}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="planned_date">Data prevista</Label>
            <Input
              id="planned_date"
              type="date"
              value={values.planned_date}
              onChange={(e) => set("planned_date", e.target.value)}
            />
            {erro("planned_date")}
          </div>
          <div>
            <Label htmlFor="actual_post_date">Data real</Label>
            <Input
              id="actual_post_date"
              type="date"
              value={values.actual_post_date}
              onChange={(e) => set("actual_post_date", e.target.value)}
            />
            {erro("actual_post_date")}
          </div>
        </div>
      </Secao>

      {/* Gravação */}
      <Secao titulo="Gravação">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={values.requires_recording}
            onChange={(e) => set("requires_recording", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          Precisa de gravação
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="recording_date">Data de gravação</Label>
            <Input
              id="recording_date"
              type="date"
              value={values.recording_date}
              onChange={(e) => set("recording_date", e.target.value)}
            />
            {erro("recording_date")}
          </div>
          <div>
            <Label htmlFor="recording_location">Local da gravação</Label>
            <Input
              id="recording_location"
              value={values.recording_location}
              onChange={(e) => set("recording_location", e.target.value)}
            />
            {erro("recording_location")}
          </div>
        </div>
        <div>
          <Label htmlFor="participants">
            Participantes (separe por vírgula)
          </Label>
          <Input
            id="participants"
            value={values.participants}
            onChange={(e) => set("participants", e.target.value)}
            placeholder="Ex.: Fran, Vitória"
          />
          {erro("participants")}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="outfit">Roupa</Label>
            <Input
              id="outfit"
              value={values.outfit}
              onChange={(e) => set("outfit", e.target.value)}
            />
            {erro("outfit")}
          </div>
          <div>
            <Label htmlFor="required_materials">
              Materiais necessários (separe por vírgula)
            </Label>
            <Input
              id="required_materials"
              value={values.required_materials}
              onChange={(e) => set("required_materials", e.target.value)}
            />
            {erro("required_materials")}
          </div>
        </div>
      </Secao>

      {/* Responsáveis */}
      <Secao titulo="Responsáveis">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["planner_id", "Planejamento"],
              ["recorder_id", "Gravação"],
              ["editor_id", "Edição"],
              ["publisher_id", "Postagem"],
            ] as const
          ).map(([campo, rotulo]) => (
            <div key={campo}>
              <Label htmlFor={campo}>{rotulo}</Label>
              <Select
                id={campo}
                value={values[campo]}
                onChange={(e) => set(campo, e.target.value)}
              >
                <option value="">—</option>
                {perfis.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              {erro(campo)}
            </div>
          ))}
        </div>
      </Secao>

      {/* Prazos */}
      <Secao titulo="Prazos">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="script_deadline">Prazo do roteiro</Label>
            <Input
              id="script_deadline"
              type="date"
              value={values.script_deadline}
              onChange={(e) => set("script_deadline", e.target.value)}
            />
            {erro("script_deadline")}
          </div>
          <div>
            <Label htmlFor="recording_deadline">Prazo da gravação</Label>
            <Input
              id="recording_deadline"
              type="date"
              value={values.recording_deadline}
              onChange={(e) => set("recording_deadline", e.target.value)}
            />
            {erro("recording_deadline")}
          </div>
          <div>
            <Label htmlFor="editing_deadline">Prazo da edição</Label>
            <Input
              id="editing_deadline"
              type="date"
              value={values.editing_deadline}
              onChange={(e) => set("editing_deadline", e.target.value)}
            />
            {erro("editing_deadline")}
          </div>
        </div>
      </Secao>

      {/* Links */}
      <Secao titulo="Links">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(
            [
              ["script_url", "Link do roteiro"],
              ["raw_files_url", "Link dos arquivos brutos"],
              ["edited_file_url", "Link da edição"],
              ["published_url", "Link da postagem"],
            ] as const
          ).map(([campo, rotulo]) => (
            <div key={campo}>
              <Label htmlFor={campo}>{rotulo}</Label>
              <Input
                id={campo}
                type="url"
                value={values[campo]}
                onChange={(e) => set(campo, e.target.value)}
                placeholder="https://..."
              />
              {erro(campo)}
            </div>
          ))}
        </div>
      </Secao>

      {/* Controle */}
      <Secao titulo="Controle">
        <div>
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            rows={3}
            value={values.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
          {erro("notes")}
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="sm:w-40">
            <Label htmlFor="revision_count">Quantidade de ajustes</Label>
            <Input
              id="revision_count"
              type="number"
              min={0}
              value={values.revision_count}
              onChange={(e) => set("revision_count", e.target.value)}
            />
            {erro("revision_count")}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={values.is_fixed_date}
              onChange={(e) => set("is_fixed_date", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            Data fixa
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={values.is_campaign}
              onChange={(e) => set("is_campaign", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            Campanha
          </label>
        </div>
      </Secao>

      <div className="flex items-center gap-3 border-t border-gray-100 pt-5">
        <Button type="submit" disabled={salvando}>
          {salvando
            ? "Salvando..."
            : edicao
              ? "Salvar alterações"
              : "Criar conteúdo"}
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
