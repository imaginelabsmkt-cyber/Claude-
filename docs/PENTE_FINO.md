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
| "Você não leva em consideração as coisas que eu te falo" | Este arquivo existe por causa disso. |
| "Já alterou de novo as coisas sem falar comigo" | Regra nova: **mudança de VALOR ou de item só com ela confirmando.** Layout eu mexo e mostro; dado dela, não. |

## Os números

| Pedido | Como está |
|---|---|
| Os números do sistema têm que ser os da planilha | ✓ `supabase/seed_financeiro.sql` sai da planilha do Drive. Conferido mês a mês contra a aba Resumo Anual: abr 15.271/11.548,03 · mai 20.958/16.224,11 · jun 20.418/14.767,16 · jul 18.747/15.567,02 · ago 15.500/15.900,22 · set 15.650/17.813,92 · out 14.150/16.950,16. Bate nos sete. |
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

## Ainda não feito

| Pedido | Situação |
|---|---|
| "O administrativo tá super seco, desinteressante" | ✗ |
| Mensal e anual não se conectam: "se eu quiser ver o anual eu não consigo" | ✗ |
| Propostas comerciais com revisão | ✗ |
| Relatórios de DRE, inadimplência, receita recorrente | ✗ |
