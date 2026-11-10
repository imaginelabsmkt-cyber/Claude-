#!/usr/bin/env python3
"""
Gera supabase/detalhar_historico.sql a partir da planilha da Fran.

    python3 -I scripts/detalhar-historico.py /caminho/Fluxo_Caixa_Imagine_Labs_2026.xlsx

POR QUE EXISTE

O seed trouxe as despesas dos meses passados AGRUPADAS: uma linha
"Pró-labore (sócias) R$ 13.000,00", uma linha "Assinaturas e
ferramentas digitais R$ 1.026,37", e — pior — uma linha "A CLASSIFICAR
— diferença da planilha" só para o total fechar.

A Fran, olhando outubro: "aqui precisa sim estar detalhado, porque não
tá em nenhum outro lugar". Está certíssima: o mês passado só existe
aqui. Se o sistema agrupa, a informação morreu.

Este script lê cada aba mensal da planilha e escreve uma linha por
item, como ela digitou. O "A CLASSIFICAR" de outubro, por exemplo, era
Softbox parcela 3/4 (R$ 671,04) mais Mentoria Ultralize (R$ 2.166,70).

O ARQUIVO GERADO é idempotente: só apaga as linhas-bloco (aquelas cuja
descrição é o nome da própria categoria) e só insere o que ainda não
existe.
"""
import sys
import zipfile
import re
import xml.etree.ElementTree as ET

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

MESES = {
    "Abril": "2026-04", "Maio": "2026-05", "Junho": "2026-06",
    "Julho": "2026-07", "Agosto": "2026-08", "Setembro": "2026-09",
    "Outubro": "2026-10",
}

# Novembro e dezembro NÃO entram: são os meses vivos, que o sistema
# gera a partir das recorrências (Fixos e ferramentas), já com as
# correções que a Fran pediu — sem Captions, sem Contabilidade / MEI,
# Canva em R$ 35,00. Se eles viessem daqui, a planilha, que ainda tem
# os três, desfaria a correção.

# Nome curto na planilha -> nome do cliente no sistema.
CLIENTES = {
    "Bambu": "Studio Bambu",
    "Izabela": "Izabela Schipitoski",
    "Hemilayne": "Dra. Hemilayne",
    "Dra. Hemilayne": "Dra. Hemilayne",
    "Studio Bambu": "Studio Bambu",
    "Salte": "Salte",
}

# Linha solta de despesa (sem "↳" acima) -> categoria.
CATEGORIA_POR_NOME = {
    "Pró-labore Fran": "Pró-labore (sócias)",
    "Pró-labore Vitória": "Pró-labore (sócias)",
    "Freelancers / colaboradores": "Freelancers / colaboradores",
    "Tráfego pago (gestão)": "Tráfego pago (gestão)",
    "Telefone / internet": "Telefone / internet",
    "Contabilidade / MEI": "Contabilidade / MEI",
    "DAS - Simples Nacional": "DAS - Simples Nacional",
}

# "↳ Alguma coisa" -> categoria.
CATEGORIA_POR_SECAO = {
    "Assinaturas e ferramentas digitais": "Assinaturas e ferramentas digitais",
    "Equipamentos": "Equipamentos",
    "Equipamentos/mentoria": "Equipamentos",
    "Transporte / deslocamento": "Transporte / deslocamento",
    "Outros custos operacionais": "Outros custos operacionais",
    "Projetos avulsos": "Projetos avulsos",
}

# A linha-bloco tem a descrição igual ao nome da categoria. Duas
# categorias são itens de verdade com o mesmo nome, e por isso o item
# detalhado entra com outro nome (o mesmo da recorrência).
RENOMEAR = {
    "DAS - Simples Nacional": "DAS do Simples Nacional",
    "Contabilidade / MEI": "Honorários da contabilidade",
}

# O dia em que a conta de cada categoria vence, no mês SEGUINTE ao de
# competência: "a gente se paga dia 10" e "o cartão, que tem as
# assinaturas, vence dia 20".
DIA = {
    "Pró-labore (sócias)": 10,
    "Assinaturas e ferramentas digitais": 20,
    "DAS - Simples Nacional": 20,
}
DIA_PADRAO = 10

LUMPS = [
    "Pró-labore (sócias)",
    "Assinaturas e ferramentas digitais",
    "Equipamentos",
    "Outros custos operacionais",
    "Transporte / deslocamento",
    "Tráfego pago (gestão)",
    "Contabilidade / MEI",
    "DAS - Simples Nacional",
    "Telefone / internet",
    "Freelancers / colaboradores",
    "A CLASSIFICAR — diferença da planilha",
    "Projetos avulsos",
    "Projeto avulso",
]


def abas(caminho):
    z = zipfile.ZipFile(caminho)
    textos = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")):
            textos.append("".join(t.text or "" for t in si.iter(NS + "t")))
    rels = {}
    for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels")):
        alvo = r.get("Target").lstrip("/")
        rels[r.get("Id")] = alvo if alvo.startswith("xl/") else "xl/" + alvo
    for sh in ET.fromstring(z.read("xl/workbook.xml")).iter(NS + "sheet"):
        yield sh.get("name"), z.read(rels[sh.get(REL + "id")]), textos


def linhas(xml, textos):
    """Cada linha da aba como {coluna: valor}."""
    for row in ET.fromstring(xml).iter(NS + "row"):
        celulas = {}
        for c in row.iter(NS + "c"):
            v = c.find(NS + "v")
            if v is None or v.text is None:
                continue
            col = re.match(r"([A-Z]+)", c.get("r")).group(1)
            celulas[col] = textos[int(v.text)] if c.get("t") == "s" else v.text
        yield celulas


