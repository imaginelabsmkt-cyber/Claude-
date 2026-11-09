# PROJECT_CONTEXT: Regras do Sistema

Este documento é a **fonte de verdade das regras de negócio e convenções**
do sistema. Deve ser lido antes de qualquer implementação e mantido
atualizado a cada etapa.

---

## 1. Objetivo do sistema

Administrar a Favie: comercial, financeiro, pessoas, contábil e
administrativo, de forma que as duas sócias toquem a empresa sem depender
de planilhas soltas.

Este projeto é **só a administração** (`/interno/...`). A gestão de
conteúdo e demandas, planejamento, roteiros, gravações, edição,
postagens, é um **sistema à parte**, com a própria base de código, o
próprio banco e os próprios dados. Os dois não se falam.

> **Por que isto está escrito aqui, em primeiro lugar:** por um tempo os
> dois sistemas dividiram esta base de código, com uma "porta de entrada"
> em `/` perguntando em qual entrar. Isso foi um erro, e ele apareceu da
> pior forma: o primeiro deploy real levou junto uma cópia velha e vazia
> do sistema de demandas, parecida com o de verdade, que ficou disponível
> para login. Duas versões do mesmo sistema é pior do que dois sistemas.
>
> Então: **nada de conteúdo, gravação, edição ou postagem entra aqui.**
> Não como tela, não como tabela, não como menu. Se um dia os dois
> precisarem conversar, que seja por integração explícita entre dois
> sistemas vivos, nunca copiando um para dentro do outro.

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
entidades novas, são **visões filtradas** do pipeline de `contents`:

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

- **profiles**, usuário (`id` = `auth.users.id`), `role`.
- **clients**, cliente atendido pela agência.
- **contents**, entidade central (pauta/roteiro + pipeline). Referencia
  `client_id` e os responsáveis `planner_id`, `recorder_id`, `editor_id`,
  `publisher_id`. Concentra gravação (`recording_*`), prazos (`*_deadline`),
  arquivos (`*_url`) e controle (`revision_count`, `editing_queue_position`,
  `is_fixed_date`, `is_campaign`).
- **content_history**, auditoria de alterações de campos de `contents`.
- **comments**, comentários de colaboração em um conteúdo.

> Gravação, agendamento e "tarefas" **não** têm tabela própria: gravação
> vive em `contents`; as "tarefas de cada pessoa" derivam dos campos de
> responsável (`planner_id`/`recorder_id`/`editor_id`/`publisher_id`).

Relacionamentos:

