# Atualizar o banco

O sistema tem duas metades: o **site** (que sobe sozinho quando eu
mando o código) e o **banco** (que só muda quando você manda). Quando
eu crio uma tela que guarda coisa nova — temperatura do lead, motivo
da perda, investimento por canal —, a tela sobe, mas o lugar de
guardar não existe ainda. Aí parece que nada mudou.

É isso que este arquivo resolve.

## Quando fazer

Quando eu disser "precisa atualizar o banco". Só nessa hora.

## Como fazer

1. Abra o **Supabase** → o projeto da Favie → menu da esquerda, **SQL
   Editor** → **New query**.

2. Abra o arquivo `supabase/ATUALIZAR.sql` deste repositório no
   GitHub e clique no botão de **copiar** (o ícone de duas folhinhas,
   no canto de cima do arquivo). Ele copia tudo de uma vez.

3. Cole na janela do SQL Editor e clique em **Run**.

4. Deve aparecer **Success. No rows returned**. Pronto.

## Se der erro

Copie a mensagem inteira e me mande. Erro de SQL vem com o número da
linha e eu acho na hora.

## Pode rodar duas vezes?

Pode. O arquivo é feito para isso: ele confere cada coisa antes de
criar, e o que já existe ele deixa quieto. Rodei três vezes seguidas
num banco de teste antes de te entregar, do zero e por cima de um
banco antigo. Se você estiver na dúvida se já rodou, rode de novo —
não quebra nada.

## Antes, se você quiser

`docs/BACKUP_SUPABASE.md` tem como tirar uma cópia do banco. Não é
obrigatório, mas também não custa.
