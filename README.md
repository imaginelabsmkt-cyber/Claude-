# Agência Social — Sistema de Gestão de Produção de Conteúdo

Sistema web para gerenciar a produção de conteúdo de uma agência de social
media, do planejamento à publicação. Usado por duas pessoas com papéis
distintos:

- **Vitória** — planejamento, pautas, roteiros e organização das postagens.
- **Fran** — gravações, edições, ajustes e acompanhamento da publicação.

## Tecnologias

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** (design system próprio, responsivo desktop/mobile)
- **Supabase** (banco de dados Postgres) + **Supabase Auth**
- **Deploy na Vercel**
- Interface em **português do Brasil**

## Estrutura de pastas

```
.
├── app/
│   ├── (auth)/
│   │   └── login/                # Tela de login (pública)
│   ├── (dashboard)/              # Grupo de rotas autenticadas
│   │   ├── layout.tsx            # Shell (sidebar + topbar)
│   │   ├── dashboard/            # Visão geral
│   │   ├── conteudos/            # Pautas/roteiros — entidade central
│   │   ├── clientes/             # Cadastro de clientes
│   │   ├── gravacoes/            # Conteúdos em captação (visão do pipeline)
│   │   ├── fila-edicao/          # Conteúdos em edição (visão do pipeline)
│   │   ├── postagens/            # Agendamento/publicação
│   │   ├── minhas-tarefas/       # Tarefas do usuário
│   │   └── configuracoes/        # Perfil e preferências
│   ├── layout.tsx                # Layout raiz (html/body, fonte, metadata)
│   ├── page.tsx                  # Redireciona para /dashboard
│   └── globals.css               # Tailwind + estilos base
├── components/
│   ├── ui/                       # Primitivos: Button, Card, Badge
│   ├── shared/                   # StatusBadge, EmptyState
│   └── layout/                   # Sidebar, Topbar, AppShell, PageHeader, NavIcon
├── lib/
│   ├── supabase/                 # client (browser), server, middleware
│   ├── navigation.ts             # Definição central do menu/rotas
│   └── utils.ts                  # cn(), formatarData()
├── types/
│   ├── database.ts               # Tipos do banco (fonte única, espelha o schema)
│   └── index.ts                  # Reexporta database + rótulos/tons de UI
├── supabase/
│   ├── migrations/               # Migrations SQL (schema, RLS, triggers)
│   ├── seed.sql                  # Usuários de exemplo (opcional)
│   └── README.md                 # Como rodar a migration e cadastrar usuários
├── middleware.ts                 # Renova sessão Supabase (proteção de rotas na etapa de auth)
├── .env.example                  # Modelo de variáveis de ambiente
├── PROJECT_CONTEXT.md            # Regras de negócio e convenções
└── README.md
```

## Convenções de nomenclatura

- **Rotas e arquivos**: `kebab-case` (ex.: `fila-edicao`, `minhas-tarefas`).
- **Componentes React**: `PascalCase` (ex.: `PageHeader`, `StatusBadge`).
- **Funções/variáveis**: `camelCase`, em português (ex.: `formatarData`).
- **Campos de dados/tipos de domínio**: `snake_case`, em português
  (compatível com Postgres/Supabase — ex.: `criado_em`, `cliente_id`).
- **Textos de interface**: sempre em português do Brasil.

