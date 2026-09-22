# PROJECT_CONTEXT — Regras do Sistema

Este documento é a **fonte de verdade das regras de negócio e convenções**
do sistema. Deve ser lido antes de qualquer implementação e mantido
atualizado a cada etapa.

---

## 1. Objetivo do sistema

Gerenciar todo o ciclo de produção de conteúdo de uma agência de social
media — do planejamento à publicação —, de forma que duas pessoas
consigam coordenar o trabalho sem depender de planilhas soltas.

São **dois sistemas separados**, com uma base de código e um login só,
ligados apenas pela tabela `clients`:

1. **Demandas** (`/dashboard`, `/conteudos`, ...) — a produção de conteúdo
   dos clientes, do planejamento à publicação. Menu em `lib/navigation.ts`.
2. **Interno** (`/interno/...`) — a administração da empresa: comercial,
   financeiro, pessoas, contábil e administrativo. Áreas em
   `lib/interno/areas.ts`.

A rota `/` é a **porta de entrada**: pergunta em qual dos dois entrar.
Cada lado tem menu, cores e shell próprios — quem usa sente dois sistemas;
por baixo é um cadastro de cliente só e um deploy só.

> **Nunca** misture os dois menus. Conteúdos, gravações, edição e postagens
> são de Demandas e não aparecem no Interno; dinheiro, obrigações e
> contratos são do Interno e não aparecem em Demandas.

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

> O financeiro saiu desta lista: ele agora é `/interno/financeiro`, dentro
> do sistema interno (seções 5.1 a 5.3).

Cada página tem **uma responsabilidade**. Nenhuma duplica a função de outra:
o CRUD de conteúdo vive só em `/conteudos`; as demais páginas de pipeline são
recortes de leitura/ação sobre o mesmo dado.

## 5.1 Módulo financeiro (fluxo de caixa)

Domínio separado do pipeline de conteúdo. A entidade central é o
**lançamento** (`financial_entries`): uma entrada ou saída de dinheiro,
classificada por categoria e com um **mês de competência** (`reference_month`,
no formato `"YYYY-MM"`).

### Regras de cálculo (fonte: `lib/financeiro/calculo.ts`, funções puras + testes)

```
Realizado = lançamentos com status "Pago"        (o dinheiro que andou)
Previsto  = "Pago" + "Pendente"                  (se tudo se confirmar)
Resultado líquido      = receitas - despesas
Saldo final do mês     = saldo inicial + resultado líquido
Saldo inicial do mês   = saldo final do mês anterior
Margem líquida         = resultado / receitas    (0 quando não há receita)
```

O **encadeamento do saldo usa o realizado**, porque é o que existe em caixa;
o previsto aparece em paralelo como projeção. O primeiro mês da série parte
de `financial_settings.opening_balance` (o "saldo inicial" da planilha).

> **Diferença proposital em relação à planilha:** lá, os totais somavam todas
> as linhas independentemente da coluna "Status". Aqui, o status é levado a
> sério — pendências não entram no realizado e aparecem em "a receber" e
> "a pagar". É o comportamento que as próprias instruções da planilha
> descreviam.

### Tabelas (4)

- **financial_settings** — linha única: saldo inicial e mês de partida.
- **financial_categories** — as linhas de agrupamento do resumo anual
  (`kind` = `Receita` | `Despesa`).
- **financial_entries** — os lançamentos. Referencia `category_id`
  (on delete restrict) e `client_id` (on delete set null: apagar um cliente
  nunca apaga histórico financeiro).
- **financial_recurrences** — as regras de mensalidades e custos fixos.

### Recorrências: a razão de o sistema existir

Na planilha, a mesma lista de mensalidades e custos fixos era redigitada em
cada aba mensal. Aqui ela é cadastrada **uma vez** em `financial_recurrences`
e vira lançamento de qualquer mês com um clique ("Gerar do plano fixo").

A unicidade `(recurrence_id, reference_month)` no banco garante que clicar
duas vezes **não duplica nada** — a proteção é do banco, não da tela.

### Churn de clientes

A carteira muda: cliente entra, cliente sai. O sistema trata isso em dois
lugares, e **nenhum deles apaga histórico**:

- `clients.active = false` tira o cliente dos formulários do dia a dia, mas
  os lançamentos antigos continuam no fluxo de caixa e no resumo anual.
