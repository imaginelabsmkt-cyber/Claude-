"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { paraNumero } from "@/lib/financeiro/valores";
import {
  pessoaFormSchema,
  type PessoaFormValues,
} from "@/lib/validation/pessoas";

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

function primeirosErros(
  fieldErrors: Record<string, string[] | undefined>,
): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const [campo, msgs] of Object.entries(fieldErrors)) {
    if (msgs && msgs.length > 0) saida[campo] = msgs[0];
  }
  return saida;
}

function limpar(v?: string | null): string | null {
  const t = v?.trim();
  return t ? t : null;
}

function revalidar() {
  revalidatePath("/interno/pessoas");
  revalidatePath("/interno");
}

function normalizar(values: PessoaFormValues) {
  const taxa = values.default_rate?.trim();
  return {
    name: values.name.trim(),
    kind: values.kind,
    role: limpar(values.role),
    default_rate: taxa ? (paraNumero(taxa) ?? null) : null,
    contact: limpar(values.contact),
    payment_info: limpar(values.payment_info),
    notes: limpar(values.notes),
    active: values.active,
  };
}

/** Cadastra uma pessoa (sócia, freelancer ou prestador). */
export async function criarPessoaAction(
  input: PessoaFormValues,
): Promise<ActionResult> {
  const parsed = pessoaFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("team_members")
    .insert(normalizar(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    // 23505 = unicidade do nome.
    return {
      ok: false,
      error:
        error?.code === "23505"
          ? "Já existe uma pessoa com esse nome."
          : "Não foi possível salvar.",
    };
  }

  revalidar();
  return { ok: true, id: data.id };
}

/** Atualiza uma pessoa. */
export async function atualizarPessoaAction(
  id: string,
  input: PessoaFormValues,
): Promise<ActionResult> {
  const parsed = pessoaFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("team_members")
    .update(normalizar(parsed.data))
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "Já existe uma pessoa com esse nome."
          : "Não foi possível atualizar.",
    };
  }

  revalidar();
  return { ok: true, id };
}

/**
 * Desativa a pessoa. Não existe exclusão: os pagamentos feitos a ela
 * continuam no financeiro, e apagar o cadastro deixaria o histórico
 * sem dono.
 */
export async function definirAtivaPessoaAction(
  id: string,
  ativa: boolean,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("team_members")
    .update({ active: ativa })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  revalidar();
  return { ok: true, id };
}
