# PROJECT_CONTEXT — Regras do Sistema

Este documento é a **fonte de verdade das regras de negócio e convenções**
do sistema. Deve ser lido antes de qualquer implementação e mantido
atualizado a cada etapa.

---

## 1. Objetivo do sistema

Gerenciar todo o ciclo de produção de conteúdo de uma agência de social
media — do planejamento à publicação —, de forma que duas pessoas
consigam coordenar o trabalho sem depender de planilhas soltas.

## 2. Usuários e papéis

O sistema tem **dois usuários** no MVP, cada um com um papel
(enum `user_role` no banco):

| Usuário  | Papel (`role`) | Responsabilidades                                              |
| -------- | -------------- | -------------------------------------------------------------- |
| Vitória  | `planner`      | Pautas, roteiros, organização e agendamento das postagens.     |
| Fran     | `producer`     | Gravações, edições, ajustes e acompanhamento da publicação.    |

- Existe também o papel `admin` (gestão de usuários/config).
- Papéis controlam **visibilidade de UI** e, futuramente, permissões (RLS).
- Ambos os usuários enxergam todas as páginas no MVP; a restrição por papel
  é opcional e configurável via `lib/navigation.ts`.

## 3. Conceito central: o Conteúdo e seu pipeline

O **Conteúdo** (`contents`) é a entidade central. Todo o resto orbita em
torno dele. Um conteúdo percorre um **pipeline de status** (enum
`content_status`, valores em pt-BR):

```
Planejamento → Roteiro pronto → Aguardando gravação → Gravado →
Fila de edição → Em edição → Revisão interna → Aprovação do cliente →
Ajustes → Aprovado → Agendado → Publicado
```

Status transversais: **`Pausado`** e **`Cancelado`** (podem ocorrer a
qualquer momento).

Prioridade (enum `content_priority`): `Urgente`, `Alta`, `Média`, `Baixa`.

**Regra anti-duplicação (importante):**
As páginas **Gravações**, **Fila de edição** e **Postagens** NÃO são
entidades novas — são **visões filtradas** do pipeline de `contents`:

- **Gravações** → `status in ('Aguardando gravação', 'Gravado')`
  (ou `requires_recording = true`); usa os campos `recording_*`.
- **Fila de edição** → `status in ('Fila de edição', 'Em edição')`;
  usa `editing_queue_position`.
- **Postagens** → `status in ('Agendado', 'Publicado')`; usa
  `planned_date`, `actual_post_date`, `published_url`.

Isso evita funcionalidade duplicada: o dado vive só em `contents`.

## 4. Entidades (modelos de dados)

Schema em `supabase/migrations/`; tipos em `types/database.ts` (fonte única).
São **5 tabelas**:

- **profiles** — usuário (`id` = `auth.users.id`), `role`.
- **clients** — cliente atendido pela agência.
- **contents** — entidade central (pauta/roteiro + pipeline). Referencia
  `client_id` e os responsáveis `planner_id`, `recorder_id`, `editor_id`,
  `publisher_id`. Concentra gravação (`recording_*`), prazos (`*_deadline`),
  arquivos (`*_url`) e controle (`revision_count`, `editing_queue_position`,
  `is_fixed_date`, `is_campaign`).
- **content_history** — auditoria de alterações de campos de `contents`.
- **comments** — comentários de colaboração em um conteúdo.

> Gravação, agendamento e "tarefas" **não** têm tabela própria: gravação
> vive em `contents`; as "tarefas de cada pessoa" derivam dos campos de
> responsável (`planner_id`/`recorder_id`/`editor_id`/`publisher_id`).

Relacionamentos:

```
auth.users 1 ── 1 profiles
clients    1 ── N contents          (on delete restrict)
profiles   1 ── N contents          (responsáveis — on delete set null)
contents   1 ── N content_history   (on delete cascade)
contents   1 ── N comments          (on delete cascade)
profiles   1 ── N content_history / comments (on delete set null)
```

## 5. Páginas e responsabilidade única

