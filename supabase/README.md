# Banco de Dados (Supabase)

Modelo de dados do sistema de gestão de produção de conteúdo. Esta pasta
contém **apenas o schema** — nenhuma tela depende disto ainda.

```
supabase/
├── migrations/
│   └── 20260714120000_initial_schema.sql   # schema completo
├── seed.sql                                 # usuários de exemplo (opcional)
├── seed_financeiro.sql                      # carga da planilha 2026 (opcional)
└── README.md                               # este arquivo
```

## Tabelas criadas

| Tabela            | Descrição                                                    |
| ----------------- | ------------------------------------------------------------ |
| `profiles`        | Perfil do usuário (1:1 com `auth.users`).                    |
| `clients`         | Clientes atendidos pela agência.                             |
| `contents`        | Conteúdos — entidade central do pipeline.                    |
| `content_history` | Auditoria de alterações de campos de `contents`.             |
| `comments`        | Comentários de colaboração em um conteúdo.                   |
| `financial_settings`    | Linha única: saldo inicial e mês de partida da série.  |
| `financial_categories`  | Categorias de receita/despesa (linhas do resumo anual).|
| `financial_entries`     | Lançamentos do fluxo de caixa (entrada/saída por mês). |
| `financial_recurrences` | Mensalidades e custos fixos que se repetem todo mês.   |
| `commercial_leads`      | Oportunidades do funil comercial.                      |
| `commercial_proposals`  | Propostas enviadas a uma oportunidade.                 |

### Tipos ENUM

- `user_role`: `planner`, `producer`, `admin`
- `content_status`: `Planejamento`, `Roteiro pronto`, `Aguardando gravação`,
  `Gravado`, `Fila de edição`, `Em edição`, `Revisão interna`,
  `Aprovação do cliente`, `Ajustes`, `Aprovado`, `Agendado`, `Publicado`,
  `Pausado`, `Cancelado`
- `content_priority`: `Urgente`, `Alta`, `Média`, `Baixa`
- `financial_kind`: `Receita`, `Despesa`
- `financial_status`: `Pago`, `Pendente`
- `lead_stage`: `Contato feito`, `Diagnóstico`, `Proposta enviada`,
  `Negociação`, `Fechado`, `Perdido`
- `proposal_status`: `Rascunho`, `Enviada`, `Aceita`, `Recusada`

### Relacionamentos

```
auth.users 1 ── 1 profiles
clients    1 ── N contents           (on delete restrict)
profiles   1 ── N contents           (planner/recorder/editor/publisher — on delete set null)
contents   1 ── N content_history    (on delete cascade)
contents   1 ── N comments           (on delete cascade)
profiles   1 ── N content_history    (on delete set null)
profiles   1 ── N comments           (on delete set null)
```

### Automações (triggers)

- `updated_at` é atualizado automaticamente em `profiles`, `clients` e
  `contents` (função `set_updated_at`).
- Ao criar um usuário no Auth, um `profile` é criado automaticamente
  (função `handle_new_user`, lê `name`/`role` de `raw_user_meta_data`).

### Segurança (RLS)

- **Row Level Security habilitado em todas as tabelas.**
- Política do MVP: **todo usuário autenticado** pode **ler e editar** todos
  os registros (`for all to authenticated using (true) with check (true)`).
- Usuários **não autenticados não têm acesso** a nenhum registro.
- Refinamentos por papel (`planner`/`producer`/`admin`) serão adicionados
  em etapas futuras.

---

## Como executar a migration

Escolha **uma** das opções abaixo.

### Opção A — Supabase CLI (recomendada p/ desenvolvimento)

