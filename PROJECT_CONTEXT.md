# PROJECT_CONTEXT — Regras do Sistema

Este documento é a **fonte de verdade das regras de negócio e convenções**
do sistema. Deve ser lido antes de qualquer implementação e mantido
atualizado a cada etapa.

---

## 1. Objetivo do sistema

Gerenciar todo o ciclo de produção de conteúdo de uma agência de social
media — do planejamento à publicação —, de forma que duas pessoas
consigam coordenar o trabalho sem depender de planilhas soltas.

## 2. Usuários e papéis

O sistema tem **dois usuários** no MVP, cada um com um papel:

| Usuário  | Papel (`papel`)   | Responsabilidades                                              |
| -------- | ----------------- | -------------------------------------------------------------- |
| Vitória  | `planejamento`    | Pautas, roteiros, organização e agendamento das postagens.     |
| Fran     | `edicao`          | Gravações, edições, ajustes e acompanhamento da publicação.    |

- Existe também o papel `admin` (reservado para futura gestão de usuários).
- Papéis controlam **visibilidade de UI** e, futuramente, permissões (RLS).
- Ambos os usuários enxergam todas as páginas no MVP; a restrição por papel
  é opcional e configurável via `lib/navigation.ts`.

## 3. Conceito central: o Conteúdo e seu pipeline

O **Conteúdo** é a entidade central. Todo o resto orbita em torno dele.
Um conteúdo percorre um **pipeline linear de status**:

```
ideia → roteiro → aprovado → gravacao → edicao → revisao → agendado → publicado
```

| Status      | Significado                                    | Responsável típico |
| ----------- | ---------------------------------------------- | ------------------ |
| `ideia`     | Pauta em rascunho                              | Vitória            |
| `roteiro`   | Roteiro sendo escrito                          | Vitória            |
| `aprovado`  | Roteiro pronto, liberado para gravar           | Vitória            |
| `gravacao`  | Aguardando/realizando gravação                 | Fran               |
| `edicao`    | Na fila de edição                              | Fran               |
| `revisao`   | Editado, aguardando aprovação                  | Vitória            |
| `agendado`  | Aprovado e agendado para publicar              | Fran               |
| `publicado` | Publicado nas redes                            | Fran               |

**Regra anti-duplicação (importante):**
As páginas **Gravações** e **Fila de edição** NÃO são entidades novas —
são **visões filtradas** do pipeline de Conteúdo (status `gravacao` e
`edicao`, respectivamente). Isso evita funcionalidade duplicada. Registros
auxiliares (`Gravacao`, `Postagem`) apenas guardam metadados específicos da
etapa, sempre vinculados a um `conteudo_id`.

## 4. Entidades (modelos de dados)

Definidas em `types/index.ts`. Resumo:

- **Perfil** — usuário (`id` = `auth.users.id`), `papel`.
- **Cliente** — cliente atendido pela agência.
- **Conteudo** — entidade central (pauta/roteiro + pipeline). Referencia
  `cliente_id`, `responsavel_planejamento_id`, `responsavel_producao_id`.
- **Gravacao** — metadados da captação; `conteudo_id` (1:N).
- **Postagem** — metadados do agendamento/publicação; `conteudo_id` (1:N).
- **Tarefa** — tarefa avulsa atribuída a um usuário; pode referenciar
  `conteudo_id` (opcional). Alimenta "Minhas tarefas".

Relacionamentos:

```
Cliente 1 ── N Conteudo
Conteudo 1 ── N Gravacao
Conteudo 1 ── N Postagem
Conteudo 1 ── N Tarefa (opcional)
Perfil   1 ── N Conteudo (como responsável)
Perfil   1 ── N Tarefa   (como responsável)
```

## 5. Páginas e responsabilidade única

| Rota              | Página          | Opera sobre                          |
| ----------------- | --------------- | ------------------------------------ |
| `/login`          | Login           | Sessão (Supabase Auth)               |
| `/dashboard`      | Dashboard       | Indicadores agregados (somente leitura) |
| `/conteudos`      | Conteúdos       | `Conteudo` (CRUD + pipeline)         |
| `/clientes`       | Clientes        | `Cliente` (CRUD)                     |
| `/gravacoes`      | Gravações       | `Conteudo` (status `gravacao`) + `Gravacao` |
| `/fila-edicao`    | Fila de edição  | `Conteudo` (status `edicao`)         |
| `/postagens`      | Postagens       | `Postagem`                           |
| `/minhas-tarefas` | Minhas tarefas  | `Tarefa` (filtrado por usuário)      |
| `/configuracoes`  | Configurações   | `Perfil` + preferências              |

Cada página tem **uma responsabilidade**. Nenhuma duplica a função de outra:
o CRUD de conteúdo vive só em `/conteudos`; as demais páginas de pipeline são
recortes de leitura/ação sobre o mesmo dado.

## 6. Convenções de código

- **Rotas/arquivos:** `kebab-case`.
- **Componentes:** `PascalCase`.
- **Funções/variáveis:** `camelCase`, em português.
- **Campos de domínio/banco:** `snake_case`, em português (Postgres-friendly).
- **Datas:** trafegam como string ISO 8601; exibidas via `formatarData()`.
- **IDs:** UUID.
- **Textos de UI:** português do Brasil, sempre.
- **Classes Tailwind:** compor com `cn()` (clsx + tailwind-merge).
- **Rótulos de enums:** centralizados em `types/index.ts` (`ROTULOS_*`).
- **Navegação/rotas:** centralizadas em `lib/navigation.ts` (não repetir).

## 7. Arquitetura técnica

- **Next.js App Router.** Server Components por padrão; Client Components só
  quando há interatividade/estado (marcados com `"use client"`).
- **Supabase:**
  - `lib/supabase/client.ts` — navegador (Client Components).
  - `lib/supabase/server.ts` — Server Components/Actions/Route Handlers.
  - `lib/supabase/middleware.ts` — renova a sessão. A proteção de rotas
    (redirecionamentos) é habilitada na etapa de autenticação.
- **Autenticação:** Supabase Auth (e-mail/senha). Na etapa de auth, o
  `middleware.ts` passará a redirecionar não autenticados para `/login` e
  autenticados para fora de `/login`. Na base técnica ainda não há bloqueio.
- **Variáveis de ambiente:** apenas `NEXT_PUBLIC_*` (ver `.env.example`).
  Nunca commitar `.env.local`.

## 8. Segurança (a aplicar nas etapas de banco/auth)

- Habilitar **RLS** em todas as tabelas do Supabase.
- Políticas: usuário autenticado da agência pode ler/escrever os dados da
  agência; refinamentos por papel conforme necessidade.
- Nenhuma chave secreta (service_role) no cliente.

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