- A recorrência do cliente é **pausada** (`active = false`) ou excluída. Os
  lançamentos que ela já gerou permanecem — por isso a FK de
  `financial_entries.recurrence_id` é `on delete set null`.

O erro que a planilha induzia era o oposto: como cada mês era cópia do
anterior, um cliente que saiu continuava aparecendo nos meses futuros e
inflava a projeção. Aqui, o mês futuro só existe depois de gerado a partir
das recorrências vigentes.

### Páginas do módulo

| Rota                          | Responsabilidade                                   |
| ----------------------------- | -------------------------------------------------- |
| `/financeiro`                 | Painel do mês: saldo, resultado, a receber/a pagar |
| `/financeiro/lancamentos`     | CRUD dos lançamentos + baixa rápida (pago)         |
| `/financeiro/fluxo-caixa`     | O mês linha a linha, no formato da planilha        |
| `/financeiro/resumo-anual`    | Matriz categoria × mês do ano inteiro              |
| `/financeiro/recorrencias`    | Mensalidades e custos fixos                        |
| `/financeiro/categorias`      | Categorias + saldo inicial da série                |

Vale a mesma regra do pipeline: **cada página tem uma responsabilidade**.
O CRUD do lançamento vive só em `/financeiro/lancamentos`; as demais telas
são recortes de leitura sobre o mesmo dado.

## 5.2 Sistema interno — cor por área

Cada área tem uma cor, e **a cor tem função: ela diz de onde o dado vem**.

| Área            | Cor             | Responde                          |
| --------------- | --------------- | --------------------------------- |
| Início          | grafite `#3f3a3c` | Por onde eu começo hoje?        |
| Comercial       | vinho `#7a2740`   | De onde vem o próximo cliente?  |
| Financeiro      | petróleo `#0f5d52`| Quanto sobra no fim do mês?     |
| Pessoas         | lilás `#6f4a9b`   | Quanto custa a equipe?          |
| Contábil        | azul `#1d5a9e`    | O que tem prazo com o governo?  |
| Administrativo  | ocre `#8a5a16`    | O que a empresa assina e paga?  |

**Como funciona na prática.** O shell (`InternoShell`) põe `data-area` no
wrapper da página; o CSS (`app/globals.css`) troca `--area` e `--area-soft`;
as classes `text-area`, `bg-area-soft` e `border-area` do Tailwind seguem
sozinhas. Para tingir um pedaço isolado — uma linha que veio de outra área —
basta pôr `data-area` nele (é o que `OrigemItem` faz na tela Início).

**Duas regras que não se quebram:**

- O **vermelho** (`--alerta`, classes `text-alerta` / `bg-alerta-soft`)
  nunca é cor de área. Quer dizer sempre a mesma coisa: venceu ou está
  vencendo.
- **Não existe verde de "tudo certo"** — verde já é o Financeiro. O que
  está em dia não recebe cor; o que chama atenção é a exceção.

## 5.3 As áreas são recortes do financeiro, não tabelas novas

Pessoas, Contábil e Administrativo **não têm tabela própria**. São recortes
das categorias financeiras, mapeados em `lib/interno/classificacao.ts`:

```
Pró-labore (sócias), Freelancers          -> pessoas
Contabilidade / MEI, DAS                  -> contabil
Assinaturas e ferramentas, Equipamentos   -> administrativo
Mensalidades, Projetos avulsos, Produtos  -> comercial
```

É a mesma regra anti-duplicação do pipeline de conteúdo: o dado vive num
lugar só. Mudou no financeiro, mudou em todas as telas — e a soma das três
áreas de despesa fecha exatamente com o custo fixo da empresa.

Comercial idem: a carteira (`lib/data/comercial.ts`) nasce de `clients` +
`financial_recurrences` + `financial_entries`. Só o **funil de leads e as
propostas** vão precisar de tabelas novas.

## 5.4 Comercial — o funil e o fechamento

Duas tabelas novas, e só duas: `commercial_leads` (as oportunidades) e
`commercial_proposals` (as propostas de cada uma).

**Etapas do funil** (enum `lead_stage`):

```
Contato feito -> Diagnóstico -> Proposta enviada -> Negociação -> Fechado
                                                                  \-> Perdido
```

Arrastar no quadro move entre as quatro etapas ABERTAS. **Ganhar e perder
não são arrasto**: ganhar pede os dados do contrato e perder pede o motivo.

### O fechamento é o ponto em que comercial vira financeiro

`fecharNegocioAction` (`lib/actions/comercial.ts`) cria, de uma vez:

