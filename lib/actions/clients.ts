"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizarWhatsapp } from "@/lib/utils";
import {
  clienteFormSchema,
  type ClienteFormValues,
} from "@/lib/validation/client";

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** Erros por campo (chave = nome do campo). */
  fieldErrors?: Record<string, string>;
  id?: string;
}

/** Converte strings vazias em null antes de gravar. */
function normalizar(values: ClienteFormValues) {
  const limpar = (v?: string) => {
    const t = v?.trim();
    return t ? t : null;
  };
  const meta = values.monthly_goal?.trim();
  const valorTrafego = values.traffic_value?.trim();
  return {
    name: values.name.trim(),
    color: limpar(values.color),
    niche: limpar(values.niche),
    monthly_goal: meta ? Number(meta) : null,
    notes: limpar(values.notes),
    active: values.active,
    whatsapp: normalizarWhatsapp(values.whatsapp),
    traffic_billing_active: values.traffic_billing_active,
    traffic_value: valorTrafego
      ? Number(valorTrafego.replace(",", "."))
      : null,
    traffic_pix_code: limpar(values.traffic_pix_code),
  };
}

/** Extrai o primeiro erro de cada campo do resultado do Zod. */
function primeirosErros(
  fieldErrors: Record<string, string[] | undefined>,
): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const [campo, mensagens] of Object.entries(fieldErrors)) {
    if (mensagens && mensagens.length > 0) saida[campo] = mensagens[0];
  }
  return saida;
}

/** Cria um novo cliente. */
export async function criarClienteAction(
  input: ClienteFormValues,
): Promise<ActionResult> {
  const parsed = clienteFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert(normalizar(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Não foi possível salvar o cliente." };
  }

  revalidatePath("/clientes");
  return { ok: true, id: data.id };
}

/** Atualiza um cliente existente. */
export async function atualizarClienteAction(
  id: string,
  input: ClienteFormValues,
): Promise<ActionResult> {
  const parsed = clienteFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("clients")
    .update(normalizar(parsed.data))
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Não foi possível atualizar o cliente." };
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: true, id };
}

/**
 * Ativa/desativa um cliente (soft-delete). Não há exclusão definitiva.
 */
export async function definirAtivoClienteAction(
  id: string,
  ativo: boolean,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("clients")
    .update({ active: ativo })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Não foi possível atualizar o status." };
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: true, id };
}
