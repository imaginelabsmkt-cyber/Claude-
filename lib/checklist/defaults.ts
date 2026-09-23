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

/**
 * Plano de ação: o que precisamos do cliente (acessos e pendências), no mesmo
 * passo a passo do deck de alinhamento.
 */
export const CHECKLIST_PLANO: string[] = [
  "Criar Business Manager + conta de anúncios",
  "Cadastrar cartão e definir a verba mensal de anúncios",
  "Compartilhar Drive (logo, identidade visual, fotos)",
  "Acesso de gestão do Perfil da Empresa no Google",
  "Acesso ao Instagram (trocar a senha depois de configurar)",
  "Indicar quem vai gravar (com autorização de imagem)",
  "Confirmar quem grava e o dia da gravação",
];

export function itensPadrao(kind: ChecklistKind): string[] {
  return kind === "onboard" ? CHECKLIST_ONBOARD : CHECKLIST_PLANO;
}