```
auth.users 1 ── 1 profiles
clients    1 ── N contents          (on delete restrict)
profiles   1 ── N contents          (responsáveis, on delete set null)
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
> sério, pendências não entram no realizado e aparecem em "a receber" e
> "a pagar". É o comportamento que as próprias instruções da planilha
> descreviam.

### Tabelas (4)

- **financial_settings**, linha única: saldo inicial e mês de partida.
- **financial_categories**, as linhas de agrupamento do resumo anual
  (`kind` = `Receita` | `Despesa`).
- **financial_entries**, os lançamentos. Referencia `category_id`
  (on delete restrict) e `client_id` (on delete set null: apagar um cliente
  nunca apaga histórico financeiro).
- **financial_recurrences**, as regras de mensalidades e custos fixos.

### Recorrências: a razão de o sistema existir

Na planilha, a mesma lista de mensalidades e custos fixos era redigitada em
cada aba mensal. Aqui ela é cadastrada **uma vez** em `financial_recurrences`
e vira lançamento de qualquer mês com um clique ("Gerar do plano fixo").

A unicidade `(recurrence_id, reference_month)` no banco garante que clicar
duas vezes **não duplica nada**, a proteção é do banco, não da tela.

### Churn de clientes

A carteira muda: cliente entra, cliente sai. O sistema trata isso em dois
lugares, e **nenhum deles apaga histórico**:

- `clients.active = false` tira o cliente dos formulários do dia a dia, mas
  os lançamentos antigos continuam no fluxo de caixa e no resumo anual.
- A recorrência do cliente é **pausada** (`active = false`) ou excluída. Os
  lançamentos que ela já gerou permanecem, por isso a FK de
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
| `/financeiro/categorias`      | Configuração: categorias + saldo inicial da série  |

Vale a mesma regra do pipeline: **cada página tem uma responsabilidade**.
O CRUD do lançamento vive só em `/financeiro/lancamentos`; as demais telas
são recortes de leitura sobre o mesmo dado.

## 5.2 Sistema interno: cor por área

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
sozinhas. Para tingir um pedaço isolado, uma linha que veio de outra área -
basta pôr `data-area` nele (é o que `OrigemItem` faz na tela Início).

**Duas regras que não se quebram:**

- O **vermelho** (`--alerta`, classes `text-alerta` / `bg-alerta-soft`)
  nunca é cor de área. Quer dizer sempre a mesma coisa: venceu ou está
  vencendo.
- **Não existe verde de "tudo certo"**, verde já é o Financeiro. O que
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
lugar só. Mudou no financeiro, mudou em todas as telas, e a soma das três
áreas de despesa fecha exatamente com o custo fixo da empresa.

Comercial idem: a carteira (`lib/data/comercial.ts`) nasce de `clients` +
`financial_recurrences` + `financial_entries`. Só o **funil de leads e as
propostas** vão precisar de tabelas novas.

## 5.4 Comercial: o funil e o fechamento

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

1. o **cliente** em `clients`, que já vale para o sistema de demandas;
2. a **mensalidade** em `financial_recurrences`, com `start_month` e
   `end_month` (a vigência);
3. o lançamento de **entrada/setup**, se a proposta cobrava.

A partir daí o "Gerar do plano fixo" do financeiro passa a criar aquela
mensalidade todo mês sozinho, e o `end_month` vira o alerta de renovação
no Início.

A regra que decide o que nasce é **pura e testada**: `dadosDoFechamento`
em `lib/comercial/funil.ts`. A action só grava o que ela devolve.

### Por que NÃO existe tabela de contratos

Um contrato é cliente + valor mensal + vigência, que é exatamente uma
linha de `financial_recurrences`. Criar uma tabela de contratos seria
manter dois valores para a mesma mensalidade, e um dia eles divergem.
"Contrato vence em X dias" sai do `end_month` da recorrência.

Mesma lógica de 5.3: o dado vive num lugar só.

### Cliente que volta

Fechar um negócio com um nome que já existe em `clients` **reaproveita e
reativa** o cliente, em vez de duplicar. Ganhar de volta quem saiu é
comum, e o histórico financeiro dele continua inteiro.

## 5.5 Empresa: documentos e prazos

### Documentos: dois lugares: sem sobreposição

| O documento é de… | Mora em | Bucket |
| ----------------- | ------- | ------ |
| um **cliente** (contrato, briefing, nota) | `client_files`, na ficha do cliente | `client-files` |
| a **empresa** (contrato social, CNPJ, alvará) | `company_files` | `company-files` |

`client_files` ganhou a coluna **`kind`** (`Contrato`, `Proposta`,
`Briefing`, `Referência`, `Arte`, `Nota fiscal`, `Outro`). Marcar um
arquivo como `Contrato` o faz aparecer em *Administrativo → Contratos*
**sem sair** da ficha do cliente: é o mesmo arquivo, visto de dois
lugares. Por isso também não existe tabela de contratos, o valor e a
vigência continuam na recorrência (ver 5.4).

Os dois buckets são **privados**; o download sai por link assinado de 60
segundos, nunca por URL pública.

### Obrigações: só o que NÃO é despesa

`company_obligations` guarda prazo que não passa pelo caixa, a
declaração anual do Simples, a renovação do alvará. **Despesa com prazo
(DAS, contabilidade) continua no financeiro**, porque lá é onde o
dinheiro vive; ela chega ao Início como lançamento pendente.

Periodicidade (enum `obligation_cadence`): `Mensal`, `Trimestral`,
`Anual`, `Única`. O trimestral usa `due_month` como âncora, âncora em
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
antigo ainda não cumprido, mas **ignora períodos anteriores a
`since`** (o `created_at` da obrigação). Sem esse corte, cadastrar hoje
uma obrigação mensal faria o sistema acusar seis meses de atraso que
nunca existiram. Há teste cobrindo exatamente isso.

O banco garante a coerência: periodicidade `Única` exige `due_date`, as
periódicas exigem `due_day`, e `Anual` exige `due_month`.

## 5.6 Pessoas: quem recebe, e o alerta de renovação

### `team_members` não é `profiles`

| Tabela | É quem… |
| ------ | ------- |
| `profiles` | **faz login** no sistema (hoje, Fran e Vitória) |
| `team_members` | **recebe dinheiro** da agência, inclui freelancer que nunca terá login |

`team_members.profile_id` liga as duas quando é a mesma pessoa. São
conceitos diferentes e por isso são tabelas diferentes.

O **valor** continua vindo do financeiro: `financial_entries` e
`financial_recurrences` ganharam `team_member_id` (nullable), que só diz
*a quem* aquele pagamento se refere. A migration já liga o que existia,
casando `"Pró-labore " || nome` com a pessoa.

O formulário de lançamento só oferece o campo "para quem" quando a
categoria escolhida é de pessoas (consulta `categoriasDaArea("pessoas")`)
perguntar isso num lançamento de assinatura seria ruído.

Ninguém é excluído: desativar preserva o histórico, e a FK é
`on delete set null` para que apagar um cadastro nunca apague pagamento.

### Renovação de contrato

Não existe tabela de contratos (ver 5.4): o contrato é a recorrência, e
a vigência é o `end_month` dela. `renovacoesProximas`
(`lib/comercial/funil.ts`) transforma isso em aviso:

- contrato **sem** `end_month` nunca renova, não tem prazo para acabar;
- contrato **pausado** não entra;
- contrato **já vencido e ainda ativo** é o mais urgente, porque a
  mensalidade segue sendo gerada sem vigência que a sustente;
- horizonte padrão de 45 dias.

O aviso entra na mesma lista do Início, com a cor do comercial.

## 5.7 Busca: rentabilidade e relatório

### Busca global (⌘K)

`BuscaComando` abre com ⌘K (Ctrl+K no Windows) de qualquer tela do
interno e procura em seis lugares ao mesmo tempo: clientes, lançamentos,
oportunidades, pessoas, obrigações e documentos.

Cada resultado carrega a **cor da área de onde veio**, o mesmo código de
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
indireto é dividido na proporção da receita de cada cliente, quem
fatura mais absorve mais. É o rateio mais comum e o único honesto sem
apontar horas trabalhadas.

Só conta o que foi **pago**: receita prometida não paga cliente nenhum.

Receita paga sem `client_id` entra no total mas não em nenhuma linha, o
que distorce o rateio, por isso a tela avisa quando isso acontece.

> Optei por rentabilidade **por cliente** em vez de custo por conteúdo.
> Atribuir custo a cada conteúdo exigiria apontar horas por peça, o que
> ninguém sustenta na prática; e a pergunta real ("vale a pena atender
> esse cliente?") se responde no nível do cliente.

### Relatório do mês

`/interno/relatorio` fecha o mês numa página: dinheiro, carteira, para
onde foi o dinheiro, quem mais rendeu e o que entra no mês seguinte.
Compara com o mês anterior.

A folha de impressão (`@media print` em `globals.css`) esconde menu e
botões, então Ctrl+P sai limpo em papel ou PDF, sem biblioteca de PDF.

## 5.8 A regra do número que se paga

A Fran pediu um sistema "mais intuitivo e usual, somente coisas
necessárias e que realmente vamos utilizar". O menu de sete áreas ficou
como estava, a escolha foi **limpar por dentro**, sob uma regra única:

> **Um número só fica na tela se mudar o que você faz hoje.**

O que isso exclui, por definição:

- **Porcentagem que repete um valor.** "Sobrou R$ 3.000" e "margem 18%"
  dizem a mesma coisa; só um precisa estar lá. Saíram a margem líquida do
  fluxo de caixa e o "do custo fixo" de Pessoas.
- **Contagem de cadastro.** "Prazos cadastrados: 4", "Documentos: 12",
  "Itens no mês: 9", a lista logo abaixo já conta. Saíram.
- **O mesmo dado em duas telas do mesmo mês.** O painel do mês mostrava
  receitas/despesas por categoria em barras; o fluxo de caixa mostra as
  mesmas categorias com os lançamentos dentro. Ficou só no fluxo de caixa,
  com um link "Ver por categoria →" no painel. Idem "faturamento por
  cliente", que vive na Rentabilidade.
- **Quatro números que são uma frase.** O Comercial abria com "clientes
  ativos / receita recorrente / custo fixo / falta para cobrir" e, logo
  abaixo, uma barra dizendo exatamente isso. Agora é só a barra, com a
  frase: "6 clientes ativos pagam R$ 11.150 por mês, cobre 78% do custo
  fixo; faltam R$ 3.036, cerca de 2 clientes do tamanho médio".

Nada de acesso foi perdido: a configuração (categorias e saldo inicial)
saiu das abas do dia a dia e virou um link discreto à direita, porque se
mexe nela uma vez, não todo dia.

### A única função que saiu de verdade

**"Copiar mês anterior"** foi removida (botão e `copiarMesAction`). Ela
repetia *todos* os lançamentos do mês passado como pendentes, inclusive o
que foi compra única, que então precisaria ser apagado à mão. O "Gerar do
plano fixo" cobre o que de fato repete e **não duplica**, porque o banco
garante `unique (recurrence_id, reference_month)`. Dois botões parecidos
lado a lado, um deles perigoso por hábito, é pior que um botão só.

## 5.9 Meus gastos: a única área privada

A Fran pediu: *"quero que cada uma tenha uma aba própria para controlar
os próprios gastos, mas eu não vou ter acesso à dela e ela não vai ter
acesso à minha."*

Isso quebra a premissa de todo o resto do sistema interno. Até aqui, a
regra era: **as duas sócias veem exatamente o mesmo dado**, mesmo
caixa, mesma carteira, mesmos contratos. Era o certo, porque é uma
empresa de duas pessoas e esconder o caixa de uma delas não faria
sentido. Gasto pessoal é o oposto.

### Uma aba: não duas

O menu tem **um** item "Meus gastos" (`/interno/meus-gastos`), não dois
("Fran" e "Vitória"). A tela é a mesma; o conteúdo é de quem está
logada. Isso não é economia de código, é a diferença entre privado e
"escondido atrás de um link": com duas abas, uma delas mostraria o dado
da outra para quem abrisse.

No menu as áreas ficam em dois grupos, separados pela linha **"Só você
vê"**. Acima é "nosso", abaixo é "meu", e a cor rosa-magenta
(`#a62a6a`, 6,6:1 de contraste) não parece com nenhuma área da empresa
justamente para reforçar isso sem texto.

### Por que o filtro NÃO está no código

`lib/data/pessoal.ts` não tem um único `.eq("user_id", ...)`. Isso é de
propósito e está escrito lá: o filtro é a policy do Postgres. Se
estivesse no código, um esquecimento numa query futura vazaria o gasto
de uma sócia para a outra. Do jeito que está, **esquecer não vaza**: o
banco devolve só as linhas de quem está logada.

Pelo mesmo motivo, nenhuma action escreve `user_id`. A coluna tem
`default auth.uid()` e o `with check` da policy rejeita id alheio, não
escrever o campo é o que torna impossível errar.

### O modelo é diferente do caixa da empresa: de propósito

