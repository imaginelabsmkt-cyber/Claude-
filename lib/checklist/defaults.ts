/** Itens padrão dos checklists do cliente. */

export type ChecklistKind = "onboard" | "plano";

/** Onboarding: o passo a passo ao entrar um cliente novo. */
export const CHECKLIST_ONBOARD: string[] = [
  "Fazer contrato",
  "Enviar Google Forms (onboard)",
  "Marcar reunião de alinhamento",
  "Criar grupo no WhatsApp",
];

/** Plano de ação: acessos necessários (depois da reunião de alinhamento). */
export const CHECKLIST_PLANO: string[] = [
  "Acesso ao Google (Meu Negócio / Search Console)",
  "Acesso ao Facebook Ads / Meta",
  "Acesso ao Instagram",
];

export function itensPadrao(kind: ChecklistKind): string[] {
  return kind === "onboard" ? CHECKLIST_ONBOARD : CHECKLIST_PLANO;
}
