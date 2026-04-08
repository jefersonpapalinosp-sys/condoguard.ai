"""
Document loader — reads the knowledge base and splits into chunks.

Uses TextLoader (no heavy deps) + RecursiveCharacterTextSplitter.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

_log = logging.getLogger(__name__)


def load_knowledge_base(kb_dir: str | None = None) -> list[Document]:
    """Load all .md files from the knowledge base directory and split into chunks."""
    from app.core.config import settings  # noqa: PLC0415

    directory = kb_dir or settings.knowledge_base_dir

    # Resolve relative paths from the project root (where uvicorn is launched)
    path = Path(directory)
    if not path.is_absolute():
        path = Path(os.getcwd()) / path

    if not path.exists():
        _log.warning("Diretorio da base de conhecimento nao encontrado: %s", path)
        return []

    _log.info("Carregando base de conhecimento de: %s", path)

    loader = DirectoryLoader(
        str(path),
        glob="**/*.md",
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8"},
        show_progress=False,
        silent_errors=True,
    )

    docs = loader.load()
    _log.info("Documentos brutos carregados: %d", len(docs))

    if not docs:
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=600,
        chunk_overlap=80,
        separators=["\n## ", "\n### ", "\n\n", "\n", " "],
    )
    chunks = splitter.split_documents(docs)
    _log.info("Chunks gerados: %d", len(chunks))
    return chunks
