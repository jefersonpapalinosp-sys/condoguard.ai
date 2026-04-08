from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Pin the backend test profile so a developer's local `.env` does not leak Oracle/CORS
# settings into the suite and create false negatives.
os.environ["APP_ENV"] = "dev"
os.environ["DB_DIALECT"] = "mock"
os.environ["ALLOW_ORACLE_SEED_FALLBACK"] = "true"
os.environ["ENABLE_DEMO_AUTH"] = "true"
os.environ["JWT_SECRET"] = "test-only-secret-at-least-32-chars-long"
os.environ["CORS_ALLOWED_ORIGINS"] = "http://localhost:3000,http://127.0.0.1:3000"

from app.main import reset_runtime_state


@pytest.fixture(autouse=True)
def reset_backend_runtime_state():
    reset_runtime_state()
    yield
