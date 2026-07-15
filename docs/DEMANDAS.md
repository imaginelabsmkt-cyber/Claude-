# Demandas e Roadmap (Imagine)

> Este arquivo registra as decisões e os pedidos do cliente para o sistema.
> Serve como **memória permanente**: mesmo que a conversa reinicie, tudo o
> que foi combinado está aqui. Ao retomar, leia este arquivo primeiro.

Última atualização: sessão de implementação inicial.

---

## ✅ Já implementado

- Autenticação (login/logout, papéis planner/producer/admin) e proteção de rotas.
- Clientes: CRUD, **nicho**, **meta de conteúdos por mês** (substituiu a
  frequência semanal), cor, soft-delete.
- Conteúdos: tabela geral, filtros, busca, status/prioridade rápidos.
- Regras de negócio (próxima ação, responsável, atraso, prazo, motivo da
  prioridade) + testes.
- Painel do cliente com indicadores/seções por status + **calendário mensal**
  (conteúdos nos dias em que saem, navegação entre meses).
- Gravações (Fran), Fila de edição (drag-and-drop), Postagens (semana/mês),
  Dashboard, Minhas tarefas.
- Histórico automático de alterações + comentários.
- **Cadastro de conteúdo enxuto** (só o essencial; detalhes vêm por etapa).
- **Importar planejamento (.docx)**: lê o documento verticalizado da Vitória,
  detecta cada conteúdo (título, formato, semana, data, local, vestimenta,
  participantes, link), captura **roteiro** e **legenda**, mostra prévia
  editável e cria todos. Página do conteúdo exibe Roteiro e Legenda.
- **Excluir conteúdo** e **apagar planejamento do mês** (com confirmação).
- **Calendário do cliente visual**: chips coloridos por formato (ícone +
  legenda), legível para print, e **arrastar-e-soltar** para mudar a data.
- **Roteiro formatado**: falas, cenas e títulos exibidos com estilo de roteiro
  (não mais um bloco de texto cru).
- **Planilha editável de conteúdos**: edição inline de título, formato, semana,
  data, status, prioridade e responsável (por etapa), sem abrir o conteúdo.
  Usada na lista geral e na página do cliente. O título é link (abre o
  conteúdo) com lápis para editar inline.
- **Painel de roteiro/legenda/stories**: legenda sempre visível com botão
  **Copiar**; roteiro em tabela (curto e expansível); direcionamento de
  stories separado em tabela própria.
- **Preenchimento por etapa**: na página do conteúdo, painéis Gravação /
  Edição / Postagem, cada um com só os campos daquela etapa, salvando na
  hora. A etapa atual (pelo status) já vem aberta e destacada.
- **Página do cliente enxuta**: acompanhamento **semanal** no topo, resumo
  compacto do mês e a planilha editável como ferramenta principal.
- **Calendário semanal** (uma semana por vez, colunas largas e legíveis,
  arrastar entre dias) — substituiu o mensal.
- **Roteiro em tabela de 2 colunas** (OFF/LETTERING | CENAS), igual ao
  planejamento da Vitória. Stories em tabela própria; legenda com copiar.
- **Título normalizado** na importação (Title Case pt-BR, conectivos em
  minúsculo).
- **Referência (Instagram/TikTok)** do planejamento: campo próprio
  (`reference_url`), importado e mostrado em destaque no conteúdo com
  abrir/copiar (usado na edição).

## 🧭 Faxina de design/intuitividade (em andamento)
Feito:
- **Prioridade colorida** (Urgente vermelho, Alta laranja, Média amarelo,
  Baixa cinza).
- **Etapas de produção** abrem as três por padrão (atual destacada).
- **Empty states com ação** (+ Novo conteúdo / Importar).
- **Quadro Kanban** por fase (arrastar muda o status).
- **Botão de ação contextual + menu ⋮** (avança o pipeline; editar/excluir
  no menu) nos cards e na ficha do conteúdo.
- **Dashboard só leitura + atalhos** (Próximas postagens virou lista
  compacta; removida a tabela operacional pesada).
- Removido código morto (ContentsTable, DeleteContentButton).

Pendente da faxina: revisar telas Gravações / Fila / Postagens com o mesmo
padrão de card + ação contextual (usar quando o cliente pedir).

## ⚠️ Comando pendente no banco (rodar no Supabase se ainda não rodou)

```sql
-- roteiro e legenda dos conteúdos
alter table public.contents add column if not exists script text;
alter table public.contents add column if not exists caption text;
-- link de referência (Instagram/TikTok)
alter table public.contents add column if not exists reference_url text;
```

## ⏳ Demandas pendentes (prioridade)

1. **Calendário compartilhável para WhatsApp** (ver ideias futuras).

## 🔮 Ideias futuras (depois)

- **Calendário compartilhável para WhatsApp**: link só-leitura por cliente
  (ou imagem exportável) para fixar no grupo; reflete ajustes automaticamente.
- **Área do cliente**: login separado onde o cliente vê só os conteúdos dele
  (visualização, sem mexer na produção interna).

## 📌 Decisões importantes (não esquecer)

- Nome da aplicação: **Imagine**.
- Medição de conteúdo é **por mês** (contrato mensal), não por semana.
- A Vitória entrega o planejamento em **.docx verticalizado**; o sistema
  importa. Formato reconhecido: `SEMANA N`, `CONTEÚDO N:`, `DATA DA POSTAGEM:`,
  `LOCAL:`, `VESTIMENTA:`, `PARTICIPANTES:`, `REFERÊNCIA:`/`LINK:`, `OBS:`,
  `LEGENDA:`, `DIRECIONAMENTO DE STORIES`.
- Conteúdos importados entram com status **"Roteiro pronto"**.
- Toda alteração é registrada no histórico (imutável).

## Usuários (Supabase Auth)

- Vitória — `vitoriafeltrin7@gmail.com` — papel **planner**.
- Fran — `francienyb@gmail.com` — papel **producer**.