1. o **cliente** em `clients` — que já vale para o sistema de demandas;
2. a **mensalidade** em `financial_recurrences`, com `start_month` e
   `end_month` (a vigência);
3. o lançamento de **entrada/setup**, se a proposta cobrava.

A partir daí o "Gerar do plano fixo" do financeiro passa a criar aquela
mensalidade todo mês sozinho, e o `end_month` vira o alerta de renovação
no Início.

A regra que decide o que nasce é **pura e testada**: `dadosDoFechamento`
em `lib/comercial/funil.ts`. A action só grava o que ela devolve.

### Por que NÃO existe tabela de contratos

Um contrato é cliente + valor mensal + vigência — que é exatamente uma
linha de `financial_recurrences`. Criar uma tabela de contratos seria
manter dois valores para a mesma mensalidade, e um dia eles divergem.
"Contrato vence em X dias" sai do `end_month` da recorrência.

Mesma lógica de 5.3: o dado vive num lugar só.

### Cliente que volta

Fechar um negócio com um nome que já existe em `clients` **reaproveita e
reativa** o cliente, em vez de duplicar. Ganhar de volta quem saiu é
comum — e o histórico financeiro dele continua inteiro.

## 5.5 Empresa — documentos e prazos

### Documentos: dois lugares, sem sobreposição

| O documento é de… | Mora em | Bucket |
| ----------------- | ------- | ------ |
| um **cliente** (contrato, briefing, nota) | `client_files`, na ficha do cliente | `client-files` |
| a **empresa** (contrato social, CNPJ, alvará) | `company_files` | `company-files` |

`client_files` ganhou a coluna **`kind`** (`Contrato`, `Proposta`,
`Briefing`, `Referência`, `Arte`, `Nota fiscal`, `Outro`). Marcar um
arquivo como `Contrato` o faz aparecer em *Administrativo → Contratos*
**sem sair** da ficha do cliente: é o mesmo arquivo, visto de dois
lugares. Por isso também não existe tabela de contratos — o valor e a
vigência continuam na recorrência (ver 5.4).

Os dois buckets são **privados**; o download sai por link assinado de 60
segundos, nunca por URL pública.

### Obrigações: só o que NÃO é despesa

`company_obligations` guarda prazo que não passa pelo caixa — a
declaração anual do Simples, a renovação do alvará. **Despesa com prazo
(DAS, contabilidade) continua no financeiro**, porque lá é onde o
dinheiro vive; ela chega ao Início como lançamento pendente.

Periodicidade (enum `obligation_cadence`): `Mensal`, `Trimestral`,
`Anual`, `Única`. O trimestral usa `due_month` como âncora — âncora em
março significa março, junho, setembro e dezembro.

Cada período cumprido é uma linha em `obligation_completions`, com a
chave do período variando conforme a periodicidade:

```
Mensal / Trimestral -> "2026-09"
Anual               -> "2026"
Única               -> "unica"
```

A unicidade `(obligation_id, period)` impede marcar o mesmo período duas
vezes, e desativar a obrigação preserva o histórico.

### A regra que evita atraso fantasma

`vencimentoAberto` (`lib/empresa/obrigacoes.ts`) procura o período mais
antigo ainda não cumprido — mas **ignora períodos anteriores a
`since`** (o `created_at` da obrigação). Sem esse corte, cadastrar hoje
uma obrigação mensal faria o sistema acusar seis meses de atraso que
nunca existiram. Há teste cobrindo exatamente isso.

O banco garante a coerência: periodicidade `Única` exige `due_date`, as
periódicas exigem `due_day`, e `Anual` exige `due_month`.

## 5.6 Pessoas — quem recebe, e o alerta de renovação

### `team_members` não é `profiles`

| Tabela | É quem… |
| ------ | ------- |
| `profiles` | **faz login** no sistema (hoje, Fran e Vitória) |
| `team_members` | **recebe dinheiro** da agência — inclui freelancer que nunca terá login |

`team_members.profile_id` liga as duas quando é a mesma pessoa. São
conceitos diferentes e por isso são tabelas diferentes.

O **valor** continua vindo do financeiro: `financial_entries` e
`financial_recurrences` ganharam `team_member_id` (nullable), que só diz
*a quem* aquele pagamento se refere. A migration já liga o que existia,
casando `"Pró-labore " || nome` com a pessoa.

