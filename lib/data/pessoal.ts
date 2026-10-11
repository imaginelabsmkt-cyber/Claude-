/**
 * =============================================================
 * LEITURA DOS GASTOS PESSOAIS
 * =============================================================
 * Nenhuma função daqui filtra por usuário. Isso é de propósito: o
 * filtro é do BANCO, pela policy `user_id = auth.uid()`. Se o filtro
 * estivesse aqui, um esquecimento numa query futura vazaria o dado de
 * uma sócia para a outra. Do jeito que está, esquecer não vaza nada —
 * o Postgres devolve só as linhas de quem está logado.
 *
 * A única leitura que atravessa para o lado da empresa é o pró-labore
 * (seção 2), e ela é explícita sobre isso.
 * =============================================================
 */

import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import { somar } from "@/lib/financeiro/calculo";
import {
  agruparPorCategoriaPessoal,
  fixosAGerar,
  resumirMesPessoal,
  type CategoriaPessoal,
  type ResumoPessoal,
} from "@/lib/pessoal/calculo";
import type { PersonalEntry, PersonalRecurrence, TeamMember } from "@/types";

export interface PainelPessoal {
  mes: string;
  lancamentos: PersonalEntry[];
  resumo: ResumoPessoal;
  categorias: CategoriaPessoal[];
  fixos: PersonalRecurrence[];
  /** Quantos itens do plano fixo ainda não viraram lançamento no mês. */
  fixosPendentes: number;
  /** O que a agência pagou de pró-labore a esta pessoa no mês. */
  proLabore: { valor: number; emAberto: number; pessoa: TeamMember } | null;
  /**
   * Pessoas da equipe que ainda não têm login vinculado — para quem
   * nunca se identificou poder fazê-lo.
   */
  pessoasSemLogin: TeamMember[];
}

/** Normaliza numeric do Postgres (vem string) para number. */
function numerico<T extends { amount: number }>(linha: T): T {
  return { ...linha, amount: Number(linha.amount) };
}

/** Tudo que a aba pessoal mostra, para o mês em foco. */
export async function obterPainelPessoal(mes: string): Promise<PainelPessoal> {
  const supabase = createClient();
  const meuId = await usuarioAtualId();

  // 1. O que é meu — o RLS já recorta, não preciso de .eq("user_id").
  const [{ data: lancamentosBrutos }, { data: fixosBrutos }] = await Promise.all([
    supabase
      .from("personal_entries")
      .select("*")
      .eq("reference_month", mes)
      .order("entry_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("personal_recurrences")
      .select("*")
      .order("active", { ascending: false })
      .order("description"),
  ]);

  const lancamentos = (lancamentosBrutos ?? []).map(numerico);
  const fixos = (fixosBrutos ?? []).map(numerico);

  // 2. O pró-labore vem do financeiro DA EMPRESA, que as duas veem.
  //    Mostrar aqui não revela nada novo: é o seu próprio pagamento,
  //    já visível na tela de Pessoas. Serve para não ter que digitar
  //    o próprio salário todo mês.
  let proLabore: PainelPessoal["proLabore"] = null;
  let pessoasSemLogin: TeamMember[] = [];

  if (meuId) {
    const { data: pessoas } = await supabase
      .from("team_members")
      .select("*")
      .eq("active", true)
      .order("name");

    const minha = (pessoas ?? []).find((p) => p.profile_id === meuId) ?? null;
    pessoasSemLogin = (pessoas ?? []).filter((p) => p.profile_id === null);

    if (minha) {
      const { data: pagamentos } = await supabase
        .from("financial_entries")
        .select("amount, status")
        .eq("reference_month", mes)
        .eq("kind", "Despesa")
        .eq("team_member_id", minha.id);

      const linhas = pagamentos ?? [];
      proLabore = {
        pessoa: minha,
        valor: somar(
          linhas.filter((l) => l.status === "Pago").map((l) => Number(l.amount)),
        ),
        emAberto: somar(
          linhas
            .filter((l) => l.status === "Pendente")
            .map((l) => Number(l.amount)),
        ),
      };
    }
  }

  return {
    mes,
    lancamentos,
    resumo: resumirMesPessoal(lancamentos),
    categorias: agruparPorCategoriaPessoal(lancamentos),
    fixos,
    fixosPendentes: fixosAGerar(fixos, lancamentos, mes).length,
    proLabore,
    pessoasSemLogin,
  };
}

/** Um lançamento meu, para a tela de edição. */
export async function obterGastoPessoal(
  id: string,
): Promise<PersonalEntry | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("personal_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data ? numerico(data) : null;
}

/**
 * Categorias que esta pessoa já usou, para o autocompletar aprender
 * com ela em vez de só oferecer a lista padrão.
 */
export async function listarCategoriasUsadas(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase.from("personal_entries").select("category");

  const vistas = new Map<string, string>();
  for (const l of data ?? []) {
    const nome = (l.category ?? "").trim();
    if (!nome) continue;
    const chave = nome.toLocaleLowerCase("pt-BR");
    if (!vistas.has(chave)) vistas.set(chave, nome);
  }
  return [...vistas.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
