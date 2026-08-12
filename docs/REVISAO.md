# Revisão do sistema — seção por seção (para retomar e usar)

> Objetivo: deixar o Imagine o mais **limpo, intuitivo, com menos cliques e mais
> aparente** para a Fran e a Vitória. Este documento organiza a análise por
> seção. Marcar `[ ]` → `[x]` conforme formos executando.

Legenda de esforço: 🟢 rápido · 🟡 médio · 🔴 projeto.

---

## Prioridades que cruzam o site inteiro (fazer primeiro)

- [ ] 🟢 **Aviso "Salvo / Erro" (toast)**: hoje a planilha e os status salvam
  calados; se falhar, a mudança some no refresh e a pessoa acha que salvou.
  É o que mais protege a confiança na ferramenta.
- [ ] 🟢 **Menu e tela inicial por papel**: Fran entra e cai em "Minhas
  tarefas"; Vitória em "Conteúdos". Esconder do menu o que cada uma não usa
  (a função `navegacaoPara` já existe, só ligar).
- [ ] 🟡 **Cards operacionais unificados** (o mockup): 1 botão principal
  contextual + menu ⋮ + cor de prioridade, iguais em Gravações, Fila e Tarefas.
- [ ] 🟡 **Planilha em cartão no celular**: hoje vira scroll lateral apertado.
- [ ] 🟢 **Feedback de carregando** ao trocar filtro/semana (parece travado).

---

## 1. Login
Estado: funciona. 
- [ ] 🟢 Mensagens de erro claras (e-mail/senha errados) e link "esqueci a senha".
- [ ] 🟢 Confirmar redirecionamento pós-login por papel (ver prioridade acima).

## 2. Dashboard
Estado: já enxuto (números + "atenção esta semana" + próximas postagens).
- [ ] 🟢 Formatar mês "2026-07" → "Julho 2026" onde aparece cru.
- [ ] 🟡 Avisos ativos: badge de contagem no menu ("Atrasados 2") e banner de
  itens vencendo hoje/amanhã (hoje só quem abre o Dashboard vê).

## 3. Conteúdos (planilha editável)
Estado: bom núcleo (edita na linha, salva sozinho, abre pelo título).
- [ ] 🟢 Rótulo por linha na coluna "Responsável" (Gravação/Edição/Postagem) —
  hoje o cabeçalho só diz "Responsável" e confunde.
- [ ] 🟢 Filtro "Responsável" + atalho "Só os meus".
- [ ] 🟡 Modo cartão no celular (ver prioridade).
- [ ] 🟡 Atribuir responsável/semana/status em massa (checkbox + barra de ação),
  principalmente logo após importar um planejamento.

## 4. Quadro (Kanban)
Estado: colunas por fase, arrasta pra mudar status.
- [ ] 🟢 Arrastar por teclado (acessibilidade) e toque mais firme no celular.
- [ ] 🟢 Filtro por cliente no topo do quadro.

## 5. Clientes (calendário semanal + planilha)
Estado: semana no topo, resumo do mês, planilha embaixo.
- [ ] 🟡 No celular, vista de "lista por dia" como alternativa às 7 colunas.
- [ ] 🟢 Meta do mês: revisar quando a semana cruza a virada de mês (mostra o mês
  vizinho).

## 6. Ficha do conteúdo
Estado: resumo + roteiro/legenda/stories em tabela + produção por etapa + referência.
- [ ] 🟢 Editar "Referência" também no formulário completo (hoje só no painel).
- [ ] 🟢 Painel "Roteiro/Planejamento" com prazo do roteiro (`script_deadline`
  hoje não tem onde editar) — etapa da Vitória.
- [ ] 🟢 Botão "Enviar no WhatsApp" da legenda / do briefing de gravação.
- [ ] 🟢 Contador de comentários não lidos.

## 7. Gravações (Fran)
Estado: cards com vários botões competindo.
- [ ] 🟡 Aplicar o card unificado (botão contextual + ⋮).
- [ ] 🟢 Esconder campos vazios ("—") e mostrar "+ detalhes".
- [ ] 🟢 Botão "Limpar filtros" e destaque quando há filtro ativo.
- [ ] 🟢 "Já gravados" para de acumular itens que já passaram da edição.

## 8. Fila de edição
Estado: arrasta pra ordenar, auto-ordenação.
- [ ] 🟡 Card unificado + ação contextual (hoje até 3 botões iguais).
- [ ] 🟢 Rótulos de ação por fonte única ("Enviar p/ edição" em todo lugar).

## 9. Postagens
Estado: semana/mês, arrasta entre dias.
- [ ] 🟢 Remover repetição entre "atrasadas" e "antecipáveis".
- [ ] 🟡 Convergir o calendário de postagens com o calendário do cliente (hoje
  são dois componentes de semana diferentes).

## 10. Minhas tarefas
Estado: agrupa gravações/fila/edição da pessoa.
- [ ] 🟡 Usar o mesmo card das outras telas (hoje é um terceiro visual).
- [ ] 🟢 Empty state com ação ("Nada pra hoje — ver todos os conteúdos").

## 11. Configurações
Estado: perfil + sessão.
- [ ] 🟢 Já alinhei o rótulo. Avaliar: trocar senha pelo app; preferências
  (tela inicial, avisos).

## 12. Importação de planejamento (.docx)
Estado: lê o doc da Vitória, separa conteúdos, roteiro, legenda, stories.
- [ ] 🟢 Após importar, ir direto para "atribuir responsáveis em massa".
- [ ] 🟢 Prévia mostrando o que NÃO foi reconhecido (para a Vitória ajustar o doc).

---

## Projetos maiores (decidir quando)
- [ ] 🔴 **Calendário compartilhável por link** (WhatsApp) só-leitura por cliente.
- [ ] 🔴 **Portal do cliente** (ver/aprovar) — evolução do link público.
- [ ] 🔴 **Avisos por e-mail/push** de prazo e de "Ajustes"/comentário.
- [ ] 🟡 **Desfazer / lixeira** para exclusões (apagar planejamento do mês não
  tem como desfazer).

---

## Já corrigido nesta rodada de revisão (não repetir)
Fuso horário, detecção de formato na importação, limpar data na planilha,
histórico de responsável, posição da fila ao sair, busca com curinga, cor de
prioridade em todos os cards, segurança (RLS de perfis/histórico/comentários,
limite de upload, guard de sessão), código morto e duplicações menores.

## Migrations a rodar no Supabase
`script`/`caption`/`reference_url` e `20260716120000_hardening_rls.sql`.
