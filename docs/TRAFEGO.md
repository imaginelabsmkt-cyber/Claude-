# Cobrança de Tráfego (Pix + WhatsApp) — Guia de uso

Este módulo automatiza o envio semanal das cobranças de tráfego pelo
WhatsApp, o acompanhamento de quem pagou e os lembretes automáticos de
quem não pagou.

## Como funciona (resumo honesto)

O Facebook **não permite** que nenhum sistema externo gere aquele código
Pix de abastecimento da conta de anúncios — isso é uma trava da própria
Meta. Por isso o Pix continua sendo gerado por você, na mão, dentro do
Facebook. O que o sistema automatiza é **todo o resto**:

| Etapa | Quem faz |
| --- | --- |
| Gerar o Pix de cada cliente no Facebook | **Você** (a Meta obriga) |
| Enviar o Pix no WhatsApp toda segunda | 🤖 Sistema |
| Controlar quem pagou / não pagou | Você marca "pago" (1 clique) |
| Cobrar quem não pagou | 🤖 Sistema (lembrete automático) |

> O pagamento cai direto no Facebook (não passa por você), então o sistema
> não tem como detectar o pagamento sozinho — por isso a confirmação de
> "pago" é um clique manual na tela.

## Fluxo semanal na prática

1. Toda segunda, a rotina automática **gera as cobranças da semana** (uma
   por cliente marcado para tráfego) já com o valor fixo de cada um.
2. Você abre **Tráfego**, gera os Pix no Facebook e **cola o código de cada
   cliente** no card correspondente.
3. Clica em **Enviar** (ou em **Enviar pendentes** para disparar todos de
   uma vez). A mensagem sai do seu WhatsApp com o valor e o Pix.
4. Quando o cliente pagar, clique em **Marcar como pago**.
5. Quem não pagar recebe **lembretes automáticos** conforme as regras
   definidas em *Configurações*.

## Configuração do cliente

No cadastro do cliente (Clientes → editar), seção **Cobrança de tráfego**:

- **Incluir na cobrança semanal** — liga/desliga o cliente.
- **WhatsApp** — DDD + número (o DDI 55 é adicionado automaticamente).
- **Valor semanal (R$)** — valor fixo cobrado toda semana.
- **Código Pix padrão** — deixe **em branco** (o Pix do Facebook muda toda
  semana; você cola na hora). Preencha só se o cliente tiver um Pix fixo.

## Colocando para funcionar (deploy)

### 1. Banco de dados
Rode a migration `supabase/migrations/20260812120000_traffic_billing.sql`
no seu projeto Supabase (SQL Editor ou CLI). Ela cria as colunas de
cobrança em `clients`, as tabelas `traffic_charges` e `traffic_settings`,
índices, RLS e os modelos de mensagem padrão.

### 2. Variáveis de ambiente (Vercel → Settings → Environment Variables)
Veja `.env.example`. Para a automação:

- `SUPABASE_SERVICE_ROLE_KEY` — chave service_role do Supabase (server-only).
- `CRON_SECRET` — um valor aleatório forte (protege as rotas de automação).

Para o WhatsApp (enquanto não configurar, roda em **modo teste**, sem
enviar de verdade):

- `WHATSAPP_PROVIDER` = `simulacao` (padrão), `evolution` ou `zapi`.
- **Evolution API** (auto-hospedada, gratuita): `EVOLUTION_API_URL`,
  `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`.
- **Z-API** (paga, simples): `ZAPI_INSTANCE`, `ZAPI_TOKEN`,
  `ZAPI_CLIENT_TOKEN`.

> **Conectar seu número:** tanto Evolution quanto Z-API conectam ao seu
> WhatsApp escaneando um QR code (como o WhatsApp Web). Depois disso, as
> mensagens saem do seu próprio número.

### 3. Agendamentos (cron)
Já definidos em `vercel.json`:

- `/api/cron/trafego-enviar` — **segunda-feira** (gera a semana e envia
  automaticamente quem tem Pix fixo).
- `/api/cron/trafego-lembretes` — **diário** (lembretes de atraso).

O Vercel Cron chama essas rotas sozinho, enviando o `CRON_SECRET`. Para
testar manualmente:
`GET /api/cron/trafego-lembretes?secret=SEU_CRON_SECRET`.

## Configurações (Tráfego → Configurações)

- **Vencimento** (dias após a segunda), **1º lembrete após**, **intervalo
  entre lembretes** e **máximo de lembretes**.
- **Modelos de mensagem** (cobrança e lembrete), com atalhos:
  `{cliente}`, `{valor}`, `{pix}`, `{semana}`, `{vencimento}`.
