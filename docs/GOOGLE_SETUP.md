# Conectar o Google (Agenda + Tarefas) — passo a passo

Isto é feito **uma vez só**. No fim, você terá duas "chaves" (Client ID e
Client Secret) para colar na Vercel, e aí o botão "Conectar Google Agenda"
em **Configurações** passa a funcionar.

## Parte 1 — Criar as chaves no Google Cloud (~10 min)

1. Entre em https://console.cloud.google.com e faça login com a conta Google
   que vocês usam.
2. No topo, crie um **projeto novo** (ex.: "Imagine") e selecione ele.
3. Menu → **APIs e serviços → Biblioteca**. Ative estas duas:
   - **Google Calendar API**
   - **Google Tasks API**
4. Menu → **APIs e serviços → Tela de permissão OAuth**:
   - Tipo: **Externo** → Criar.
   - Nome do app: "Imagine"; e-mail de suporte: o seu; e-mail do desenvolvedor: o seu.
   - Em **Usuários de teste**, adicione os e-mails que vão conectar
     (o seu e o da Vitória). *(Enquanto o app ficar em "teste", só esses
     e-mails conseguem conectar — que é tudo que precisamos.)*
   - Salvar.
5. Menu → **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo de aplicativo: **Aplicativo da Web**.
   - **URIs de redirecionamento autorizados** → Adicionar:
     - `https://SEU-SITE.vercel.app/api/google/callback`
       (troque pelo endereço real do seu site; se tiver domínio próprio,
       adicione os dois)
     - (opcional, para testar local) `http://localhost:3000/api/google/callback`
   - Criar. O Google mostra **Client ID** e **Client Secret** — copie os dois.

## Parte 2 — Colar as chaves na Vercel (~2 min)

1. Entre em https://vercel.com → seu projeto → **Settings → Environment Variables**.
2. Adicione duas variáveis (ambiente: Production e Preview):
   - `GOOGLE_CLIENT_ID` = (o Client ID copiado)
   - `GOOGLE_CLIENT_SECRET` = (o Client Secret copiado)
3. **Redeploy** o projeto (Deployments → ... → Redeploy) para as variáveis valerem.

## Parte 3 — Rodar a migration no Supabase

No Supabase → SQL Editor, rode o arquivo:
`supabase/migrations/20260718120000_google_integration.sql`

## Parte 4 — Conectar

Abra o site → **Configurações → Google Agenda → Conectar Google Agenda**.
Faça login/autorize. Deve voltar dizendo "Google conectado com sucesso".

> Se aparecer "o Google não devolveu a permissão", entre em
> https://myaccount.google.com/permissions, remova o acesso do app "Imagine"
> e conecte de novo.

Depois disso me avise que **eu ligo os eventos e as tarefas** (Etapa B):
gravação → evento na Agenda; edição → tarefa com o quadradinho.
