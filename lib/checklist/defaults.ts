/** Itens padrão dos checklists do cliente. */

export type ChecklistKind = "onboard" | "plano";

/** Onboarding: o passo a passo ao entrar um cliente novo. */
export const CHECKLIST_ONBOARD: string[] = [
  "Fazer contrato",
  "Confirmar 1º pagamento",
  "Enviar Google Forms (onboard)",
  "Preencher o DNA no sistema (aba Onboard)",
  "Marcar reunião de alinhamento",
  "Criar grupo no WhatsApp",
  "Coletar materiais e acessos da marca",
  "Fazer diagnóstico inicial",
  "Definir metas e planejamento do 1º mês",
  "Ativar o painel do cliente (link)",
];

/** Plano de ação: acessos necessários (depois da reunião de alinhamento). */
export const CHECKLIST_PLANO: string[] = [
  "Acesso ao Google (Meu Negócio / Search Console)",
  "Acesso ao Facebook Ads / Meta (Business Manager)",
  "Acesso ao Instagram",
  "Acesso ao site (se houver)",
  "WhatsApp Business / número de atendimento",
];

export function itensPadrao(kind: ChecklistKind): string[] {
  return kind === "onboard" ? CHECKLIST_ONBOARD : CHECKLIST_PLANO;
}
