from __future__ import annotations

import asyncio

from app import main


def test_startup_schedules_rag_ingestion_in_background(monkeypatch):
    scheduled = {"value": False}

    def fake_spawn_rag_background_job() -> None:
        scheduled["value"] = True

    async def scenario() -> None:
        monkeypatch.setattr(main, "_spawn_rag_background_job", fake_spawn_rag_background_job)
        await main._startup_ingest_knowledge_base()

    asyncio.run(scenario())

    assert scheduled["value"] is True