| | Empresa | Pessoal |
| --- | --- | --- |
| Pergunta | "quanto sobra no fim do mês?" | "como foi o MEU mês?" |
| Saldo | encadeado (final de um = inicial do outro) | **não existe** |
| Categoria | tabela cadastrada (`financial_categories`) | texto livre com autocompletar |
| Status | `Pago` / `Pendente`, nasce pendente | `paid` boolean, **nasce pago** |

Os dois últimos são os que mais mudam o uso. Categoria livre porque
ninguém quer cadastrar "Padaria" antes de lançar R$ 12; o autocompletar
aprende com o que a pessoa já usou e `agruparPorCategoriaPessoal`
normaliza caixa e espaços, então "mercado" e "Mercado" somam na mesma
linha em vez de virarem duas. E nasce **pago** porque gasto pessoal se
anota depois de acontecer, ao contrário da conta da empresa, que se
agenda antes.

Saldo encadeado não existe porque ninguém controla gasto pessoal
somando janeiro até dezembro. O mês fecha em si: entrou, saiu, sobrou.

### O pró-labore vem da empresa: não da digitação

`team_members.profile_id` existia desde a migration de Pessoas e nunca
era preenchido. Agora a aba pessoal pergunta uma vez *"qual pessoa da
equipe é você?"* e, com o vínculo feito, mostra o pró-labore que a
agência pagou no mês, lido do financeiro da empresa.

Isso não revela nada novo: é o seu próprio pagamento, que já aparece em
`/interno/pessoas` para as duas. O que evita é digitar o próprio salário
todo mês.

A função `vincular_me_a_pessoa` roda no banco e só aceita uma pessoa sem
dono (ou a que já é sua), reivindicar a da outra sócia levanta exceção.

### O limite honesto desta privacidade

Ela vale para quem entra **pelo sistema**. Quem tem o painel do Supabase
ou a chave `service_role` passa por cima de qualquer RLS: é o dono do
banco. Como as duas dividem o mesmo projeto Supabase, as duas são donas.
Privacidade aqui é entre as telas, não contra o administrador, e isso
está dito em `supabase/migrations/20261011120000_pessoal.sql`, no topo,
para ninguém descobrir depois.

## 5.10 Prospecção: qual canal vira cliente

A Vitória trabalha a captação por canal, seguindo um guia próprio:
social selling, indicação, eventos e parcerias. O guia tem roteiro,
checklist e meta diária, e **nada disso entra aqui**. Roteiro de
abordagem não é dado da empresa; vive onde ela já o mantém.

O que o guia NÃO tem, e o sistema tem, são os números reais. Então a
tela de Prospecção responde uma pergunta só: **em qual canal vale a
pena gastar a próxima hora?**

### `channel` substituiu `source`: em vez de conviver com ele

Já existia `source`, um texto com lista de sugestões ("Indicação",
"Instagram", "Evento"...). Pôr um campo de canal ao lado criaria dois
seletores parecidos na mesma ficha, o tipo de coisa que faz quem usa
parar para pensar qual é qual.

Então `channel` (enum, 5 valores) virou a estrutura, e `source` virou
o **detalhe em texto livre**: quem indicou, qual evento, qual parceiro.
A migration ainda converte o `source` antigo para o canal
correspondente, para não jogar fora o que já estava escrito.

### `max_stage`: por que a etapa atual não basta

O funil precisa dizer "de 40 contatos, 6 chegaram à proposta". Com
apenas a etapa ATUAL isso é impossível: uma oportunidade perdida na
negociação vira `Perdido` e some de todos os degraus, como se nunca
tivesse existido. O funil ficaria otimista exatamente onde dói.

`max_stage` guarda a etapa mais avançada já alcançada, mantida por
gatilho no banco. Regras, verificadas em Postgres real:

| Aconteceu | `stage` | `max_stage` |
| --- | --- | --- |
| Criou em Contato feito | Contato feito | Contato feito |
| Avançou até Negociação | Negociação | Negociação |
| **Perdeu** | Perdido | **Negociação** (lembra onde chegou) |
| Voltou para Contato feito | Contato feito | **Negociação** (não retrocede) |
| Fechou | Fechado | Fechado |

### As decisões de leitura

- **A conversão ignora as oportunidades abertas.** Incluir no
  denominador quem ainda nem decidiu faz um canal novo parecer ruim só
  por ser novo.
- **A barra mede mensalidade conquistada, não contagem de leads.** Um
  canal com 40 conversas e zero fechamentos vale menos que um com 4 e
  dois fechamentos; contar leads diria o contrário.
- **Um tom só nas barras, nome do canal ao lado.** Uma medida por
  categoria é grandeza, não identidade: pintar cada linha de uma cor
  seria decorar. A paleta categórica foi testada no validador da
  skill de dataviz e reprovou na separação entre dois canais para quem
  enxerga cor de outro jeito, motivo a mais para não usá-la aqui.
- **`contatosPorCliente` devolve `null` sem nenhum fechamento.** Um
  palpite ("costuma ser 100 para 1") seria pior que silêncio.

## 5.11 Três etapas, e as duas tentativas erradas antes delas

### O que eu fiz errado, duas vezes

**Primeira:** para não duplicar dado, decidi que cada área seria um
recorte do financeiro. Pessoas virou "lançamentos de pró-labore",
Contábil virou "lançamentos de DAS", Administrativo virou "lançamentos
de ferramentas". Nenhuma tinha dado próprio. Pior: fiz contrato de
cliente ser uma recorrência financeira, então vigência, escopo e
renovação simplesmente não existiam.

**Segunda:** a Fran disse "parece que tá tudo misturado" e eu concluí
que o menu tinha itens demais, cortando de sete para quatro. Ela
corrigiu o diagnóstico: *"manter os sete faz sentido se cada coisa
tiver sua função. Mas é porque tudo tá aparecendo as mesmas coisas."*
O problema nunca foi o número. Foi eu ter enchido todas com a mesma
coisa.

### A estrutura, que veio dela

Mais enxuta que qualquer uma das minhas, porque segue o que está
dentro do quê:

| Etapa | Pergunta | Abas |
| --- | --- | --- |
| Comercial | De onde vem o próximo cliente? | Funil, Prospecção |
| Administrativo | Como a empresa se organiza? | Clientes, Equipe, Documentos |
| Financeiro | Quanto entra e quanto sai? | Painel, Lançamentos, Fluxo de caixa, Resumo anual, Fixos e ferramentas, Impostos, Por cliente, Relatório |
| Meus gastos | Como está o MEU mês? | (privada) |

As palavras dela, que são a régua:

- **RH não é etapa.** Contratar alguém é ato administrativo, e o valor
  combinado vira lançamento no financeiro. *"Não é RH, é
  administrativo. Pois é, está tudo dentro do administrativo."*
- **Contábil não é etapa.** *"O contábil vai dentro do financeiro,
  porque uma coisa está dentro da outra."* Imposto é dinheiro saindo.
- **Ferramenta não é etapa.** *"A gente só quer saber quais
  ferramentas a gente utiliza para saber quanto que a gente paga, para
  poder fazer parte do nosso fluxo de caixa."* É custo.
- **Cliente é do administrativo.** O cadastro e o contrato ficam lá; o
  Comercial é só a conquista de quem ainda não é cliente.

### A ordem do menu é alfabética

Início primeiro, porque é a porta de entrada e não concorre com as
outras. Depois Administrativo, Comercial, Financeiro. Meus gastos por
último, separado.

Alfabética por pedido da Fran, e é a ordem que não precisa ser
explicada: qualquer outra (por importância, por frequência de uso)
depende de concordar com o critério de quem ordenou. `AREAS_EMPRESA`
ordena sozinha com `localeCompare`, e um teste trava isso, porque a
primeira coisa que volta a sair do lugar é alguém acrescentar uma
etapa nova no fim do array.