| Rota              | Página          | Opera sobre                                      |
| ----------------- | --------------- | ------------------------------------------------ |
| `/login`          | Login           | Sessão (Supabase Auth)                           |
| `/dashboard`      | Dashboard       | Indicadores agregados (somente leitura)          |
| `/conteudos`      | Conteúdos       | `contents` (CRUD + pipeline)                     |
| `/clientes`       | Clientes        | `clients` (CRUD)                                 |
| `/gravacoes`      | Gravações       | `contents` (status de gravação)                  |
| `/fila-edicao`    | Fila de edição  | `contents` (status de edição)                    |
| `/postagens`      | Postagens       | `contents` (status Agendado/Publicado)           |
| `/minhas-tarefas` | Minhas tarefas  | `contents` (filtrado pelos campos de responsável)|
| `/configuracoes`  | Configurações   | `profiles` + preferências                        |

Cada página tem **uma responsabilidade**. Nenhuma duplica a função de outra:
o CRUD de conteúdo vive só em `/conteudos`; as demais páginas de pipeline são
recortes de leitura/ação sobre o mesmo dado.

## 6. Convenções de código

- **Rotas/arquivos:** `kebab-case`.
- **Componentes:** `PascalCase`.
- **Funções/variáveis:** `camelCase`, em português.
- **Tabelas/colunas do banco:** `snake_case`, em **inglês** (padrão Supabase,
  ex.: `client_id`, `created_at`). Os **valores** dos enums de status/
  prioridade ficam em pt-BR (aparecem direto na UI).
- **Datas:** trafegam como string ISO 8601; exibidas via `formatarData()`.
- **IDs:** UUID.
- **Textos de UI:** português do Brasil, sempre.
- **Classes Tailwind:** compor com `cn()` (clsx + tailwind-merge).
- **Tipos do banco:** fonte única em `types/database.ts`; rótulos/tons de UI
  (`STATUS_TONE`, `PRIORITY_TONE`, `ROLE_LABELS`, `*_OPTIONS`) em `types/index.ts`.
- **Navegação/rotas:** centralizadas em `lib/navigation.ts` (não repetir).

## 7. Arquitetura técnica

- **Next.js App Router.** Server Components por padrão; Client Components só
  quando há interatividade/estado (marcados com `"use client"`).
- **Supabase:**
  - `lib/supabase/client.ts` — navegador (Client Components).
  - `lib/supabase/server.ts` — Server Components/Actions/Route Handlers.
  - `lib/supabase/middleware.ts` — renova a sessão e **protege as rotas**
    (ativo): redireciona não autenticados para `/login` e autenticados
    para fora de `/login`. Rota pública: `/login`.
- **Autenticação (ativa):** Supabase Auth (e-mail/senha).
  - Login: `app/(auth)/login` (client) via `signInWithPassword`.
  - Logout: server action `signOutAction` (`lib/actions/auth.ts`).
  - Contexto do usuário/perfil no servidor: `getAuthContext()` (`lib/auth.ts`),
    lido pelo layout autenticado para exibir nome/papel.
  - Sessão expirada: `SessionWatcher` (client) redireciona ao `/login`.
- **Variáveis de ambiente:** apenas `NEXT_PUBLIC_*` (ver `.env.example`).
  Nunca commitar `.env.local`.

## 8. Segurança (RLS)

- **RLS habilitado em todas as tabelas** (feito na migration inicial).
- Política do MVP: **todo usuário autenticado** pode ler/escrever todos os
  registros (`for all to authenticated`). Não autenticado não tem acesso.
- Refinamentos por papel (`planner`/`producer`/`admin`) virão depois.
- Nenhuma chave secreta (`service_role`) no cliente.
- Detalhes de execução da migration e cadastro de usuários: `supabase/README.md`.

## 9. Design e responsividade

- Layout com **sidebar fixa no desktop** e **drawer no mobile**.
- Mobile-first; testar em telas pequenas.
- Design system mínimo em `components/ui` (Button, Card, Badge) — reusar
  sempre, não recriar estilos avulsos.

## 10. Processo de trabalho (regra de ouro)

O desenvolvimento avança **etapa por etapa**. **Nunca** avançar para a
próxima etapa sem confirmar explicitamente:

1. O que foi implementado.
2. Quais arquivos foram criados/modificados.
3. Se o **lint** passou.
4. Se os **testes** passaram.
5. Se o **build** passou.
6. Quais **pendências** ficaram.

Sequência planejada: Etapas 1–10 → Dashboard → Tarefas → Histórico →
Design → Testes → Deploy (detalhado no README).
