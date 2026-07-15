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

## ⚠️ Comando pendente no banco (rodar no Supabase se ainda não rodou)

```sql
-- roteiro e legenda dos conteúdos
alter table public.contents add column if not exists script text;
alter table public.contents add column if not exists caption text;
```

## ⏳ Demandas pendentes (prioridade)

1. **Conteúdos — "planilha" editável e interativa**
   - A tabela de conteúdos do cliente deve permitir **editar cada campo na
     hora**, sem abrir o conteúdo: responsável, prazo, próxima ação, status,
     prioridade.
   - Reduzir a rolagem horizontal no notebook (ações/responsáveis visíveis).
   - Permitir **arrastar** para reorganizar.
   - Objetivo: "tudo editável" para valer a pena o uso.

2. **Conteúdos — preenchimento por ETAPA (Parte 2)**
   - Na página do conteúdo, preencher os dados **na hora certa**:
     - Etapa gravação → data da gravação, local, participantes, roupa,
       materiais (edição focada só dessa seção).
     - Etapa edição → prazos e links de edição.
     - Etapa postagem → link publicado, data real.
   - Nada de pedir tudo de uma vez. (A Parte 1 — cadastro enxuto — já foi feita.)

3. **Conteúdos — revisão de design**
   - As listas "falta gravar / já gravado / fila de edição" estão pouco
     interessantes; deixar mais visual/interativo (ideia: formato de planilha).

4. **Filtros do painel do cliente**
   - Manter só o **mês** (que controla o calendário). Status/formato/semana
     ficam apenas na lista geral de Conteúdos. (Em andamento/feito.)

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