## Como rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
#   preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Ambiente de desenvolvimento
npm run dev            # http://localhost:3000
```

Scripts disponíveis:

| Comando            | Descrição                        |
| ------------------ | -------------------------------- |
| `npm run dev`      | Servidor de desenvolvimento      |
| `npm run build`    | Build de produção                |
| `npm run start`    | Sobe o build de produção         |
| `npm run lint`     | ESLint (next lint)               |
| `npm run typecheck`| Checagem de tipos (`tsc`)        |
| `npm test`         | Testes unitários (Vitest)        |

## Variáveis de ambiente

O sistema usa **duas** variáveis (ver `.env.example`):

| Variável | Descrição |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública `anon` do Supabase |

Opcional: `NEXT_PUBLIC_SITE_URL` (domínio da aplicação, para recursos futuros
de auth por link). **Nunca** use a chave `service_role` no cliente.

## Deploy (Vercel) e produção

Guias completos na pasta [`docs/`](./docs):

- **[Deploy na Vercel](./docs/DEPLOY_VERCEL.md)** — publicar o sistema do zero
  (Supabase + Vercel), passo a passo.
- **[Primeiro acesso](./docs/PRIMEIRO_ACESSO.md)** — como começar a usar.
- **[Backup do Supabase](./docs/BACKUP_SUPABASE.md)** — proteger os dados.

Resumo: conecte o repositório na Vercel, cadastre as duas variáveis de
ambiente e clique em Deploy — a Vercel detecta o Next.js automaticamente
(`npm run build`, sem configuração extra). Todo `git push` refaz o deploy.

## Plano de implementação (etapas)

O projeto é construído **etapa por etapa**. Cada etapa só avança após
confirmação de: o que foi feito, arquivos alterados, lint, testes, build e
pendências.

- **Etapa 1 — Fundação ✅:** arquitetura, estrutura de pastas, páginas
  (esqueleto), componentes reutilizáveis, tipos, README e PROJECT_CONTEXT.
- **Etapa 2 — Banco de dados ✅:** schema no Supabase (5 tabelas, ENUMs,
  relacionamentos, índices, triggers, RLS), seed e tipos TypeScript.
  Ver **[supabase/README.md](./supabase/README.md)**.
- **Etapa 3 — Autenticação ✅:** Supabase Auth (login/logout), proteção de
  rotas real (middleware), obtenção do usuário e papel (profiles).
- **Etapa 4 — Clientes ✅:** CRUD (sem exclusão definitiva — soft-delete via
  `active`), busca por nome, filtro ativos/inativos, página individual e
  formulário reutilizável validado com Zod.
- **Etapa 5 — Conteúdos ✅:** tabela geral, criar/editar, página individual,
  filtros (cliente/status/prioridade/formato/mês/semana), busca por título e
  alteração rápida de status/prioridade. Regras derivadas (próxima ação,
  responsável, prazo) centralizadas em `lib/rules/contents.ts`.
- **Etapa 6 — Regras de negócio ✅:** camada central (`lib/rules/contents.ts`)
  para próxima ação, responsável atual, atraso, prazo principal e motivo da
  prioridade, com testes unitários (Vitest).
- **Etapa 7 — Painel operacional do cliente ✅:** cards e seções por status
  com dados reais, filtros e tabela completa.
- **Etapa 8 — Gravações ✅:** conteúdos que precisam de gravação agrupados
  (atrasadas, da semana, próximas, já gravados) com ações rápidas.
- **Etapa 9 — Fila de edição ✅:** ordenação automática (9 critérios) e
  reordenação manual por drag-and-drop (`@dnd-kit`, `editing_queue_position`).
- **Etapa 10 — Postagens ✅:** visões semana/mês, arrastar entre dias
  (registra histórico) e calendário com contagem por dia.
- **Etapa 11 — Dashboard ✅:** cards clicáveis, "Atenção esta semana",
  próximas postagens, resumo por cliente e 2 gráficos.

- **Etapa 12 — Minhas tarefas ✅:** visão por papel (planner/producer/admin)
  com ações por tarefa.
- **Etapa 13 — Histórico e comentários ✅:** registro automático de
  alterações (imutável) e comentários por conteúdo.
- **Etapa 14 — Preparação de deploy ✅:** variáveis revisadas, build de
  produção e guias (Vercel, primeiro acesso, backup) em `docs/`.

- **Etapa 15 — Revisão visual e acessibilidade ✅:** tabelas viram cards no
  celular, foco por teclado, `aria-current`, contraste (WCAG AA).
- **Etapa 16 — Configurações ✅:** edição do próprio perfil e sessão.

- **Etapa 17 — Cobrança de tráfego ✅:** módulo de cobranças semanais
  (Pix + WhatsApp). Envio do seu número, controle de pagamento (marcação
  manual) e lembretes automáticos de atraso. Automação por cron
  (`vercel.json`) e WhatsApp com modo de teste embutido. Guia:
  **[docs/TRAFEGO.md](./docs/TRAFEGO.md)**.

> **Todas as funcionalidades planejadas estão implementadas.** O próximo
> passo é o deploy — ver **[docs/DEPLOY_VERCEL.md](./docs/DEPLOY_VERCEL.md)**.

> As regras completas de negócio estão em **[PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)**.
