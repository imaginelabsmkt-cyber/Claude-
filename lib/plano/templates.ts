/**
 * =============================================================
 * MODELOS DE TAREFA A PARTIR DE UM ITEM DO PLANO
 * =============================================================
 * Dado o título de um item FAVIE do plano de ação, decide o que ele vira
 * quando a pessoa clica em "Gerar tarefa":
 *  - "ensaio"  -> um CONTEÚDO de produção (vai pras Gravações e pra Agenda do
 *                 Google, com o fluxo marcar -> gravar -> editar).
 *  - "demanda" -> uma DEMANDA com um checklist de etapas já pronto.
 *
 * Função pura (sem banco), fácil de testar e ajustar.
 * =============================================================
 */

import type { DemandStep } from "@/types";

export type KindTarefa = "ensaio" | "demanda";

export interface ModeloTarefa {
  kind: KindTarefa;
  /** Área da demanda (quando kind === "demanda"). */
  category: string | null;
  /** Etapas sugeridas (checklist) da demanda. */
  steps: DemandStep[];
}

function base(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const passos = (...labels: string[]): DemandStep[] =>
  labels.map((label) => ({ label, done: false }));

/** Decide o modelo de tarefa a partir do título do item do plano. */
export function modeloParaItem(titulo: string): ModeloTarefa {
  const t = base(titulo);

  // Ensaio / sessão de fotos -> produção (Gravações + Agenda).
  if (/sessao de fotos|ensaio|\bfoto\b|\bfotos\b|book fotografico/.test(t)) {
    return { kind: "ensaio", category: null, steps: [] };
  }

  // Auditoria / atendimento -> demanda com etapas (análise + PDF de respostas).
  if (/auditoria|atendimento|respostas? padr/.test(t)) {
    return {
      kind: "demanda",
      category: "Google Meu Negócio",
      steps: passos(
        "Analisar como estão respondendo hoje",
        "Montar o PDF de respostas padrão",
        "Treinar e entregar ao cliente",
      ),
    };
  }

  if (/whatsapp/.test(t)) {
    return {
      kind: "demanda",
      category: "Outro",
      steps: passos(
        "Montar o roteiro de atendimento",
        "Configurar a mensagem automática",
        "Testar o fluxo de ponta a ponta",
      ),
    };
  }

  if (/relatorio/.test(t)) {
    return {
      kind: "demanda",
      category: "Relatório",
      steps: passos(
        "Puxar os números da Meta e do Google",
        "Montar o relatório do mês",
        "Enviar e explicar pro cliente",
      ),
    };
  }

  if (/anuncio|trafego|\bads\b|campanha|impuls/.test(t)) {
    return {
      kind: "demanda",
      category: "Tráfego",
      steps: passos(
        "Montar a estrutura da campanha",
        "Subir os criativos",
        "Acompanhar e ajustar ao longo da semana",
      ),
    };
  }

  // Bio / destaques / perfil do Instagram -> Instagram (não é Google).
  if (/\bbio\b|destaques?|highlights|instagram|feed\b/.test(t)) {
    return {
      kind: "demanda",
      category: "Instagram",
      steps: passos(
        "Levantar o que precisa",
        "Executar",
        "Revisar e confirmar",
      ),
    };
  }

  if (/google|perfil da empresa|ranque|ranqueamento|meu negocio/.test(t)) {
    return {
      kind: "demanda",
      category: "Google Meu Negócio",
      steps: passos(
        "Levantar o que precisa",
        "Executar",
        "Revisar e confirmar",
      ),
    };
  }

  // Padrão: demanda simples, sem checklist (a pessoa adiciona etapas se quiser).
  return { kind: "demanda", category: "Estratégia", steps: [] };
}