### A régua para criar etapa nova

Uma etapa só existe se responder uma pergunta que **nenhuma das outras
responde**. Se a resposta já mora dentro de outra, é aba, não etapa.

O aviso dela, que vale mais que a régua: *"a gente não está deixando
usual, a gente está deixando cheio de coisa que a gente não vai
utilizar e vai ficar parado. E eu não quero que seja assim."*


## 5.12 O contrato de cliente, que eu tinha deixado de fora

### O erro

Para não duplicar dado, eu decidi que "contrato é uma recorrência
financeira". Parecia elegante e custou a informação toda: o sistema
sabia quanto o cliente paga, mas não desde quando ele é cliente, até
quando o contrato vale, o que está no escopo nem quando reajustar.
A Fran pediu exatamente isso: *"cada cliente tem o seu contrato, o seu
tempo de contrato, os seus dados, que às vezes a gente precisa acessar
rápido"*.

Economizar uma tabela não vale perder a entidade.

### Como ficou

`client_contracts` é a entidade; `financial_recurrences` é a COBRANÇA
que ela gera, ligada por `recurrence_id`. Continua existindo um valor
só, e quem manda nele é o contrato: `atualizarContratoAction` e
`registrarReajusteAction` propagam para a recorrência. Sem isso, mudar
a mensalidade aqui deixaria o financeiro cobrando o valor velho, calado.

### As duas conversas, que não são a mesma

| Conversa | Quando | Por quê |
| --- | --- | --- |
| **Renovação** | o contrato acaba | ou renova, ou o cliente vai embora |
| **Reajuste** | 12 meses do último | o contrato continua, o valor precisa subir |

Misturar as duas é o erro fácil: contrato de vigência indeterminada
nunca renova, mas reajusta todo ano. Por isso `contratosQuePedemConversa`
trata cada uma, e omite o reajuste de quem já vai renovar — na conversa
de renovação o valor é negociado junto, e cobrar as duas coisas faria a
mesma ligação aparecer duas vezes na lista.

O aviso de renovação sai 45 dias antes, que é o tempo de marcar a
reunião, ouvir, ajustar escopo e assinar. Avisar com uma semana é
avisar tarde.

### O que o sistema NÃO faz

Não calcula o índice de reajuste. Quem publica o IPCA é o IBGE, e um
número inventado aqui seria pior que número nenhum. O sistema avisa que
chegou a hora, você registra o valor novo, e a data de hoje entra como
o último reajuste.

### Datas em texto, pelo motivo de sempre

`new Date("2026-11-09")` é interpretada como UTC, e no fuso de Boa
Vista isso vira o dia 8. Contrato que vence amanhã apareceria vencendo
hoje. Por isso `lib/empresa/contratos.ts` compara strings "YYYY-MM-DD"
e usa `Date.UTC` só para contar dias.

### Aproveitamento do que já existia

A migration converte cada mensalidade ativa em contrato, com valor e
início corretos; vigência, escopo e reajuste ficam em branco para serem
preenchidos uma vez. O seed faz o mesmo, porque numa instalação do zero
o schema roda ANTES da carga e o backfill da migration não teria o que
converter. Verificado nas duas ordens, em Postgres real, e rodar de novo
não duplica.

## 5.13 O documento do ERP, e a decisão de não começar de novo

A Fran trouxe uma especificação inteira de sistema financeiro e
administrativo, montada a partir de uma análise do Base by Asaas. O
documento abre com "numa pasta de projeto nova" e "você vai construir do
zero". A decisão dela, depois de ler a avaliação, foi outra:

> "é uma base para a gente criar o nosso sistema. Só que levando em
> consideração tudo que a gente já criou, não precisa criar uma coisa
> totalmente do zero e mudar completamente, não. A gente tem que fazer
> passo a passo, porque senão depois, se não der certo, aí a gente vai
> ter que fazer tudo de novo."

Então o documento é **mapa, não ordem de demolição**. Vale como lista do
que falta; não vale como motivo para jogar fora o que já roda.

O argumento técnico, que é o que pesou: a camada de segurança (conta
liberada, RLS em todas as tabelas, a aba privada de gastos) foi provada
em Postgres real, com duas contas atacando uma à outra. Recomeçar é
refazer esse risco do zero, e sem ganho nenhum, porque a stack que o
documento pede (web responsiva, Postgres, login por e-mail e senha,
português, BRL) é exatamente a que já está rodando.

### Uma exceção consciente ao documento

Ele pede valores em **centavos (inteiro)**. Aqui eles são
`numeric(12,2)`, que no Postgres é decimal exato, não ponto flutuante:
não existe o erro de arredondamento que a regra dos centavos evita.
Trocar significaria migrar 26 tabelas e reescrever 153 testes para
corrigir um problema que não existe. Fica como está, e isto aqui é o
registro de que foi decisão, não esquecimento.

### Painel por painel

> "eu quero que a gente consiga desenvolver painel por painel, né?
> Tópico por tópico."

