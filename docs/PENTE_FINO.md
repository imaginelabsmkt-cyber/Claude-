# Pente fino: tudo que a Fran pediu, e onde está

Lista viva. Cada linha é uma coisa que a Fran pediu, com data, o que
foi feito e **onde conferir**. Quando ela pedir algo novo, entra aqui
antes de virar código. Quando eu achar que terminei, a prova vai aqui
do lado — arquivo e linha, não "foi feito".

O que está com **✗** não foi feito e não vou dizer que foi.

---

## O jeito de trabalhar

| Pedido | Como está |
|---|---|
| "Não precisa criar do zero, a gente tem que fazer passo a passo" | ✓ Nenhuma reescrita geral. Cada commit mexe numa coisa. |
| "Não muda tudo, precisa deixar o que faz sentido" | ✓ Desde então, só mudo o que ela apontou. |
| "Intuitivo, básico, simples, que eu entenda de primeira" | Em andamento. O financeiro foi de 8 abas para 3 (Mês · Fixos e ferramentas · Ano), o dashboard perdeu um dos dois gráficos (foi para o Ano, que é onde ele responde algo) e os gráficos ficaram mais deitados para caber na tela sem rolar. **Nada foi apagado**: o que saiu do topo virou link. |
| "Você não leva em consideração as coisas que eu te falo" | Este arquivo existe por causa disso. |
| "Já alterou de novo as coisas sem falar comigo" | Regra nova: **mudança de VALOR ou de item só com ela confirmando.** Layout eu mexo e mostro; dado dela, não. |

## Os números

| Pedido | Como está |
|---|---|
| Os números do sistema têm que ser os da planilha | ✓ `supabase/seed_financeiro.sql` sai da planilha do Drive. Conferido mês a mês contra a aba Resumo Anual: abr 15.271/11.548,03 · mai 20.958/16.224,11 · jun 20.418/14.767,16 · jul 18.747/15.567,02 · ago 15.500/15.900,22 · set 15.650/17.813,92 · out 14.150/16.950,16. Bate nos sete. |
| Os meses passados detalhados, item por item | ✓ `supabase/detalhar_historico.sql`, gerado de `scripts/detalhar-historico.py`. O "A CLASSIFICAR — R$ 2.837,74" de outubro era Softbox parcela 3/4 (R$ 671,04) + Mentoria Ultralize (R$ 2.166,70). Total de cada mês idêntico ao da planilha, nos sete. |
| "Teve mês que a gente faturou 20.000 e você não levou em consideração" | ✓ Era maio (R$ 20.958,00) e junho (R$ 20.418,00). **No sistema sempre esteve certo.** Quem estava errado era a PRÉVIA que eu mandei por imagem, que tinha números inventados. Corrigido em `scripts/previa/inicio.previa.tsx`: agora a prévia usa os valores da planilha. |
| Datas de vencimento certas | ✓ Pró-labore dia 10, cartão das assinaturas dia 20, DAS dia 20. `supabase/ajustar_planilha_novembro.sql`. |
| A conta de um mês vence no mês seguinte | ✓ `lib/financeiro/meses.ts`, `dataVencimento`. |
| Tirar Captions e Contabilidade / MEI | ✓ Mesmo SQL. Observação: na aba **Novembro** da planilha os dois ainda estão lá; na aba Outubro, não. |
| O item de R$ 53,00 passa a R$ 35,00 | ✓ Apliquei no **Canva**, que é quem está em R$ 53,00. **Confirmar**: ela falou CapCut, e o CapCut está R$ 32,90 nas duas abas. |
| As três receitas de R$ 2.000 sem nome | ✓ **Não** foram adicionadas. Ela confirmou depois que eram teste. |
| Salte, R$ 1.300,00 | ✓ Adicionada. **Confirmar** se também era teste. |

## O Dashboard

| Pedido | Como está |
|---|---|
| "Não é início, é dashboard" | ✓ `app/interno/page.tsx`. |
| O faturamento anual é a primeira coisa que eu vejo | ✓ `components/interno/cartao-do-ano.tsx`. |
| O dashboard tem que cobrir o sistema todo, não só o financeiro | ✓ Indicadores de caixa, vencido, funil e contratos; "Precisa de você" mistura as três áreas. |
| Gráfico de linha, como o do Mainô | ✓ `components/interno/grafico-caixa.tsx`. |
| Clicar em qualquer ponto e ver o número | ✓ Faixa de clique por mês nos dois gráficos, com a leitura embaixo. |
| "Saiu e sobrou, em qual contexto?" | ✓ Agora é uma conta: faturamento **−** saiu **=** sobrou, com o sinal à vista, como o Resumo Anual da planilha. |
| Meta de faturamento de longo prazo | ✓ `components/interno/meta-do-ano.tsx`. Define em Financeiro > Configurações. |

## O Financeiro

