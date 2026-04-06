from __future__ import annotations

import asyncio

from app.repositories import dashboard_repo


def test_dashboard_metrics_are_calculated_from_alerts_and_invoices(monkeypatch):
    async def fake_alerts(_condominium_id: int):
        return {
            "items": [
                {
                    "id": "a1",
                    "severity": "critical",
                    "status": "active",
                    "title": "Falha na bomba",
                    "description": "Bomba com oscilacao",
                    "time": "agora",
                },
                {
                    "id": "a2",
                    "severity": "warning",
                    "status": "active",
                    "title": "Consumo elevado",
                    "description": "Pico no bloco A",
                    "time": "1 h atras",
                },
                {
                    "id": "a3",
                    "severity": "info",
                    "status": "read",
                    "title": "Inspecao concluida",
                    "description": "Rota finalizada",
                    "time": "2 h atras",
                },
            ]
        }

    async def fake_invoices(_condominium_id: int):
        return {
            "items": [
                {"id": "f1", "unit": "A-101", "amount": 1000, "status": "paid"},
                {"id": "f2", "unit": "A-102", "amount": 800, "status": "overdue"},
            ]
        }

    monkeypatch.setattr(dashboard_repo, "get_alerts_data", fake_alerts)
    monkeypatch.setattr(dashboard_repo, "get_invoices_data", fake_invoices)

    payload = asyncio.run(dashboard_repo.get_dashboard_data(1))

    assert payload["metrics"]["activeAlerts"] == 2
    assert payload["metrics"]["pendingContracts"] == 1
    assert payload["metrics"]["monthlySavings"] == "R$ 199,00"
    assert payload["metrics"]["currentConsumption"] == "90%"
    assert len(payload["recentAlerts"]) == 3


def test_dashboard_metrics_handle_empty_invoices(monkeypatch):
    async def fake_alerts(_condominium_id: int):
        return {"items": []}

    async def fake_invoices(_condominium_id: int):
        return {"items": []}

    monkeypatch.setattr(dashboard_repo, "get_alerts_data", fake_alerts)
    monkeypatch.setattr(dashboard_repo, "get_invoices_data", fake_invoices)

    payload = asyncio.run(dashboard_repo.get_dashboard_data(1))

    assert payload["metrics"]["monthlySavings"] == "R$ 0,00"
    assert payload["metrics"]["currentConsumption"] == "0%"
    assert payload["metrics"]["pendingContracts"] == 0
