/**
 * Prévia visual das peças compartilhadas.
 *
 * O papel creme mudou o sistema inteiro, não só o Início. Esta prévia
 * põe lado a lado tudo que aparece nas outras telas (botão, etiqueta,
 * aviso, campo, tabela, estado vazio, número de área) para a gente
 * olhar de uma vez, em vez de abrir dezoito telas.
 *
 * Não é teste: não afirma nada.
 */
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { Secao } from "@/components/interno/secao";
import { Stat } from "@/components/interno/stat";
import { OrigemItem, OrigemLista } from "@/components/interno/origem-item";
import type { BadgeTone } from "@/types";
import type { AreaId } from "@/lib/interno/areas";

const TONS: BadgeTone[] = [
  "cinza",
  "azul",
  "verde",
  "amarelo",
  "laranja",
  "vermelho",
  "roxo",
];

const AREAS: AreaId[] = [
  "inicio",
  "comercial",
  "administrativo",
  "financeiro",
  "pessoal",
];

function Peças() {
  return (
    <>
      <Secao titulo="Botões" explicacao="As quatro variantes, nos três tamanhos.">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button variante="primaria">Salvar</Button>
            <Button variante="secundaria">Cancelar</Button>
            <Button variante="fantasma">Ver mais</Button>
            <Button variante="perigo">Excluir</Button>
            <Button variante="primaria" tamanho="sm">
              Pequeno
            </Button>
            <Button variante="primaria" tamanho="lg">
              Grande
            </Button>
            <Button variante="primaria" disabled>
              Desabilitado
            </Button>
          </CardContent>
        </Card>
      </Secao>

      <Secao titulo="Etiquetas" explicacao="Os sete tons de status.">
        <Card>
          <CardContent className="flex flex-wrap gap-2">
            {TONS.map((t) => (
              <Badge key={t} tom={t}>
                {t}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </Secao>

      <Secao titulo="Avisos" explicacao="Sucesso, erro e informação.">
        <div className="space-y-2">
          <Alert variante="sucesso">Lançamento salvo.</Alert>
          <Alert variante="erro">Não foi possível salvar: valor em branco.</Alert>
          <Alert variante="info">Esta recorrência gera até Dezembro/2026.</Alert>
        </div>
      </Secao>

      <Secao titulo="Formulário" explicacao="Campo, seleção, texto longo e rótulo.">
        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="a">Descrição</Label>
              <Input id="a" defaultValue="Mensalidade Kiku Sushi" />
            </div>
            <div>
              <Label htmlFor="b">Categoria</Label>
              <Select id="b" defaultValue="1">
                <option value="1">Mensalidade de cliente</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="c">Vazio</Label>
              <Input id="c" placeholder="R$ 0,00" />
            </div>
            <div>
              <Label htmlFor="d">Desabilitado</Label>
              <Input id="d" disabled defaultValue="não editável" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="e">Observações</Label>
              <Textarea id="e" rows={2} defaultValue="Pago via Pix no dia 05." />
            </div>
          </CardContent>
        </Card>
      </Secao>

      <Secao titulo="Números por área" explicacao="A cor diz de onde o dado vem.">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {AREAS.map((a) => (
            <Stat
              key={a}
              rotulo={a}
              valor="R$ 13.150,00"
              detalhe="7 clientes ativos"
              origem={a}
            />
          ))}
        </div>
      </Secao>

      <Secao titulo="Lista com origem" explicacao="O que tem prazo, de todas as áreas.">
        <OrigemLista>
          <OrigemItem
            origem="financeiro"
            titulo="DAS do Simples"
            descricao="Impostos"
            valor="R$ 1.248,90"
            prazo="vence amanhã"
            atrasado
          />
          <OrigemItem
            origem="comercial"
            titulo="Renovar contrato: Studio Bambu"
            descricao="contrato vai até 2026-12"
            valor="R$ 1.300,00"
            prazo="em 2 meses"
          />
          <OrigemItem
            origem="administrativo"
            titulo="Enviar relatório para a Dra. Hemilayne"
            descricao="Clientes"
            prazo="dia 30"
          />
        </OrigemLista>
      </Secao>

      <Secao
        titulo="Cliente sem contrato"
        explicacao="A linha que entra no topo da lista de clientes em Administrativo."
      >
        <ul className="space-y-2">
          <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-alerta bg-white px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  Natural Concept
                </span>
                <Badge tom="vermelho">Sem contrato</Badge>
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">
                paga todo mês, mas o sistema não sabe desde quando, até quando
                vale nem quando reajustar
              </span>
            </span>
            <Button variante="secundaria" tamanho="sm">
              Cadastrar contrato
            </Button>
          </li>
          <li className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    Studio Bambu
                  </span>
                  <Badge tom="verde">Vigente</Badge>
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  desde 01/11/2026 (12 meses de casa) · sem data de fim
                </span>
              </span>
              <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900">
                R$ 1.300,00
              </span>
              <span className="flex shrink-0 gap-1">
                <span className="rounded px-2 py-1 text-xs font-medium text-gray-500">
                  Reajustar
                </span>
                <span className="rounded px-2 py-1 text-xs font-medium text-gray-500">
                  Editar
                </span>
                <span className="rounded px-2 py-1 text-xs font-medium text-gray-400">
                  Excluir
                </span>
              </span>
            </div>
          </li>
        </ul>
      </Secao>

      <Secao titulo="Tabela" explicacao="O padrão de lista de lançamentos.">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2.5 font-semibold text-gray-600">Descrição</th>
                <th className="px-4 py-2.5 font-semibold text-gray-600">Categoria</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600">Valor</th>
                <th className="px-4 py-2.5 font-semibold text-gray-600">Situação</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Mensalidade Kiku Sushi", "Mensalidade de cliente", "R$ 2.200,00", "verde", "Pago"],
                ["Adobe Creative Cloud", "Ferramentas", "R$ 289,00", "amarelo", "Pendente"],
                ["DAS do Simples", "Impostos", "R$ 1.248,90", "vermelho", "Atrasado"],
              ].map(([d, c, v, tom, st]) => (
                <tr key={d} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{d}</td>
                  <td className="px-4 py-2.5 text-gray-600">{c}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-gray-900">
                    {v}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tom={tom as BadgeTone}>{st}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Secao>

      <Secao titulo="Lista vazia" explicacao="Quando não há nada para mostrar.">
        <EmptyState
          titulo="Nenhum lançamento em Outubro/2026"
          descricao="Lance a primeira entrada do mês para o painel começar a responder."
          acao={<Button>Novo lançamento</Button>}
        />
      </Secao>

      <Secao titulo="Cartão com título" explicacao="O cabeçalho padrão dentro do cartão.">
        <Card>
          <CardContent>
            <CardTitle>Entrou e saiu</CardTitle>
            <p className="mt-1 text-sm text-gray-500">
              Texto de apoio, que é o cinza mais usado do sistema.
            </p>
            <p className="mt-3 text-sm text-gray-700">
              Texto corrido, com um <strong className="font-semibold text-gray-900">destaque</strong>{" "}
              e um <span className="text-red-600 font-semibold">número negativo</span> e um{" "}
              <span className="text-green-700 font-semibold">positivo</span>.
            </p>
          </CardContent>
        </Card>
      </Secao>
    </>
  );
}

describe("prévia", () => {
  it("escreve o HTML das peças compartilhadas", () => {
    writeFileSync(
      process.env.SAIDA_COMPONENTES!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="app.css"></head>
<body data-area="financeiro"><div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">${renderToStaticMarkup(
        <Peças />,
      )}</div></body></html>`,
    );
  });
});
