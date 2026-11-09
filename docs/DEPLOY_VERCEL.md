# Guia de Deploy na Vercel

Passo a passo para publicar o sistema. Tempo estimado: ~15 minutos.
Tudo o que é necessário tem plano gratuito (Supabase e Vercel).

> Pré-requisitos: conta no [GitHub](https://github.com), no
> [Supabase](https://supabase.com) e na [Vercel](https://vercel.com).
> O código já está no repositório GitHub.

---

## Parte 1 — Criar o banco no Supabase

1. Acesse https://supabase.com e clique em **New project**.
2. Dê um nome (ex.: `agencia-social`), defina uma senha do banco (guarde-a) e
   escolha a região mais próxima (ex.: São Paulo). Clique em **Create**.
3. Aguarde o provisionamento (~2 min).
4. Aplique o schema do banco. No menu lateral, abra **SQL Editor** →
   **New query**, cole **todo** o conteúdo de
   [`supabase/schema_completo.sql`](../supabase/schema_completo.sql) e
   clique em **Run**.

   É um arquivo só, com as 20 migrations já na ordem certa — você cola
   uma vez, não vinte. Deve terminar em **Success** (vários avisos
   `NOTICE` no caminho são normais: é o script conferindo o que já
   existe).

   > **Se parar no meio por qualquer motivo, rode de novo.** O arquivo é
   > idempotente: rodar duas vezes não quebra nem duplica nada. Isso foi
   > testado.

   **Opcional — seu histórico de 2026.** Depois do passo acima, abra uma
   nova query e rode
   [`supabase/seed_financeiro.sql`](../supabase/seed_financeiro.sql):
   ele carrega os 149 lançamentos de abril a setembro/2026 da planilha,
   os 15 clientes do período, as recorrências vigentes e as duas sócias.
   Se já houver lançamentos, ele avisa e não faz nada.

   <details>
   <summary>Prefere rodar uma migration por vez?</summary>

   Rode os arquivos de `supabase/migrations/` na ordem do nome (a data no
   começo é a ordem). O `schema_completo.sql` é só a junção deles.

   As quatro últimas são o sistema interno:
   `20260908120000_financeiro`, `20260921120000_comercial`,
   `20260922120000_empresa` e `20260923120000_pessoas`.
   </details>

5. Copie as credenciais: **Project Settings → API**:
   - **Project URL** → será a `NEXT_PUBLIC_SUPABASE_URL`.
   - **anon public** (em Project API keys) → será a `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Parte 1.5 — Fechar o cadastro (IMPORTANTE)

A chave `anon` do Supabase é **pública por natureza**: ela vai no
JavaScript que o navegador baixa, e qualquer pessoa consegue lê-la. Com
ela, dá para chamar a API de cadastro do Supabase direto — mesmo o
sistema não tendo tela de cadastro nenhuma.

Faça as duas coisas abaixo. Elas se protegem uma à outra.

**1. Desligue o cadastro aberto — e SÓ ele.** No Supabase, vá em
**Authentication → Sign In / Providers** e clique em **Email**. Dentro
dessa tela há **dois** interruptores, e confundi-los quebra o login:

| Interruptor | Como tem que ficar | O que ele faz |
| ----------- | ------------------ | ------------- |
| **Enable Email provider** (o de cima) | ✅ **LIGADO** | Permite entrar com e-mail e senha. Desligar isto tranca **todo mundo** para fora, vocês inclusive. |
| **Allow new users to sign up** / *Enable sign ups* | ❌ **DESLIGADO** | É este que impede estranhos de criarem conta sozinhos. |

Como vocês criam as contas à mão, desligar o segundo não atrapalha nada.

> Se o login passar a dizer *"Não foi possível entrar"* para todo mundo,
> quase certamente foi o interruptor de cima que caiu. A API devolve
> `email_provider_disabled` nesse caso.

**2. O sistema já exige conta liberada.** Mesmo que o cadastro fique
aberto por engano, conta nova nasce **bloqueada** (`profiles.approved =
false`) e não enxerga absolutamente nada — nem fluxo de caixa, nem
clientes, nem documentos. Quem cria conta sozinho vê só uma tela
dizendo que precisa ser liberado.

## Parte 2 — Criar os usuários (Fran e Vitória)

1. No Supabase, abra **Authentication → Users → Add user**.
2. Marque **Auto Confirm User** (para já poder logar).
3. Crie a **Vitória**: e-mail + senha. Em **User metadata**, adicione:
   ```json
   { "name": "Vitória", "role": "planner" }
   ```
4. Crie a **Fran**: e-mail + senha. Em **User metadata**:
   ```json
   { "name": "Fran", "role": "producer" }
   ```
   > O trigger `handle_new_user` cria o registro em `profiles` automaticamente
   > com o papel informado. (Detalhes em `supabase/README.md`.)

> **Depois de criar as contas, libere as duas.** No **SQL Editor**:
>
> ```sql
> update public.profiles set approved = true
>  where email in ('email-da-fran@...', 'email-da-vitoria@...');
> ```
>
> Sem isso, vocês entram e veem a tela de "conta não liberada" — que é
> exatamente o que um estranho veria.
>
> Para ver quem está esperando liberação:
>
> ```sql
> select email, name, created_at from public.profiles
>  where not approved order by created_at;
> ```

## Parte 3 — Publicar na Vercel

1. Acesse https://vercel.com → **Add New… → Project**.
2. **Import** o repositório do GitHub. A Vercel detecta Next.js sozinha
   (não é preciso mudar Build Command nem Output).
3. Em **Environment Variables**, adicione as duas variáveis:
   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | a Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a chave anon public |
4. Clique em **Deploy** e aguarde (~1–2 min). Ao final você recebe uma URL
   pública, ex.: `https://agencia-social.vercel.app`.

## Parte 4 — Ajustar as URLs de autenticação no Supabase

Para que a sessão funcione bem no domínio da Vercel:

1. Supabase → **Authentication → URL Configuration**.
2. Em **Site URL**, coloque a URL da Vercel (ex.:
   `https://agencia-social.vercel.app`).
3. Em **Redirect URLs**, adicione a mesma URL (com `/**` ao final, ex.:
   `https://agencia-social.vercel.app/**`).
4. Salve.

> Observação: o login atual é por **e-mail e senha** (sem redirecionamento
> externo), então esse passo é mais uma boa prática para recursos futuros
> (convite/recuperação de senha).

## Pronto!

Acesse a URL da Vercel, faça login com Vitória ou Fran e o sistema estará
no ar. Consulte o [Guia de primeiro acesso](./PRIMEIRO_ACESSO.md).

---

## Atualizações futuras

Todo `git push` para o branch conectado dispara um novo deploy automático na
Vercel. Não é preciso refazer nada acima.

## Armadilhas que já derrubaram um deploy de verdade

Todas estas aconteceram no primeiro deploy real. Estão aqui para não
acontecerem de novo.

**1. O "Project URL" não é o endereço da barra do navegador.**
O endereço da barra, quando você está no painel, é
`https://supabase.com/dashboard/project/SEUCODIGO` — isso é a página de
administração, **não** a API. O valor certo é o que aparece num campo
*dentro* da página de API, e termina em `.supabase.co`:
`https://SEUCODIGO.supabase.co`. Colar o errado dá *"Falha de conexão"*
no login.

**2. As variáveis são do tipo `Config`, não `Secret`.**
Tudo que começa com `NEXT_PUBLIC_` é embutido na página que vai para o
navegador — é público por definição. A Vercel recusa marcá-las como
Secret, e está certa. (Quem protege o sistema é o `approved` + o RLS, não
o segredo da chave `anon`.)

**3. Mudar variável não republica nada.**
`NEXT_PUBLIC_*` entra no código **na hora do build**. Depois de corrigir
qualquer variável: *Deployments* → `⋯` → **Redeploy**, e **desmarque
"Use existing Build Cache"**. Com o cache ligado, o build antigo é
reaproveitado e o erro continua idêntico.

**4. "Enable sign ups" ≠ desligar o login por e-mail.**
Na tela *Authentication → Sign In / Providers → Email* existem dois
interruptores. O de cima (*Enable Email provider*) tem que ficar
**ligado**, senão ninguém entra — nem vocês, e o erro que aparece é
genérico. O de baixo (*Allow new users to sign up*) é o que fica
**desligado**, para estranhos não criarem conta.

**5. A branch que a Vercel publica.**
Em *Settings → Git → Production Branch* tem que estar
`claude/sistema-financeiro-agencia-5owq2u`. A branch padrão do
repositório é outra.

## Solução de problemas

- **Build falha na Vercel:** confira se as duas variáveis de ambiente estão
  cadastradas e sem espaços extras.
- **Login não funciona / "E-mail ou senha inválidos":** confirme que o
  usuário foi criado com **Auto Confirm** e que a senha está correta.
- **Página em branco / erro de sessão:** confira a **Site URL** na Parte 4.
- **Sem dados:** verifique se a migration foi aplicada (Parte 1, passo 4) e
  se há clientes/conteúdos cadastrados.

---

## Conferindo se deu certo

Depois do deploy, abra o endereço da Vercel e faça login. Você cai
direto no **Início** do sistema interno — não há tela de escolha, porque
este projeto é só a administração da empresa.

Um roteiro rápido para saber que está tudo no lugar:

| Onde | O que deve aparecer |
| ---- | ------------------- |
| `/interno` | Os compromissos com prazo, cada linha com a cor da sua área |
| `/interno/financeiro` | O fluxo de caixa; se rodou a carga, com o histórico |
| `/interno/comercial` | A carteira e quanto ela cobre do custo fixo |
| `/interno/pessoas` | Fran e Vitória, com o pró-labore ligado a cada uma |
| `/interno/relatorio` | O fechamento do mês; Ctrl+P deve sair sem o menu |
| `/interno/meus-gastos` | A aba pessoal, com o aviso "Só você vê esta tela" |
| ⌘K (Ctrl+K) | A busca abre e acha um cliente pelo nome |

Se o upload de arquivo reclamar de *"Armazenamento não ativado"*, faltou
rodar o schema completo — os buckets `client-files` e `company-files` são
criados por ele.

### Testando a privacidade dos gastos pessoais

Vale fazer uma vez, porque é a única parte do sistema em que vocês duas
veem coisas diferentes:

1. Entre com o **seu** login, abra `/interno/meus-gastos` e lance um
   gasto qualquer (pode apagar depois).
2. Saia e entre com o login da **Vitória**. Abra a mesma tela.
3. O gasto que você lançou **não pode aparecer**. A tela dela deve estar
   vazia (ou só com o que ela lançou).

Se aparecer, algo saiu errado no schema — me avise, porque isso quer
dizer que a policy `user_id = auth.uid()` não foi criada.

> **O que esse teste NÃO cobre:** quem abre o painel do Supabase vê
> todas as linhas de todas as tabelas, porque é o dono do banco. Vocês
> duas têm esse acesso. A privacidade é entre as telas do sistema, não
> contra o administrador do Supabase. Se um dia isso importar de
> verdade, a saída é cada uma ter o próprio projeto — e aí não é mais o
> mesmo sistema.
