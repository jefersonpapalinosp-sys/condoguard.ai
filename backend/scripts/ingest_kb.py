#!/usr/bin/env python3
"""
CLI script para (re)indexar a base de conhecimento no Chroma.

Uso:
    python backend/scripts/ingest_kb.py              # indexacao incremental
    python backend/scripts/ingest_kb.py --force      # limpa e re-indexa
    python backend/scripts/ingest_kb.py --dir /path  # diretorio customizado

Execute a partir da raiz do projeto:
    DB_DIALECT=mock python3 backend/scripts/ingest_kb.py
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

# Add backend to sys.path so app imports resolve
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


async def main(kb_dir: str | None, force: bool) -> None:
    import logging
    logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
    log = logging.getLogger("ingest_kb")

    from app.ai.rag.vector_store import ingest_knowledge_base, reset_vector_store

    if force:
        reset_vector_store()
        log.info("Cache do vector store resetado para re-ingestao forcada")

    n = await ingest_knowledge_base(kb_dir=kb_dir, force=force)
    if n:
        log.info("Concluido: %d chunks indexados com sucesso", n)
    else:
        log.info("Nenhum chunk novo indexado (colecao ja atualizada ou RAG desabilitado)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Indexa a base de conhecimento no Chroma")
    parser.add_argument("--dir", default=None, help="Diretorio da base de conhecimento (opcional)")
    parser.add_argument("--force", action="store_true", help="Limpar e re-indexar tudo")
    args = parser.parse_args()

    asyncio.run(main(kb_dir=args.dir, force=args.force))
