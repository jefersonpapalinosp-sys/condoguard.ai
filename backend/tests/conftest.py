from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Set test defaults before importing app modules so pydantic-settings picks them up.
# These values are safe for the test environment only.
os.environ.setdefault("APP_ENV", "dev")
os.environ.setdefault("ENABLE_DEMO_AUTH", "true")
os.environ.setdefault("JWT_SECRET", "test-only-secret-at-least-32-chars-long")

from app.main import reset_runtime_state


@pytest.fixture(autouse=True)
def reset_backend_runtime_state():
    reset_runtime_state()
    yield
