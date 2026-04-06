#!/usr/bin/env python3
"""
Analisa a planilha CondoGuard, aplica saneamentos basicos e gera:
- database/reports/data_quality_report.json
- backend/data/*.json (invoices, management_units, chat_bootstrap, alerts)
"""

from __future__ import annotations
import argparse
import json
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import Counter
from datetime import datetime, timedelta, timezone

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


def col_idx(ref: str) -> int:
    letters = "".join(c for c in ref if c.isalpha())
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch.upper()) - 64)
    return n


def excel_serial_to_iso(serial: str) -> str:
    if not serial:
        return ""
    try:
        val = float(serial)
    except ValueError:
        return serial
    base = datetime(1899, 12, 30)
    date = base + timedelta(days=val)
    return date.date().isoformat()


def norm(v: str) -> str:
    if v is None:
        return ""
    s = str(v).strip()
    if s.endswith(".0") and s.replace(".", "", 1).isdigit():
        return s[:-2]
    return s


def parse_xlsx(path: Path) -> dict[str, list[dict[str, str]]]:
    with zipfile.ZipFile(path) as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall("main:si", NS):
                text = "".join((t.text or "") for t in si.findall(".//main:t", NS))
                shared.append(text)

        wb = ET.fromstring(z.read("xl/workbook.xml"))
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        rel_map = {r.attrib["Id"]: r.attrib["Target"] for r in rels.findall("rel:Relationship", NS)}

        result = {}
        for sh in wb.findall("main:sheets/main:sheet", NS):
            name = sh.attrib["name"]
            rid = sh.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
            target = rel_map[rid]
            p = "xl/" + target if not target.startswith("xl/") else target
            root = ET.fromstring(z.read(p))
            rows = root.findall("main:sheetData/main:row", NS)

            table = {}
            max_col = 0
            for r in rows:
                rix = int(r.attrib.get("r", "0"))
                row = {}
                for c in r.findall("main:c", NS):
                    ref = c.attrib.get("r", "")
                    if not ref:
                        continue
                    ci = col_idx(ref)
                    max_col = max(max_col, ci)
                    ctype = c.attrib.get("t")
                    v = c.find("main:v", NS)
                    value = ""
                    if v is not None and v.text is not None:
                        raw = v.text
                        if ctype == "s":
                            try:
                                value = shared[int(raw)]
                            except Exception:
                                value = raw
                        else:
                            value = raw
                    row[ci] = norm(value)
                table[rix] = row

            header = [table.get(1, {}).get(i, "") for i in range(1, max_col + 1)]
            rows_out = []
            for rix, row in table.items():
                if rix == 1:
                    continue
                obj = {}
                has_val = False
                for i, h in enumerate(header, start=1):
                    key = h if h else f"COL_{i}"
                    val = row.get(i, "")
                    obj[key] = val
                    if val != "":
                        has_val = True
                if has_val:
                    rows_out.append(obj)
            result[name] = rows_out

    return result


def map_severity(gravidade: str) -> str:
    g = (gravidade or "").strip().lower()
    if g in ("alta", "critica"):
        return "critical"
    if g == "media":
        return "warning"
    return "info"


