# Guia de Backup do Supabase

Como proteger os dados do sistema (clientes, conteúdos, histórico e
comentários). Recomenda-se um backup periódico (ex.: semanal).

## Opção 1 — Backups automáticos do Supabase (mais simples)

O Supabase mantém backups do banco automaticamente:

- **Plano Free:** backups diários com retenção curta (o Supabase pode pausar
  projetos inativos — mantenha o projeto ativo ou faça exportações manuais).
- **Planos pagos (Pro+):** backups diários com maior retenção e
  **Point-in-Time Recovery (PITR)**.

Onde ver: **Dashboard → Database → Backups**. Para restaurar, use o botão de
restore da data desejada.

> Recomendação: para uso profissional contínuo, o plano Pro dá tranquilidade
> com PITR. No Free, complemente com as exportações manuais abaixo.

## Opção 2 — Exportação manual via SQL (rápida)

No **SQL Editor**, rode e baixe o resultado (botão de exportar CSV) para cada
tabela que quer guardar:

```sql
select * from public.clients;
select * from public.contents;
select * from public.content_history;
select * from public.comments;
select * from public.profiles;
```

Guarde os CSVs em local seguro (ex.: Google Drive da agência).

## Opção 3 — Dump completo via CLI (mais robusto)

Requer a [Supabase CLI](https://supabase.com/docs/guides/cli) e a
connection string do banco (**Project Settings → Database → Connection string**).

```bash
# Estrutura + dados de todo o schema public
supabase db dump --db-url "postgresql://postgres:SENHA@HOST:5432/postgres" \
  -f backup_$(date +%Y%m%d).sql
```

> Substitua `SENHA` e `HOST` pelos valores do seu projeto. Nunca versione o
> arquivo de backup nem a senha no Git.

Para **restaurar** um dump em um projeto novo/limpo:

```bash
psql "postgresql://postgres:SENHA@HOST:5432/postgres" -f backup_AAAAMMDD.sql
```

## Boas práticas

- Faça backup **antes** de qualquer mudança grande (nova migration, limpeza
  de dados).
- Guarde ao menos as 2–3 exportações mais recentes.
- Teste uma restauração de tempos em tempos para garantir que o backup presta.
- Mantenha as credenciais do banco (senha, connection string) fora do
  repositório e fora de mensagens.
