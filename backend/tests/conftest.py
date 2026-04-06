from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.main import reset_runtime_state


@pytest.fixture(autouse=True)
def reset_backend_runtime_state():
    reset_runtime_state()
    yield
