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
   **New query** e rode os arquivos de `supabase/migrations/` **um a um, na
   ordem do nome** (a data no começo do nome é a ordem). Cole o conteúdo,
   clique em **Run**, confira que terminou sem erro e passe ao próximo:

   | # | Arquivo | O que cria |
   | - | ------- | ---------- |
   | 1 | `20260714120000_initial_schema.sql` | Base: perfis, clientes, conteúdos |
   | 2 | `20260715120000_client_niche_monthly_goal.sql` | Nicho e meta do cliente |
   | 3 | `20260715130000_content_script_caption.sql` | Roteiro e legenda |
   | 4 | `20260715140000_content_reference_url.sql` | Link de referência |
   | 5 | `20260716120000_hardening_rls.sql` | Reforço de segurança |
   | 6 | `20260717120000_content_recording_time.sql` | Hora da gravação |
   | 7 | `20260718120000_google_integration.sql` | Integração com o Google |
   | 8 | `20260719120000_plannings.sql` | Planejamentos mensais |
   | 9 | `20260720120000_planning_google_sync.sql` | Sincronia do planejamento |
   | 10 | `20260721120000_planning_situation.sql` | Situação do planejamento |
   | 11 | `20260722120000_google_calendars.sql` | Agendas do Google |
   | 12 | `20260723120000_content_cover_source.sql` | Origem da capa |
   | 13 | `20260724120000_client_files.sql` | Arquivos do cliente |
   | 14 | `20260725120000_client_onboarding_reports.sql` | Onboard e relatórios |
   | 15 | `20260726120000_client_diagnostics.sql` | Diagnósticos |
   | 16 | `20260727120000_report_analysis.sql` | Análise de relatório |
   | 17 | `20260908120000_financeiro.sql` | **Financeiro** (fluxo de caixa) |
   | 18 | `20260921120000_comercial.sql` | **Comercial** (funil e propostas) |
   | 19 | `20260922120000_empresa.sql` | **Empresa** (documentos e prazos) |
   | 20 | `20260923120000_pessoas.sql` | **Pessoas** (equipe e freelas) |

   > Todas são idempotentes: se você rodar de novo por engano, não quebra
   > nem duplica nada.

   **Opcional — seu histórico de 2026.** Depois da migration 17, você pode
   rodar `supabase/seed_financeiro.sql`: ele carrega os 149 lançamentos de
   abril a setembro/2026 da planilha, os 15 clientes do período e as
   recorrências vigentes. Se já houver lançamentos, ele não faz nada.
5. Copie as credenciais: **Project Settings → API**:
   - **Project URL** → será a `NEXT_PUBLIC_SUPABASE_URL`.
   - **anon public** (em Project API keys) → será a `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

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

## Solução de problemas

- **Build falha na Vercel:** confira se as duas variáveis de ambiente estão
  cadastradas e sem espaços extras.
- **Login não funciona / "E-mail ou senha inválidos":** confirme que o
  usuário foi criado com **Auto Confirm** e que a senha está correta.
- **Página em branco / erro de sessão:** confira a **Site URL** na Parte 4.
- **Sem dados:** verifique se a migration foi aplicada (Parte 1, passo 4) e
  se há clientes/conteúdos cadastrados.