def vencimento(mes, dia):
    ano, m = int(mes[:4]), int(mes[5:7])
    m += 1
    if m == 13:
        ano, m = ano + 1, 1
    ultimo = [31, 29 if ano % 4 == 0 else 28, 31, 30, 31, 30,
              31, 31, 30, 31, 30, 31][m - 1]
    return f"{ano}-{m:02d}-{min(dia, ultimo):02d}"


def ler(caminho):
    itens = []
    for nome, xml, textos in abas(caminho):
        mes = MESES.get(nome)
        if not mes:
            continue
        bloco = None
        secao = None
        for cel in linhas(xml, textos):
            a = (cel.get("A") or "").strip()
            if a.startswith("💰"):
                bloco, secao = "Receita", None
                continue
            if a.startswith("📤"):
                bloco, secao = "Despesa", None
                continue
            if a.startswith("TOTAL"):
                bloco, secao = None, None
                continue
            if bloco is None or not a:
                continue
            if a.startswith("↳"):
                secao = a.lstrip("↳ ").strip()
                continue
            try:
                valor = round(float(cel.get("B") or 0), 2)
            except ValueError:
                continue
            if valor <= 0:
                continue

            status = (cel.get("C") or "Pendente").strip() or "Pendente"
            if bloco == "Despesa":
                categoria = (
                    CATEGORIA_POR_SECAO.get(secao)
                    or CATEGORIA_POR_NOME.get(a)
                    or "Outros custos operacionais"
                )
                cliente = None
                descricao = RENOMEAR.get(a, a)
            else:
                cliente = CLIENTES.get(a, a if a in CLIENTES.values() else None)
                if secao or cliente is None:
                    categoria, cliente = "Projetos avulsos", None
                    descricao = a
                else:
                    categoria = "Mensalidades / clientes recorrentes"
                    descricao = f"Mensalidade {cliente}"

            itens.append({
                "mes": mes, "kind": bloco, "categoria": categoria,
                "cliente": cliente, "descricao": descricao, "valor": valor,
                "status": "Pago" if status == "Pago" else "Pendente",
                "vence": vencimento(mes, DIA.get(categoria, DIA_PADRAO)),
            })
    return itens


def aspas(texto):
    return "'" + texto.replace("'", "''") + "'"


def sql(itens):
    meses = sorted({i["mes"] for i in itens})
    fora = ", ".join(aspas(l) for l in LUMPS)
    linhas_sql = [
        "-- =============================================================",
        "-- DETALHAR O HISTÓRICO: uma linha por item, como na planilha",
        "--",
        "-- GERADO por scripts/detalhar-historico.py a partir de",
        "-- Fluxo_Caixa_Imagine_Labs_2026. Não editar à mão.",
        "--",
        "-- O sistema guardava os meses passados agrupados: uma linha",
        '-- "Pró-labore (sócias) R$ 13.000,00", uma linha "Assinaturas e',
        '-- ferramentas digitais R$ 1.026,37" e uma linha "A CLASSIFICAR"',
        "-- só para o total fechar. A Fran, olhando outubro: \"aqui precisa",
        '-- sim estar detalhado, porque não tá em nenhum outro lugar".',
        "--",
        "-- Aqui vem cada item. O que ela já marcou como pago continua pago.",
        "--",
        "--   Supabase > SQL Editor > New query > colar tudo > Run.",
        "--",
        "-- Pode rodar quantas vezes quiser.",
        "-- =============================================================",
        "",
        "-- 1. Fora as linhas-bloco (descrição igual ao nome da categoria).",
        "delete from public.financial_entries",
        f" where reference_month in ({', '.join(aspas(m) for m in meses)})",
        f"   and kind = 'Despesa'",
        f"   and description in ({fora});",
        "",
        "-- 2. Uma linha por item.",
    ]
    for i in itens:
        if i["kind"] != "Despesa":
            continue
        pago = aspas(i["vence"]) if i["status"] == "Pago" else "null"
        linhas_sql += [
            "insert into public.financial_entries",
            "  (reference_month, kind, category_id, description, amount, status, due_date, paid_date)",
            f"select {aspas(i['mes'])}, 'Despesa', c.id, {aspas(i['descricao'])},"
            f" {i['valor']:.2f}, {aspas(i['status'])}, {aspas(i['vence'])}, {pago}",
            "  from public.financial_categories c",
            f" where c.kind = 'Despesa' and c.name = {aspas(i['categoria'])}",
            "   and not exists (",
            "     select 1 from public.financial_entries e",
            f"      where e.reference_month = {aspas(i['mes'])}",
            f"        and e.description = {aspas(i['descricao'])}",
            "   );",
        ]
    return "\n".join(linhas_sql) + "\n"


if __name__ == "__main__":
    itens = ler(sys.argv[1])
    destino = sys.argv[2] if len(sys.argv) > 2 else "supabase/detalhar_historico.sql"
    with open(destino, "w", encoding="utf-8") as f:
        f.write(sql(itens))
    por_mes = {}
    for i in itens:
        if i["kind"] == "Despesa":
            por_mes[i["mes"]] = por_mes.get(i["mes"], 0) + i["valor"]
    for mes in sorted(por_mes):
        print(f"{mes}  despesas {por_mes[mes]:>12,.2f}")
