# Agência Social — Sistema de Gestão de Produção de Conteúdo

Dois sistemas para tocar uma agência de social media, com um login só:

- **Demandas** — a produção de conteúdo dos clientes, do planejamento à
  publicação.
- **Interno** (`/interno`) — a administração da empresa: comercial,
  financeiro, pessoas, contábil e administrativo.

A tela inicial pergunta em qual você quer entrar. Usado por duas pessoas
com papéis distintos:

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
│   │   ├── financeiro/           # Fluxo de caixa (painel, lançamentos,
│   │   │                         #   fluxo, resumo anual, recorrências)
│   │   └── configuracoes/        # Perfil e preferências
│   ├── layout.tsx                # Layout raiz (html/body, fonte, metadata)
│   ├── page.tsx                  # Redireciona para /dashboard
│   └── globals.css               # Tailwind + estilos base
├── components/
│   ├── ui/                       # Primitivos: Button, Card, Badge
│   ├── shared/                   # StatusBadge, EmptyState
│   └── layout/                   # Sidebar, Topbar, AppShell, PageHeader, NavIcon
├── lib/
│   ├── financeiro/               # Regras puras do financeiro
│   │                             #   (cálculo, meses, valores) + testes
│   ├── supabase/                 # client (browser), server, middleware
│   ├── navigation.ts             # Definição central do menu/rotas
│   └── utils.ts                  # cn(), formatarData()
├── types/
│   ├── database.ts               # Tipos do banco (fonte única, espelha o schema)
│   └── index.ts                  # Reexporta database + rótulos/tons de UI
├── supabase/
│   ├── migrations/               # Migrations SQL (schema, RLS, triggers)
│   ├── seed.sql                  # Usuários de exemplo (opcional)
│   ├── seed_financeiro.sql       # Carga da planilha 2026 (opcional)
│   └── README.md                 # Como rodar a migration e cadastrar usuários
├── middleware.ts                 # Renova sessão Supabase (proteção de rotas na etapa de auth)
├── .env.example                  # Modelo de variáveis de ambiente
├── PROJECT_CONTEXT.md            # Regras de negócio e convenções
└── README.md
```

## Sistema interno (`/interno`)

A administração da empresa, separada da produção de conteúdo. Cinco áreas,
cada uma com a sua cor — e **a cor diz de onde o dado vem**:

| Área | Cor | Tela |
| --- | --- | --- |
| Início | grafite | O que tem prazo hoje, de todas as áreas juntas |
| Comercial | vinho | Carteira de clientes, funil de oportunidades e propostas |
| Financeiro | petróleo | Fluxo de caixa (detalhado abaixo) |
| Pessoas | lilás | Quem é a equipe, quanto cada um custa |
| Contábil | azul | DAS, contabilidade e prazos com o governo |
| Administrativo | ocre | Ferramentas, contratos e documentos da empresa |

Na tela **Início**, cada linha carrega a tarja e a etiqueta da área de onde
veio — você reconhece a origem antes de ler o texto. O vermelho fica fora
desse jogo: significa sempre "venceu ou está vencendo".

Pessoas, Contábil e Administrativo não guardam dados próprios: são recortes
das categorias do financeiro. Um número só para a empresa inteira.

### Pessoas e renovações

**Pessoas** deixou de ser só um total: agora tem o cadastro de quem recebe
da agência — sócias, freelancers, prestadores — e cada pagamento do
financeiro pode apontar para uma pessoa. A tela mostra quanto cada uma
custou no mês e no ano, e avisa quando sobrou pagamento sem dono.

O cadastro de quem **recebe** é separado de quem **faz login**: um
freelancer que edita um vídeo nunca vai precisar de senha.

**Renovação de contrato.** Como o contrato é a mensalidade recorrente, a
data de fim da vigência vira aviso no Início 45 dias antes. Contrato sem
prazo não avisa (não tem fim), e contrato que já venceu e continua ativo é
o mais urgente — a mensalidade segue sendo gerada sem contrato que a
sustente.

### Documentos e prazos

**Contratos e documentos.** O contrato assinado de um cliente é um arquivo
do cliente: anexe na ficha dele e marque o tipo como *Contrato* — ele passa
a aparecer também em Administrativo, sem deixar de estar lá. Documento da
empresa (contrato social, CNPJ, alvará) vai direto no Administrativo. Os
dois ficam em armazenamento privado: o download sai por link que expira em
um minuto.

**Prazos que não são despesa.** A declaração anual do Simples, a renovação
do alvará. Você cadastra a periodicidade (mensal, trimestral, anual ou uma
única vez) e o dia; o sistema calcula o vencimento, avisa com a
antecedência que você escolher e aparece no Início junto das pendências
financeiras. Marcar como feito é um clique, e não dá para marcar o mesmo
período duas vezes.

DAS e contabilidade **não** entram aqui — são despesa, e já vêm do
financeiro.

### O funil fecha o ciclo

Em **Comercial → Funil**, as oportunidades andam por arrasto: contato feito →
diagnóstico → proposta enviada → negociação. Cada uma mostra há quantos dias
está parada, e fica vermelha quando passa do prazo da etapa.

Ganhar não é arrasto — é um botão que pede os dados do contrato e então, de
uma vez só:

- cria o **cliente** (que já serve ao sistema de demandas);
- cadastra a **mensalidade** no financeiro, com vigência;
- lança a **entrada/setup**, se a proposta cobrava.

Daí em diante o "Gerar do plano fixo" cria aquela mensalidade todo mês
sozinho, e a data de fim da vigência vira o alerta de renovação no Início.
Nada é redigitado.

## Módulo financeiro

Substitui a planilha "Fluxo de Caixa Imagine Labs 2026" — mesmas contas,
sem as fórmulas que quebram quando alguém insere uma linha.

| Tela                       | Para quê                                              |
| -------------------------- | ----------------------------------------------------- |
| `/interno/financeiro`      | Como está o mês: saldo, resultado, a receber e a pagar |
| `/interno/financeiro/lancamentos` | Lançar entradas/saídas e dar baixa no que foi pago     |
| `/interno/financeiro/fluxo-caixa` | Conferir o mês linha a linha (formato da planilha)     |
| `/interno/financeiro/resumo-anual` | O ano inteiro: categoria × mês, com saldo acumulado    |
| `/interno/financeiro/recorrencias` | Mensalidades e custos fixos que se repetem             |
| `/interno/financeiro/categorias` | Categorias e saldo inicial da série                    |

### O que muda em relação à planilha

- **As mensalidades não são redigitadas todo mês.** Cada uma é cadastrada
  uma vez em *Recorrências*; o botão **"Gerar do plano fixo"** cria os
  lançamentos do mês. Clicar duas vezes não duplica nada (o banco garante).
- **O saldo se encadeia sozinho.** O saldo final de um mês é o inicial do
  seguinte — sem `=Abril!B80` apontando para a célula errada.
- **"Pago" e "Pendente" passam a valer.** Pendências ficam em *a receber* e
  *a pagar* e não entram no realizado; o saldo projetado mostra o cenário
  com tudo confirmado.
- **Cada receita pode ser ligada a um cliente**, o que dá o faturamento por
  cliente sem nenhum trabalho extra.

### Carregar o histórico de 2026

O arquivo `supabase/seed_financeiro.sql` traz **149 lançamentos de abril a
setembro/2026** e os 15 clientes que passaram pela agência no período. Os
totais de cada mês conferem com os da planilha original. É opcional e
seguro: não faz nada se já houver lançamentos cadastrados.

O recorte é proposital:

- **Outubro a dezembro não entram.** Na planilha esses meses eram cópia da
  carteira antiga (14 clientes), e a maioria não renovou. Ficam limpos para
  serem montados pelo botão *"Gerar do plano fixo"*.
- **Só os 6 clientes da carteira atual entram como ativos** (Kiku Sushi,
  Laura Chioquetta, Malukies, Natural Concept, Izabela, Osteo&Fit). Os
  outros 9 são criados como inativos: o histórico deles é preservado, mas
  não geram mensalidade.
- **As recorrências valem a partir de outubro/2026**: as 6 mensalidades
  vigentes (R$ 11.150/mês) e os 12 custos fixos (R$ 14.186,55/mês).

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

> **Todas as funcionalidades planejadas estão implementadas.** O próximo
> passo é o deploy — ver **[docs/DEPLOY_VERCEL.md](./docs/DEPLOY_VERCEL.md)**.

> As regras completas de negócio estão em **[PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)**.