def rel_time(date_iso: str) -> str:
    if not date_iso:
        return "recentemente"
    try:
        dt = datetime.fromisoformat(date_iso)
    except Exception:
        return "recentemente"
    delta = datetime.now() - dt
    hours = int(delta.total_seconds() // 3600)
    if hours <= 0:
        return "agora"
    if hours < 24:
        return f"{hours} h atras"
    days = hours // 24
    return f"{days} d atras"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--xlsx", required=True)
    parser.add_argument("--out-report", default="database/reports/data_quality_report.json")
    parser.add_argument("--out-backend-data", default="backend/data")
    args = parser.parse_args()

    xlsx_path = Path(args.xlsx)
    out_report = Path(args.out_report)
    out_data = Path(args.out_backend_data)
    out_data.mkdir(parents=True, exist_ok=True)
    out_report.parent.mkdir(parents=True, exist_ok=True)

    data = parse_xlsx(xlsx_path)

    unit_ids = {r.get("unidade_id", "") for r in data.get("dim_unidades", [])}
    forn_ids = {r.get("fornecedor_id", "") for r in data.get("dim_fornecedores", [])}
    contr_ids = {r.get("contrato_id", "") for r in data.get("contratos", [])}

    issues = {}
    anomalia_ids = [r.get("anomalia_id", "") for r in data.get("eventos_anomalia", []) if r.get("anomalia_id", "")]
    dup = [k for k, n in Counter(anomalia_ids).items() if n > 1]
    issues["eventos_anomalia.duplicated_anomalia_id"] = len(dup)

    orphans_unidade = sorted({r.get("unidade_id", "") for r in data.get("consumo_unidade", []) if r.get("unidade_id", "") not in unit_ids})
    issues["consumo_unidade.unidade_id.orphans"] = orphans_unidade[:10]

    orphans_nf_forn = sorted({r.get("fornecedor_id", "") for r in data.get("notas_fiscais", []) if r.get("fornecedor_id", "") not in forn_ids})
    issues["notas_fiscais.fornecedor_id.orphans"] = orphans_nf_forn[:10]

    orphans_nf_ctr = sorted({r.get("contrato_id", "") for r in data.get("notas_fiscais", []) if r.get("contrato_id", "") not in contr_ids})
    issues["notas_fiscais.contrato_id.orphans"] = orphans_nf_ctr[:10]

    status_values = Counter(r.get("status_revisao", "") for r in data.get("eventos_anomalia", []) if r.get("status_revisao", ""))
    issues["eventos_anomalia.status_revisao.values"] = dict(status_values)

    unidade_medida_values = Counter(r.get("unidade_medida", "") for r in data.get("consumo_unidade", []) if r.get("unidade_medida", ""))
    issues["consumo_unidade.unidade_medida.values"] = dict(unidade_medida_values)

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_file": str(xlsx_path),
        "table_count": len(data.keys()),
        "issues": issues,
    }
    out_report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    moradores = data.get("dim_moradores", [])[:50]
    invoices = []
    for i, m in enumerate(moradores[:20], start=1):
        unidade = m.get("unidade", "-")
        status = "pending"
        if i % 5 == 0:
            status = "overdue"
        elif i % 3 == 0:
            status = "paid"
        invoices.append(
            {
                "id": f"inv-{i}",
                "unit": f"A-{unidade}",
                "resident": m.get("nome", "-"),
                "reference": "Abr/2026",
                "dueDate": "2026-04-10",
                "amount": round(780 + (i * 17.35), 2),
                "status": status,
            }
        )

    units = []
    for i, u in enumerate(data.get("dim_unidades", [])[:40], start=1):
        resident = "-"
        match = next((m for m in moradores if m.get("unidade", "") == u.get("numero_unidade", "")), None)
        if match:
            resident = match.get("nome", "-")
        status = "occupied" if resident != "-" else "vacant"
        if i % 9 == 0:
            status = "maintenance"
        units.append(
            {
                "id": f"u{i}",
                "block": u.get("bloco", "A"),
                "unit": u.get("numero_unidade", "0"),
                "resident": resident,
                "status": status,
                "lastUpdate": "Agora",
            }
        )

    chat_bootstrap = {
        "welcomeMessage": "Sou o copiloto CondoGuard. Posso ajudar com alertas, consumo e operacao diaria.",
        "suggestions": [
            {"id": "s1", "label": "Resumo do dia", "prompt": "Gerar um resumo rapido dos eventos operacionais de hoje."},
            {"id": "s2", "label": "Alertas criticos", "prompt": "Quais alertas criticos exigem acao imediata?"},
            {"id": "s3", "label": "Consumo fora da meta", "prompt": "Existe algum bloco com consumo fora da meta nesta semana?"},
        ],
    }

    anomalias = data.get("eventos_anomalia", [])
    alerts_items = []
    for i, a in enumerate(anomalias[:120], start=1):
        detected = excel_serial_to_iso(a.get("data_detectada", ""))
        severity = map_severity(a.get("gravidade", ""))
        alerts_items.append(
            {
                "id": f"a{i}",
                "severity": severity,
                "title": a.get("tipo_anomalia", "anomalia detectada").replace("_", " "),
                "description": (a.get("descricao_anomalia", "Anomalia detectada automaticamente")[:240]).strip(),
                "time": rel_time(detected),
            }
        )

    if not alerts_items:
        alerts_items = [
            {
                "id": "a1",
                "severity": "warning",
                "title": "Anomalia operacional",
                "description": "Nao ha eventos suficientes na base para gerar alertas reais.",
                "time": "agora",
            }
        ]

    alerts_payload = {
        "activeCount": len(alerts_items),
        "items": alerts_items[:50],
    }

    (out_data / "invoices.json").write_text(json.dumps({"items": invoices}, ensure_ascii=False, indent=2), encoding="utf-8")
    (out_data / "management_units.json").write_text(json.dumps({"units": units}, ensure_ascii=False, indent=2), encoding="utf-8")
    (out_data / "chat_bootstrap.json").write_text(json.dumps(chat_bootstrap, ensure_ascii=False, indent=2), encoding="utf-8")
    (out_data / "alerts.json").write_text(json.dumps(alerts_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Report generated: {out_report}")
    print(f"Backend data generated in: {out_data}")


if __name__ == "__main__":
    main()