| Pedido | Como está |
|---|---|
| Poder dar check no que já paguei, como na planilha | ✓ `components/financeiro/baixa-rapida.tsx`. |
| Conforme for pago, aparecer o total | ✓ No cabeçalho de cada grupo e no cartão do mês. |
| Um gráfico, uma maneira mais fácil de visualizar | ✓ `components/financeiro/grafico-do-mes.tsx`: entrou × saiu na mesma régua. |
| Ordem alfabética nas listas | ✓ `lib/financeiro/folha.ts` e `lib/financeiro/fixos.ts`. |
| Não repetir "Mensalidade" em toda linha | ✓ `lib/financeiro/nomes.ts`. |
| Tudo autoexplicativo, sem texto explicando | ✓ As 24 linhas de `explicacao` saíram; "Quanto entrou e quanto saiu" e "No que entrou e no que saiu" também. |

## O sistema

| Pedido | Como está |
|---|---|
| Menu em ordem alfabética | ✓ `lib/interno/areas.ts`: Dashboard, Administrativo, Comercial, Financeiro, Meus gastos. |
| Diferenciar a aba do navegador do sistema de demandas | ✓ `app/layout.tsx`: "ADM · Favie" e ícone próprio. |
| Design mais quente, menos seco | ✓ `tailwind.config.ts`: cinzas, branco e as cores de estado redefinidas para o quente. |
| Só eu e a Vitória temos acesso | ✓ RLS em todas as tabelas, `usuario_aprovado()`. |

| "É o faturamento bruto, não faz sentido já tirar tudo" | ✓ O mês agora soma TUDO que está lançado, como a planilha: o TOTAL RECEITAS de outubro lá é R$ 14.150,00 e inclui a Malukies de R$ 2.600,00 marcada "Pendente". O status virou marcação (já caiu / ainda não), não a base do cálculo. Conferido contra o Resumo Anual: os sete meses e o Saldo Acumulado batem na vírgula. |

| Cada cliente tem seu dia de vencimento | ✓ Kiku 10, Malukies 10, Laura 25, Natural Concept 25, pró-labore 10, cartão das ferramentas 20 — sempre no mês seguinte ao da competência. `supabase/vencimentos_por_cliente.sql`. Studio Bambu dia 25 (Cláusula 5 do contrato no Drive) e Izabela em duas parcelas de R$ 900,00, dia 10 e dia 25. **Falta só a Salte.** |
| Um arquivo só para atualizar o banco | ✓ `supabase/ATUALIZAR.sql`, montado por `scripts/montar-atualizar.sh`. Eram quatro arquivos em ordem; por isso outubro ficou agrupado e o Captions continuou em novembro. |

## O que os outros sistemas fazem (pesquisa, nov/2026)

A Fran pediu isso mais de uma vez: "por isso que eu pedi para você
buscar outros sistemas, por isso que eu te mostrei outros sistemas de
como funcionam". Fui ver — Conta Azul, Nibo, Granatum, QuickBooks
Online e Xero.

Eles divergem em quase tudo e **concordam em três lugares**:

1. **Um painel de abertura** com saldo em caixa, o que está atrasado a
   receber, o que vence a pagar e o fluxo de caixa num gráfico. O Xero
   recomenda abrir essa tela toda semana só para ver se tem surpresa.
2. **Uma tela de movimento**: o dinheiro entrando e saindo. O
   QuickBooks tem DUAS versões do mesmo menu — a *Accountant view*,
   com "Sales" e "Expenses" separados, e a *Business view*, para quem
   não é contador, que junta os dois numa aba só. A planilha da Fran é
   a Business view: receitas e despesas na mesma aba do mês.
3. **Uma estante de relatórios.** Ninguém tem aba chamada "Ano"; todo
   mundo tem "Relatórios", e o resumo do ano é o primeiro item lá
   dentro. O QuickBooks de 2026 foi ainda mais longe e deixou a barra
   com quase nada: Dashboard, Feed, Reports.

O que mudou aqui por causa disso: o financeiro ficou com **Mês ·
Fixos e ferramentas · Relatórios**, e as cinco telas que não estavam
em lugar nenhum (resumo do ano, caixa mês a mês, por cliente,
impostos, fechamento para imprimir) ganharam endereço dentro de
Relatórios, cada uma com a pergunta que responde.

Fontes: [Conta Azul — gestão financeira](https://contaazul.com/funcionalidades/gestao-financeira/),
[Nibo](https://www.idinheiro.com.br/negocios/nibo/),
[Granatum](https://www.b2bstack.com.br/product/granatum),
[QuickBooks Online — navigation menu](https://quickbooks.intuit.com/learn-support/en-uk/help-article/invoicing/understand-navigation-menu-quickbooks-online/L8cX8o5Ep_GB_en_GB),
[Xero — key areas](https://help.1stformations.co.uk/accounting-service/navigating-xero-the-key-areas-to-know).

## Ainda não feito

| Pedido | Situação |
|---|---|
| "O administrativo tá super seco, desinteressante" | ✗ |
| Mensal e anual não se conectam: "se eu quiser ver o anual eu não consigo" | ✓ A terceira aba virou **Relatórios**, e o resumo do ano é o primeiro item dentro dela — como em todos os sistemas que pesquisei. |
| Propostas comerciais com revisão | ✗ |
| Relatórios de DRE, inadimplência, receita recorrente | ✗ |
