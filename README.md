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

## Deploy (Vercel)

1. Conecte o repositório na Vercel.
2. Defina as variáveis `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` no painel do projeto.
3. O build usa `npm run build` (padrão Next.js) — sem configuração extra.

## Plano de implementação (etapas)

O projeto é construído **etapa por etapa**. Cada etapa só avança após
confirmação de: o que foi feito, arquivos alterados, lint, testes, build e
pendências.

- **Etapa 1 — Fundação ✅:** arquitetura, estrutura de pastas, páginas
  (esqueleto), componentes reutilizáveis, tipos, README e PROJECT_CONTEXT.
- **Etapa 2 — Banco de dados ✅:** schema no Supabase (5 tabelas, ENUMs,
  relacionamentos, índices, triggers, RLS), seed e tipos TypeScript.
  Ver **[supabase/README.md](./supabase/README.md)**.
- **Etapa 3 — Autenticação:** Supabase Auth (login/logout), proteção de
  rotas real, obtenção do usuário e papel.
- **Etapa 4 — Clientes:** CRUD completo de clientes.
- **Etapa 5 — Conteúdos:** CRUD + pipeline (mudança de status) + filtros.
- **Etapa 6 — Gravações e Fila de edição:** visões do pipeline + registros.
- **Etapa 7 — Postagens:** agendamento e publicação.
- **Etapa 8 — Dashboard:** indicadores e listas dinâmicas.
- **Etapa 9 — Minhas tarefas:** CRUD de tarefas e atribuições.
- **Etapa 10 — Configurações, testes, polimento de design, deploy.**

> As regras completas de negócio estão em **[PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)**.