Um painel por vez, cada um indo ao ar antes do próximo começar. A ordem
sai do que ela disse que precisa: **clareza** ("quando eu entro, eu já
consiga entender o que é cada coisa") e **uso** ("se a gente não
utilizar, não vai ficar legal").

| # | Painel | Estado |
|---|---|---|
| 1 | Início: o ano, o caixa, o que pede ação, o mês | no ar |
| 2 | Financeiro: painel do mês, lançamentos, fixos, fluxo, impostos, por cliente | no ar |
| 3 | Administrativo: clientes com contrato, equipe, documentos | no ar |
| 4 | Comercial: funil e prospecção por canal | no ar (propostas a fazer) |
| 5 | Relatórios: DRE, inadimplência, receita recorrente | a fazer |

### Painel 1: o Início

Três coisas mudaram, e cada uma responde uma frase dela.

**"que o nosso dashboard tenha o nosso faturamento anual"**: o ano abre
a tela. Faturamento do ano em número grande, quantos meses faturaram,
média por mês, quanto saiu, quanto sobrou, melhor mês, e quanto ainda
falta receber dos meses já lançados. Antes a tela abria no caixa, que é
a pergunta do dia, não a do ano.

**"que ele tenha clareza... eu já consiga entender o que é cada coisa"**
: todo bloco da tela virou uma `<Secao>`, título em palavras dela e uma
linha dizendo o que aquele bloco responde. "O mês de Outubro/2026 / Só o
que já foi baixado neste mês. O que está em aberto aparece no bloco de
cima" é a diferença entre um número e um número que a pessoa entende.

**gráfico**: doze meses, duas colunas por mês, entrou e saiu. Duas
colunas e não barra empilhada porque a pergunta é "entrou mais do que
saiu?", e isso só duas alturas lado a lado respondem de olho.

### O gráfico não tem JavaScript

SVG montado no servidor. Cada coluna tem um `<title>` (o balãozinho do
navegador) e todos os números estão na tabela de "Ver os números"
embaixo. O `/interno` continua com 2,4 kB de JS. Funciona com leitor de
tela, no celular e impresso.

Duas armadilhas que só apareceram olhando o desenho renderizado:

1. **Classe do Tailwind dentro de `<svg>` não funciona.** `fill-gray-400`
   não é gerada neste projeto (conferido compilando o CSS). Texto dentro
   do SVG leva cor literal (`fill="#9ca3af"`).
2. **Um viewBox só não serve para as duas telas.** O SVG escala junto com
   o cartão, então o desenho largo encolhia o texto a 5px no celular. São
   duas geometrias, uma abaixo de 640px e outra acima, com a mesma lógica.

Por isso existe `scripts/previa/`: renderiza o componente de verdade num
HTML estático, com o CSS do projeto, para abrir e OLHAR. Não é teste e
não afirma nada. Teste nenhum pega rótulo que colide.

### Nenhum valor escrito em cima das colunas

A primeira versão tinha o valor do melhor mês em cima do grupo. Ficava
sobre a coluna mais alta do par, que quase sempre é a vermelha, então
parecia etiqueta do que SAIU quando era do que entrou. O melhor mês já
está por extenso no cartão acima; o gráfico não repete.

## 5.14 Papel creme, tinta quente e a linha do caixa

A Fran olhou o Início pronto e disse: "to achando o design tap seco e
pouco tátil, queria algo mais harmonioso". E mandou junto um gráfico de
linha, dizendo "gosto dessa opção também".

### O design: "branco" e "cinza" foram redefinidos

A tela era branco sobre cinza azulado, que é o padrão de todo painel
feito às pressas. O sistema agora é **papel creme com tinta quente**,
que é a identidade que a Vitória gosta.

O jeito de fazer isso sem tocar em 34 arquivos foi redefinir as cores
base no `tailwind.config.ts`:

- `white` virou `#fffdf8` (papel creme claro). Todo `bg-white` que já
  existia ficou quente sozinho.
- `gray` virou uma escala quente (taupe), não azulada. Todo
  `text-gray-500` e `border-gray-200` do código inteiro acompanhou.
- `papel` (`#f3ede0`) é o fundo da página, no lugar do `bg-gray-50`.
- A sombra passou a ser tingida de vinho em vez de preta. Preto sobre
  creme acinzenta o papel; vinho afunda o cartão sem sujar a cor.
- Os cantos abriram (`rounded-2xl` no cartão padrão).

O contraste foi **conferido, não estimado** (WCAG 2, sobre o cartão e
sobre o papel): `gray-900` 16,3:1 e 14,2:1; `gray-600` 7,4:1 e 6,5:1;
`gray-500` 5,4:1 e 4,7:1, passando AA nos dois fundos. O `gray-500` é o
mais usado do sistema (141 vezes) e foi escurecido de propósito até
passar também sobre o papel, que é o fundo mais escuro dos dois.

### A linha do caixa

As colunas respondem "como foi cada mês". A linha responde outra coisa:
"para onde isso está indo". São perguntas diferentes, então são dois
gráficos, cada um no bloco a que pertence: as colunas no ano, a linha no
caixa.

A linha fica vinho enquanto o caixa está positivo e vermelha de alerta
se o último mês fechou negativo, porque aí não é leitura, é aviso.

### A curva é monotônica, e isso é regra de dado

`lib/interno/curva.ts` usa cúbica monotônica (Fritsch e Carlson), não a
suavização comum. Motivo: a suavização comum **ultrapassa os pontos**.
Entre dois meses em que o caixa só caiu, ela desenha um fundo que a
empresa nunca teve. A monotônica garante que a curva nunca sai do
intervalo entre dois pontos vizinhos: suaviza o traço, não inventa
valor. Há teste conferindo isso em três formatos de série, inclusive
com caixa negativo.

### Mês que não existe não vira ponto

As barras são sempre doze, inclusive as vazias, porque coluna faltando
engana mais do que coluna vazia. A **linha** é o contrário: só tem ponto
nos meses que existem na série. Um janeiro inventado com saldo zero
desenharia uma queda ao chão que nunca aconteceu.

### O rótulo do fim da linha tem faixa reservada

A primeira versão empurrava o texto do último saldo para dentro do
desenho, e ele caía em cima do próprio ponto. Agora o gráfico de linha
tem margem direita maior, e o texto mora lá, onde a linha nunca chega.
Resolver reservando espaço é definitivo; ficar adivinhando para que lado
o texto cabe quebra de novo com outro dado.

## 5.15 A varredura do creme pelo resto do sistema

Trocar o papel mudou dezoito telas, não uma. A varredura achou três
coisas, e duas eram defeito de verdade, não questão de gosto.

### As cores de estado também eram frias

`red`, `green`, `blue`, `amber` e `orange` de fábrica do Tailwind são
desenhadas para fundo branco e cinza azulado, e o sistema usa elas 76
vezes (etiqueta de status, aviso de erro, valor negativo). Estão
redefinidas no `tailwind.config.ts`, puxadas para o quente, pelo mesmo
motivo de `white` e `gray`: o código já usa `text-red-600`, então tudo
acompanha sozinho.

Contraste de texto conferido sobre o cartão: red-600 5,9:1, green-700
6,1:1, blue-700 6,9:1, amber-600 4,8:1, orange-700 5,9:1. Todos passam
AA. O green-600 ficou em 4,3:1 e por isso só é usado como borda.

### A etiqueta "ADMINISTRATIVO" escrevia por cima do título

Na lista do Início a etiqueta tem largura fixa, e é essa largura que
alinha a coluna dos títulos e deixa a lista ser varrida de olho.
"Administrativo" não cabia em 5rem e vazava por cima do texto ao lado.

A correção não foi alargar a etiqueta (ia desalinhar tudo) nem cortar o
texto (ficaria "ADMINISTRATIV..."). Cada área ganhou um `curto` para a
etiqueta: Início, Comercial, **Admin**, Financeiro, Pessoal. A largura
subiu para 6rem, o `truncate` entrou como rede de segurança e um teste
trava o tamanho em dez letras, que é o que cabe.

Isso só apareceu porque a prévia desenha as peças e a gente olha. Nenhum
teste de lógica pega texto passando por cima de texto.

### O que mais mudou

- Campo de texto e área de texto não tinham fundo declarado, então
  herdavam o branco puro do navegador e ficavam estalando dentro do
  cartão creme. Agora têm `bg-white`, que é o papel.
- A etiqueta neutra (`cinza`) sumia no cartão: subiu um passo, para
  `gray-200`.
- O fundo do sistema interno e o da tela de login eram `bg-gray-50`.
  Agora são `bg-papel`.

Existe `scripts/previa/componentes.previa.tsx` justamente para isso:
põe botão, etiqueta, aviso, campo, tabela, lista e estado vazio na mesma
página, para olhar o sistema inteiro de uma vez em vez de abrir dezoito
telas.

## 5.16 O Administrativo não fazia sentido, e por quê

A Fran abriu Administrativo e disse: "não faz sentido o adm ser assim".
Estava certa, e eram três coisas erradas ao mesmo tempo.

### Cliente não é um mês

A tela de Clientes tinha navegação de mês no topo. Cliente não é um
mês: a relação de quem é cliente da Favie é a de hoje, não a de
Setembro. O mês só existia ali porque o cálculo de custo fixo pedia um,
o que é motivo do CÓDIGO, não da pessoa que usa.

Junto com ele vinha um medidor de "quanto as mensalidades cobrem do
custo fixo". Isso é leitura de DINHEIRO, e já existe no Início, que é
onde ela responde alguma coisa. Aqui empurrava a relação de clientes
para baixo da dobra: a tela chamada Clientes abria sem mostrar cliente
nenhum.

### A tela chamava Clientes e listava Contratos

Pior: os clientes que pagam mas ainda não têm contrato cadastrado
apareciam só como um aviso vermelho solto, com os nomes no meio de uma
frase. Quem não tinha contrato não tinha linha.

Agora a lista é A RELAÇÃO DOS CLIENTES. Quem não tem contrato aparece
primeiro, com etiqueta "Sem contrato" e um botão que abre o formulário
já com o cliente escolhido. Um cliente que falta na lista é um cliente
que some da tela, e era isso que fazia a tela não bater com a realidade.

### Documentos mostrava ferramentas, contra a regra dela

A aba Documentos tinha "Ferramentas fixas" e a lista de assinaturas do
mais caro ao mais barato. A regra da Fran é o contrário disso:

> "As ferramentas vão estar dentro do financeiro. Por quê? Porque a
> gente só quer saber quais ferramentas a gente utiliza para saber
> quanto que a gente paga."

Isso já vive em Financeiro, em Fixos e ferramentas. Aqui era um terceiro
lugar com o mesmo dado. E a tela ainda repetia a lista de contratos de
clientes, que é a aba ao lado.

Documentos agora tem só o que é dela: prazos do administrativo,
documentos da empresa e os ARQUIVOS assinados dos contratos. Um é o que
está combinado (aba Clientes), o outro é o papel que prova (aqui).

### O mês aparecia três vezes na mesma linha

O `MonthNav` tem um campo de mês que o navegador escreve por extenso
("novembro de 2026"), e ainda trazia um rótulo ao lado com o mesmo mês.
O cabeçalho da tela repetia uma terceira vez em `contexto`.

O rótulo do `MonthNav` saiu, e o `contexto` de cada tela passou a dizer
O QUE A TELA RESPONDE: "Quanto entrou e quanto saiu no mês", "Quem
trabalha na agência e quanto custa", "Uma página para imprimir ou mandar
para a contabilidade". É o mesmo espaço, custando uma informação nova em
vez de uma repetida.

## 5.17 Fixos e ferramentas, visíveis como na planilha

> "a parte das ferramentas precisa ser mais intuitiva e visível como na
> planilha"

### O problema era de DADO, não só de tela

O sistema tinha duas linhas que escondiam tudo:

    Assinaturas e ferramentas     R$ 1.026,37
    Pró-labore das sócias         R$ 13.000,00

Nenhuma tela do mundo mostra quanto custa o Canva se o banco só tem um
total. A planilha da Fran já tinha a resposta, e eu não tinha lido essa
parte: a aba de cada mês traz "↳ Assinaturas e ferramentas digitais"
com cada ferramenta embaixo, e o pró-labore separado por sócia.

`supabase/detalhar_fixos.sql` troca as duas linhas-bloco pelas linhas
de verdade, com os valores de novembro/2026:

    Claude Max 454,10 · ChatGPT Plus 119,90 · Adobe 95,00 ·
    iCloud Fran 66,90 · iCloud Vitória 66,90 · Canva 53,00 ·
    Captions 51,90 · CapCut 32,90      = R$ 940,60

    Pró-labore Fran 6.500 · Pró-labore Vitória 6.500

O custo fixo passou de R$ 14.272,32 para **R$ 14.186,55**, que é
exatamente o TOTAL DESPESAS da aba Novembro. O valor antigo era o de
outubro: o Claude Max caiu de 612,77 para 454,10 e o Canva subiu de
32,00 para 53,00.

O arquivo foi rodado em Postgres de verdade **três vezes seguidas**: o
total não se mexe e nada duplica. Também foi conferida a instalação do
zero (stub, schema, seed), que já nasce com as linhas detalhadas, e
rodar o `detalhar_fixos.sql` em cima dela não faz nada.

### A tela: agrupada, com a fatia de cada item

Era uma lista achatada de vinte cartões, misturando a mensalidade do
Kiku Sushi com o iCloud da Vitória, cada linha do mesmo tamanho e com
três botões grandes. Agora:

- um grupo por categoria, do mais caro para o mais barato, com o total
  do grupo no cabeçalho, igual ao "↳" da planilha;
- dentro do grupo, os itens do maior para o menor;
- uma barrinha com a **fatia do item dentro do grupo**, que é o que
  responde de olho "o que está pesando?". Com oito ferramentas, uma
  delas é metade da conta, e numa coluna de números parecidos isso não
  aparece;
- as ações viraram links pequenos, porque vinte linhas com três botões
  cada é uma tela de botões.

Num grupo de um item só a barra não aparece: seria sempre uma barra
cheia dizendo "100% de si mesmo", que é tinta sem informação. Isso só
ficou óbvio olhando a prévia renderizada.

A cor da barra é o vinho claro da marca para despesa e verde para
receita, os dois acima de 3:1 sobre o papel do cartão. Despesa em
vermelho forte seriam vinte barras gritando ao mesmo tempo, e aí
nenhuma chama atenção.

### Linha pausada continua na lista

Pausada ou fora da vigência do mês, a linha aparece no grupo dela, com
etiqueta, sem entrar em soma nenhuma. Sumir com ela faz a pessoa achar
que foi apagada.

## 5.18 O Painel do mês virou a aba do mês da planilha

A tela mostrava quatro números grandes e, embaixo, só as PENDÊNCIAS:
"a receber" e "a pagar". O mês inteiro ficava invisível. A pergunta
mais básica que alguém faz abrindo o financeiro, "no que foi que o
dinheiro saiu este mês", não tinha resposta ali: só duas telas adiante.

Agora a tela é a aba mensal da planilha, que é o formato que a Fran já
lê sem aprender nada:

    Saldo no dia 1 · Sobrou no mês · Saldo no fim · Margem

    ENTROU  R$ 13.150,00        SAIU  R$ 14.186,55
      MENSALIDADES    13.150      PRÓ-LABORE        13.000
        Kiku Sushi     2.200        Fran             6.500
        ...                         Vitória          6.500
                                  ASSINATURAS E FERRAMENTAS  940,60
                                    Claude Max         454,10
                                    ...

Cada lado agrupado por categoria, com o total do grupo, e o status de
cada linha. Dentro do grupo o que está em aberto vem primeiro, porque é
o que ainda pede ação, e o vermelho só aparece em quem não foi baixado.

### Dois detalhes que só a prévia mostrou

"vence 10/11/2026" quebrava em duas linhas e dobrava a altura de cada
lançamento. Dentro de um mês que a tela já nomeia no título, o dia
basta: **"vence dia 10"**. Data de outro mês continua por extenso.

E "Mensalidade Kiku Sushi · Kiku Sushi" repetia o cliente, porque a
checagem era de igualdade exata. Agora o nome do cliente só aparece
quando a descrição ainda não o diz.

## 5.19 A varredura do que se repete

> "nao precisa repetir mensalidade" · "busque coisas que se repitam"

Ela apontou uma linha e eu fui atrás de todas. Eram nove, e nenhuma era
bug: eram palavras ocupando espaço sem dizer nada novo.

### A regra: o grupo já falou, a linha não repete

`lib/financeiro/nomes.ts` tem as duas funções, com teste:

- `semRepetirOGrupo(descricao, categoria)`: dentro de "MENSALIDADES /
  CLIENTES RECORRENTES", "Mensalidade Kiku Sushi" vira "Kiku Sushi". E
  dentro de "PRÓ-LABORE (SÓCIAS)", "Pró-labore Fran" vira "Fran".
- `clienteSeFizerFalta(nomeNaTela, cliente)`: a linha que já se chama
  "Kiku Sushi" não escreve "Kiku Sushi" de novo do outro lado.

O corte é conservador de propósito: só acontece quando a primeira
palavra tem **pelo menos cinco letras** e a categoria **começa** por
ela. Com três letras o corte erra: "DAS do Simples Nacional" dentro de
"DAS - Simples Nacional" viraria "do Simples Nacional". Nome cortado
errado é pior do que nome repetido.

### Categoria de uma linha só não ganha subtítulo

Era "DAS - SIMPLES NACIONAL" com "DAS do Simples Nacional" logo
embaixo. Na planilha da Fran, categoria de uma linha só É uma linha só.
Agora aqui também.

### O título da tela repetia a aba aberta

Em treze telas o H1 era exatamente o nome da aba sublinhada dois
centímetros abaixo: "Clientes" e a aba "Clientes", "Lançamentos" e a
aba "Lançamentos".

A regra agora: **tela com aba não passa título**. O `AreaHeader` usa o
nome da ÁREA, a aba diz em que parte dela você está, e a linha de apoio
diz o que aquela parte responde. Tela sem aba (um formulário, a ficha
de uma oportunidade) continua passando o próprio título.

Isso também abriu espaço: onde antes estava o nome repetido, agora está
"Quem é cliente, desde quando e com qual contrato".

### As palavras que se repetiam dentro de uma tela

| Tela | Antes | Agora |
|---|---|---|
| Fixos e ferramentas | "todo mês" 6 vezes | 1 |
| Painel do mês | "mês" em 7 rótulos | nos 2 títulos |
| Início | "no mês" em 3 cartões | 0, a seção já diz |
| Início | o ano escrito 7 vezes | 1 |

O padrão é sempre o mesmo: o título da seção nomeia o período, e os
rótulos dentro dela param de repetir. "ENTROU NO MÊS" embaixo de "O mês
de Outubro/2026" é a mesma informação duas vezes; "ENTROU" basta.

## 5.20 Lançamentos: a lista de trabalho, não de leitura

A diferença entre esta tela e o Painel do mês é a PERGUNTA. O painel
responde "como foi o mês", e por isso agrupa por categoria. Lançamentos
responde "o que eu preciso resolver", e por isso a ordem é a urgência.

`lib/financeiro/vencimento.ts` tem a conta, com teste: vencido primeiro,
depois o que vence hoje, depois o que vai vencer (do mais próximo), e
por último o que já foi baixado (do mais recente). Dias contados com
`Date.UTC` dos dois lados, nunca `new Date(string)`, que em Boa Vista
(UTC-4) devolve o dia anterior.

### A coluna "Situação" dizia o que o botão já dizia

A linha tinha uma etiqueta "Pendente" e, ao lado, um botão "Marcar
pago". Mesma informação de dois jeitos, e nenhuma delas dizia o que
importa: HÁ QUANTO TEMPO. Virou uma coluna de prazo em palavras:
"venceu há 4 dias", "vence hoje", "vence em 11 dias", "pago". Vermelho
só no que venceu ou vence hoje.

### Vinte botões primários não destacam nada

O botão de baixa era primário em toda linha: vinte linhas eram vinte
botões vinho gritando juntos, e o olho não tinha para onde ir. Agora é
um botão discreto de contorno, e só em quem ainda não foi baixado. Quem
já foi baixado tem um "Reabrir" ainda mais apagado.

### Os filtros viraram atalhos

Eram quatro caixas de seleção iguais. As duas perguntas de todo dia,
"o que está em aberto?" e "o que já venceu?", custavam dois cliques
cada, dentro de uma lista. Agora são botões: Tudo · Em aberto ·
Vencidos · Só o que entrou · Só o que saiu.

Categoria e cliente continuam em caixa de seleção, porque são listas
longas e a pergunta é mais rara. Tudo continua vivendo na URL, então o
recorte é compartilhável e sobrevive à recarga.

O "Vencidos" não existe no banco: é calculado com a mesma função pura
da ordenação, sobre os lançamentos do mês, que é um punhado de linhas.

## 5.21 O resto do Financeiro, e uma tela que virou cópia

### Fluxo de caixa era o Painel do mês outra vez

Quando o Painel do mês virou a aba mensal da planilha (saldo inicial,
receitas e despesas por categoria, fechamento), o Fluxo de caixa passou
a mostrar exatamente a mesma leitura numa aba diferente. Duas telas,
uma resposta.

A pergunta que o nome dela promete é outra, e é essa que ela responde
agora: não "como foi novembro", e sim **"para onde o caixa está indo"**.
Uma linha por mês, do primeiro lançamento até o último mês que tem
alguma coisa, com o saldo encadeado (o fim de um é o começo do
seguinte, como na planilha), e a linha do caixa por cima.

`obterSerieDeCaixa` monta a série inteira, inclusive meses à frente que
já têm conta a vencer. O gráfico de linha deixou de ser preso a doze
meses: recebe a régua de meses pronta, e quando passa de quatorze
escreve um rótulo sim, outro não.

Agora as três telas de leitura respondem três perguntas diferentes:

| Tela | Pergunta | Formato |
|---|---|---|
| Painel do mês | como foi este mês | categoria por categoria |
| Fluxo de caixa | para onde o caixa vai | mês a mês, saldo encadeado |
| Resumo anual | em que o ano foi gasto | categoria por mês |

### As outras

**Impostos e contábil** separou as duas coisas que estavam na mesma
lista: o que é dinheiro (DAS, honorários) e o que é só prazo (entregar
documento, renovar certidão). São naturezas diferentes e viviam
misturadas.

**Por cliente** ganhou a explicação de margem, rateio e sobra como
linha de apoio da seção, em vez de um bloco de texto no rodapé que
ninguém lê depois de já ter olhado a tabela.

**Resumo anual** perdeu o "no ano" repetido três vezes embaixo de um
título que já diz "O ano de 2026 inteiro".

**Relatório do mês** ficou como estava: é a folha para imprimir, com
granularidade própria, e não repete nenhuma das outras.

## 5.22 Comercial e Equipe: a mesma régua

Nada estava errado nessas telas; elas só não seguiam ainda o que as
outras passaram a seguir. Todo bloco virou uma `<Secao>` com título em
palavras dela e uma linha dizendo o que o bloco responde.

O que mudou de verdade:

- **Funil**: "No funil" e "Valor do funil" viraram "Em aberto" e "Se
  tudo fechar". A palavra "funil" aparecia três vezes na mesma tela,
  contando o título da aba.
- **Funil**: "Encerradas recentemente" virou "As últimas que acabaram",
  com a explicação do porquê de elas ficarem na tela: o motivo da perda
  é o que impede de repetir o mesmo erro no mês seguinte.
- **Prospecção**: o cartão "Custo em contatos" aparecia vazio enquanto
  não houvesse nenhum fechamento. Agora simplesmente não aparece.
- **Prospecção**: a explicação da barra (mensalidade conquistada, não
  quantidade de contatos) subiu do rodapé para a linha de apoio da
  seção. No rodapé ela era lida depois de a pessoa já ter interpretado
  o gráfico do jeito errado.
- **Equipe**: o h2 "Equipe" repetia o nome da aba e do bloco. Virou
  "Quem é da casa".

## 5.23 A bronca que mudou o rumo, e a pesquisa que faltava

A Fran foi direta: o sistema está confuso, tem texto demais, o painel
financeiro não tem os gráficos que qualquer sistema de gestão tem, o
dashboard não mostra nada do comercial nem do administrativo, e eu não
tinha ido atrás da pesquisa que ela pediu duas vezes.

### O que a pesquisa diz (e que eu não estava fazendo)

Painéis de gestão financeira, de vários fornecedores, convergem em:

1. **Números grandes no topo**, de impacto imediato: saldo, a receber e
   a pagar, e **o vencido de cada lado como indicador próprio**. Eu
   mostrava "em aberto"; "vencido" é outra coisa e é a que faz agir.
2. **5 a 8 indicadores por tela**, não mais.
3. **Colunas para receita e despesa, linha para o saldo acumulado.**
4. **Status do título é regra explícita**, não detalhe de tela.
5. Painel executivo consolida as áreas: caixa e margem do financeiro,
   funil e conversão do comercial.

Fontes: [Omie](https://www.omie.com.br/blog/dashboard-financeiro-indicadores-e-como-montar/),
[Neofin](https://www.neofin.com.br/blog/dashboard-financeiro),
[IXC](https://wiki-erp.ixcsoft.com.br/dashboards/dashboard-financeiro),
[Orbit](https://orbitgestao.com.br/blog/dashboard-gestao-empresarial),
[FGV Jr](https://fgvjr.com/blog/dashboard-para-pequenas-empresas-guia-pratico-para-decisoes-rapidas).

### As cores agora significam alguma coisa

`components/financeiro/situacao.tsx` é o ÚNICO lugar que decide isso:

    verde    = pago
    âmbar    = ainda vai vencer
    vermelho = venceu
    cinza    = nem foi lançado ainda

São cores reservadas: nenhum gráfico ou área usa essas três para outra
coisa, senão a cor deixa de ser informação. Contraste conferido sobre o
fundo de cada etiqueta (4,8:1 a 6,0:1, todos AA). E nunca é só cor:
toda etiqueta tem um ponto E uma palavra.

### Cada ferramenta, com o status dela

Era o pedido mais concreto: "preciso saber se já está pago pela
ferramenta do mês, ou se não está paga, ou se está atrasada". A tela de
Fixos mostrava o plano e nada do mês. Agora cada linha carrega o
lançamento do mês escolhido, com a situação e a baixa ali mesmo.

### A barra de situação

No Painel do mês, cada lado ganhou uma barra repartida em pago, a
vencer e vencido, nas mesmas três cores. É o gráfico que a lista não
dá: de olho, quanto do mês já está resolvido. Vinte linhas ninguém
soma de cabeça.

### Fora o texto explicativo

Eu tinha enchido o sistema de linhas explicando o que cada bloco era, e
ela cortou: "tudo precisa ser autoexplicativo, não precisa ter um texto
explicando o que é aquilo, senão não faz sentido ter um painel em que
cada coisinha precisa de explicação".

Saíram as 24 linhas de `explicacao` das seções e os rodapés que
descreviam a própria tela. O que ficou: o título do bloco e o dado. A
`<Secao>` ainda aceita explicação, para o caso raro de uma regra que o
desenho não consegue dizer, mas o padrão agora é não ter.

### O dashboard virou do sistema, não do financeiro

Faturamento do ano em cima, como ela pediu. Depois uma linha de cinco
indicadores que as TRÊS etapas alimentam: em caixa, vencido a receber,
vencido a pagar, no funil (comercial) e contratos que pedem conversa
(administrativo). Cada cartão é um link para a tela onde se resolve, e
fica vermelho quando é alerta.

### A aba do navegador

Ela não conseguia distinguir este sistema do de demandas no navegador:
mesmo ícone, mesmo título. O ícone agora é claro (o de demandas é o
quadrado vinho cheio), e cada tela põe o próprio nome no título, então
a aba diz "Lançamentos · Favie" em vez de "favie · Gestão de Demandas".

## 5.24 Gráfico que não dá o número não informa, ilustra

> "tudo que eu clicar, eu quero ver a informação... no gráfico de cima,
> eu não consigo ter informação de quanto entrou e quanto saiu. Eu sei
> na média ali por causa da base de referência"

Ela está certa e isso é regra de gráfico, não gosto. Um gráfico em que a
pessoa só consegue ESTIMAR pelo eixo serve para comparar, não para
saber. Os dois gráficos do dashboard agora são clicáveis: clicar (ou
passar o mouse) em qualquer mês escreve os números daquele mês numa
linha logo abaixo.

O que estava errado na solução anterior: eu tinha posto `<title>` em
cada coluna, que é o balãozinho do navegador. Ele só aparece depois de
uns segundos parado com o mouse em cima, e **no celular não existe
passar o mouse**. Para ela, o gráfico simplesmente não tinha número.

Três decisões de detalhe:

- **A área de clique é o mês inteiro, de cima a baixo**, não a coluna.
  Acertar uma barra de 16px com o dedo é impossível.
- **A leitura fica embaixo, com altura fixa.** Balão flutuante exige
  conta de posição e some na borda; uma linha fixa nunca erra, e o
  gráfico não pula quando a pessoa troca de mês.
- **Os gráficos viraram componentes de cliente.** O `/interno` subiu de
  2,4 kB para 108 kB de JavaScript. É o preço de o gráfico responder, e
  vale: antes ele não respondia.

### O resto da mesma conversa

**"Não é início, é dashboard."** Ela tem razão: início é onde você
entra, dashboard é o que a tela faz. A área mudou de nome.

**O gráfico do caixa subiu.** Estava no fim da página; agora os dois
gráficos ficam juntos, logo abaixo do faturamento do ano.

**O ícone do navegador mudou de ENDEREÇO, não só de conteúdo.** Ela
disse que continuava igual, e provavelmente estava: navegador guarda
favicon com unhas e dentes, e trocar o conteúdo do mesmo `/icon.svg`
não troca o que já está em cache. O arquivo agora é
`/public/icone-favie-financeiro.svg`, endereço que nunca existiu, mais
o título por tela ("Lançamentos · Favie").

## 6. Convenções de código

### Nada de travessão

A Fran olhou o sistema e apontou: **"é esse traço"**. O travessão (`—`)
não entra em nada que ela leia, nem na tela, nem nos guias, nem nos
textos que o Claude escreve pra ela.

No lugar dele: vírgula quando a frase continua, dois-pontos quando o
que vem depois explica o que veio antes, ponto quando são duas ideias.
Onde ele era marcador de "sem valor" numa tabela, a célula fica vazia,
que é mais limpo. Onde era sinal de menos (`−`, outro caractere, mesma
aparência), virou o hífen comum.

Vale para código novo: se bater a vontade de usar travessão, é porque
a frase pede outra pontuação.

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
  `lib/financeiro/meses.ts`, nunca com `new Date()` sobre `"YYYY-MM"`, que
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
  - `lib/supabase/client.ts`, navegador (Client Components).
  - `lib/supabase/server.ts`, Server Components/Actions/Route Handlers.
  - `lib/supabase/middleware.ts`, renova a sessão e **protege as rotas**
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

### Autenticado ≠ autorizado

A chave `anon` do Supabase é **pública por natureza**: vai no JavaScript
que o navegador baixa. Com ela, qualquer pessoa chama a API de cadastro
do Supabase, mesmo o app não tendo tela de cadastro. E o trigger
`handle_new_user` cria um profile para quem entrar.

Por isso **estar autenticado não dá acesso a nada**. Uma conta precisa
estar **liberada**:

```sql
-- profiles.approved nasce false
update public.profiles set approved = true where email = '...';
```

Todas as policies exigem `public.usuario_aprovado()`, uma função
`security definer` (precisa ser, senão a policy de `profiles` que a
chama entraria em recursão). Conta não liberada enxerga **só o próprio
profile**, e nada mais.

> **Exceção que confirma a regra:** `personal_entries` e
> `personal_recurrences` (e as `google_*`) exigem `usuario_aprovado()`
> **e** `user_id = auth.uid()`. Conta liberada não basta ali: tem que
> ser a dona da linha. Ver 5.9.

### Ninguém se promove sozinho

O Supabase concede `update` na tabela inteira para `authenticated`.
Revogar coluna a coluna não adianta enquanto o grant de tabela existir -
então a migration revoga a tabela e devolve só o que o app edita:

```sql
revoke update on public.profiles from authenticated, anon;
grant  update (name, avatar_url) on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated, anon;
```

Sem isso, uma conta bloqueada se marcaria `approved = true`, ou se
promoveria a `admin`.

### O resto

- **RLS habilitado em todas as tabelas**, as 23, sem exceção.
- `content_history` é auditoria: tem policy de `select` e `insert`, e
  **nenhuma** de `update`/`delete`, o banco nega os dois.
- Integrações do Google são por usuário (`user_id = auth.uid()`) **e**
  exigem conta liberada.
- Os buckets `client-files` e `company-files` são privados e as policies
  de Storage também exigem conta liberada. Download sai por link
  assinado de 60 segundos.
- Os layouts mostram a tela "conta não liberada" em vez de um sistema
  vazio, o bloqueio real é do banco; a tela só explica.
- Refinamentos por papel (`planner`/`producer`/`admin`) virão depois.
- Nenhuma chave secreta (`service_role`) no cliente.
- Detalhes de execução da migration e cadastro de usuários: `supabase/README.md`.

## 9. Design e responsividade

- Layout com **sidebar fixa no desktop** e **drawer no mobile**.
- Mobile-first; testar em telas pequenas.
- Design system mínimo em `components/ui` (Button, Card, Badge), reusar
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