Pré-requisito: [Supabase CLI](https://supabase.com/docs/guides/cli) instalado.

```bash
# 1. Fazer login e vincular ao projeto (uma vez)
supabase login
supabase link --project-ref SEU_PROJECT_REF

# 2a. Ambiente LOCAL (sobe Postgres em Docker, aplica migrations + seed)
supabase start
supabase db reset          # aplica migrations/ e depois seed.sql

# 2b. OU aplicar as migrations no projeto REMOTO (nuvem)
supabase db push           # aplica apenas as migrations (não roda seed)
```

### Opção B — SQL Editor do Supabase (sem CLI)

1. Abra o painel do projeto em https://supabase.com.
2. Vá em **SQL Editor**.
3. Cole o conteúdo de `migrations/20260714120000_initial_schema.sql` e
   execute (**Run**).
4. (Opcional) Cole `seed.sql` e execute para criar Fran e Vitória.

### Opção C — psql

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260714120000_initial_schema.sql
psql "$DATABASE_URL" -f supabase/seed.sql   # opcional
```

> A migration é **idempotente** (usa `if not exists` / `create or replace` /
> `drop ... if exists`), então pode ser reexecutada sem erro.

---

## Como cadastrar Fran e Vitória depois

Os perfis (`profiles`) são criados automaticamente a partir de usuários do
Auth. Há três caminhos:

### 1. Seed de desenvolvimento (rápido, sem senha)

Rode `seed.sql` (Opção A/B/C acima). Ele cria os dois usuários com
`role` correto, **mas sem senha** — eles ainda não conseguem logar. Para
habilitar o login, defina uma senha:

- Painel > **Authentication > Users** > selecione o usuário > **Send
  password recovery** (ou "Reset password"), ou
- Recrie o usuário pela Opção 2 abaixo definindo uma senha.

### 2. Convite/criação pelo painel (produção)

1. Painel > **Authentication > Users** > **Add user** (ou **Invite**).
2. Informe o e-mail. Em **User metadata**, adicione:
   ```json
   { "name": "Vitória", "role": "planner" }
   ```
   e para a Fran: `{ "name": "Fran", "role": "producer" }`.
3. Ao ser criado, o trigger `handle_new_user` gera o `profile`
   automaticamente com o papel informado.

### 3. Autocadastro (após a etapa de autenticação)

Quando a tela de cadastro estiver pronta, o usuário se registra por
e-mail/senha; o `profile` é criado pelo trigger (papel padrão `producer`,
ajustável por um `admin`).

> **Papéis:** `planner` (Vitória — planejamento/roteiro), `producer` (Fran —
> gravação/edição/publicação) e `admin` (gestão). O papel de um usuário pode
> ser ajustado a qualquer momento na tabela `profiles`.


## Módulo financeiro

Migration: `20260908120000_financeiro.sql` (idempotente — pode ser
reexecutada). Cria as 4 tabelas `financial_*`, os ENUMs, os índices por
mês de competência, os triggers de `updated_at`, as políticas de RLS
(mesma regra das demais tabelas: todo usuário autenticado lê e escreve) e
as 14 categorias padrão da planilha.

Garantias de integridade que o banco impõe (não a tela):

| Regra                                             | Como é garantida                       |
| ------------------------------------------------- | -------------------------------------- |
| Gerar as recorrências duas vezes não duplica       | `unique (recurrence_id, reference_month)` |
| Categoria em uso não pode ser apagada              | FK `on delete restrict`                |
| Apagar um cliente não apaga o histórico financeiro | FK `on delete set null`                |
| Valor negativo não entra                           | `check (amount >= 0)`                  |

### Carga inicial (opcional)

`seed_financeiro.sql` importa a planilha "Fluxo de Caixa Imagine Labs 2026"
no recorte acertado com a agência em setembro/2026:

| O quê                | Quanto                                            |
| -------------------- | ------------------------------------------------- |
| Lançamentos          | 149 (abril a setembro/2026)                       |
| Clientes             | 15 — 6 ativos, 9 inativos (não renovaram)         |
| Recorrências         | 18 — 6 mensalidades + 12 custos fixos, desde 10/26 |

Outubro a dezembro **não** são carregados: na planilha eram cópia da
carteira antiga. Rode **depois** da migration. Se já houver lançamentos, o
script não faz nada e avisa — não há risco de duplicar.

```sql
-- No SQL Editor do Supabase, cole o conteúdo de:
--   1. supabase/migrations/20260908120000_financeiro.sql
--   2. supabase/seed_financeiro.sql   (opcional)
```


## Comercial

Migration: `20260921120000_comercial.sql` (idempotente). Cria
`commercial_leads` e `commercial_proposals`, os ENUMs, os índices, as
políticas de RLS e um trigger que carimba `stage_changed_at` **apenas**
quando a etapa muda — é o relógio do "parado há N dias", e ele vale mesmo
se a etapa for alterada fora da tela do funil.

Não há tabela de contratos, de propósito: um contrato é cliente + valor
mensal + vigência, e isso já é uma linha de `financial_recurrences`. Ver
a seção 5.4 do PROJECT_CONTEXT.