O formulário de lançamento só oferece o campo "para quem" quando a
categoria escolhida é de pessoas (consulta `categoriasDaArea("pessoas")`)
— perguntar isso num lançamento de assinatura seria ruído.

Ninguém é excluído: desativar preserva o histórico, e a FK é
`on delete set null` para que apagar um cadastro nunca apague pagamento.

### Renovação de contrato

Não existe tabela de contratos (ver 5.4): o contrato é a recorrência, e
a vigência é o `end_month` dela. `renovacoesProximas`
(`lib/comercial/funil.ts`) transforma isso em aviso:

- contrato **sem** `end_month` nunca renova — não tem prazo para acabar;
- contrato **pausado** não entra;
- contrato **já vencido e ainda ativo** é o mais urgente, porque a
  mensalidade segue sendo gerada sem vigência que a sustente;
- horizonte padrão de 45 dias.

O aviso entra na mesma lista do Início, com a cor do comercial.

## 5.7 Busca, rentabilidade e relatório

### Busca global (⌘K)

`BuscaComando` abre com ⌘K (Ctrl+K no Windows) de qualquer tela do
interno e procura em seis lugares ao mesmo tempo: clientes, lançamentos,
oportunidades, pessoas, obrigações e documentos.

Cada resultado carrega a **cor da área de onde veio** — o mesmo código de
cor do resto do sistema (5.2).

Duas decisões que importam:

- A busca é **server action** (`lib/actions/busca.ts`), não consulta do
  navegador: o cliente nunca recebe o que o RLS não deixaria passar.
- Uma `ref` guarda o último termo buscado, para que a resposta atrasada
  de uma busca antiga não sobrescreva o resultado da atual. Sem isso,
  digitar rápido faz a lista "voltar no tempo".

É `ilike` simples, sem índice de texto: para uma base do tamanho da
agência é suficiente, e não exige extensão nenhuma no Postgres.

### Rentabilidade por cliente

`lib/financeiro/rentabilidade.ts` responde "esse cliente se paga?"
separando dois custos que costumam ser confundidos:

| | O que é | De onde sai |
| - | ------- | ----------- |
| **Direto** | freela e tráfego daquele cliente | `financial_entries.client_id` |
| **Indireto** | pró-labore, ferramentas, impostos | despesa sem `client_id` |

A **margem direta é fato**. O **resultado com rateio é estimativa**: o
indireto é dividido na proporção da receita de cada cliente — quem
fatura mais absorve mais. É o rateio mais comum e o único honesto sem
apontar horas trabalhadas.

Só conta o que foi **pago**: receita prometida não paga cliente nenhum.

Receita paga sem `client_id` entra no total mas não em nenhuma linha, o
que distorce o rateio — por isso a tela avisa quando isso acontece.

> Optei por rentabilidade **por cliente** em vez de custo por conteúdo.
> Atribuir custo a cada conteúdo exigiria apontar horas por peça, o que
> ninguém sustenta na prática; e a pergunta real ("vale a pena atender
> esse cliente?") se responde no nível do cliente.

### Relatório do mês

`/interno/relatorio` fecha o mês numa página: dinheiro, carteira, para
onde foi o dinheiro, quem mais rendeu e o que entra no mês seguinte.
Compara com o mês anterior.

A folha de impressão (`@media print` em `globals.css`) esconde menu e
botões, então Ctrl+P sai limpo em papel ou PDF — sem biblioteca de PDF.

## 6. Convenções de código

- **Rotas/arquivos:** `kebab-case`.
- **Componentes:** `PascalCase`.
- **Funções/variáveis:** `camelCase`, em português.
- **Tabelas/colunas do banco:** `snake_case`, em **inglês** (padrão Supabase,
  ex.: `client_id`, `created_at`). Os **valores** dos enums de status/
  prioridade ficam em pt-BR (aparecem direto na UI).
- **Datas:** trafegam como string ISO 8601; exibidas via `formatarData()`.
- **Dinheiro:** `numeric(12,2)` no banco, `number` (em reais) no TypeScript,
  exibido com `formatarMoeda()`. O valor digitado pela usuária ("1.700,00")
  passa por `paraNumero()` (`lib/financeiro/valores.ts`) antes de ser gravado.
- **Mês de competência:** string `"YYYY-MM"`, manipulada só pelos helpers de
  `lib/financeiro/meses.ts` — nunca com `new Date()` sobre `"YYYY-MM"`, que
  introduziria fuso horário e erraria a virada do mês.
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
