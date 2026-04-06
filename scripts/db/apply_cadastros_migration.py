from __future__ import annotations

import os
from pathlib import Path

import oracledb


ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = [
    ROOT / "database" / "flyway" / "sql" / "V009__cadastros_gerais_store.sql",
]


def _load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def _prepare_sql(content: str) -> str:
    lines = content.splitlines()
    if lines and lines[-1].strip() == "/":
        lines = lines[:-1]
    return "\n".join(lines).strip()


def main() -> int:
    _load_env_file(ROOT / ".env.local")
    _load_env_file(ROOT / ".env")

    user = os.getenv("ORACLE_USER", "").strip()
    password = os.getenv("ORACLE_PASSWORD", "").strip()
    dsn = os.getenv("ORACLE_CONNECT_STRING", "").strip()
    if not user or not password or not dsn:
        print("Missing ORACLE_USER / ORACLE_PASSWORD / ORACLE_CONNECT_STRING.")
        return 1

    conn = oracledb.connect(user=user, password=password, dsn=dsn)
    cur = conn.cursor()
    try:
        for migration in MIGRATIONS:
            sql = _prepare_sql(migration.read_text(encoding="utf-8"))
            print(f"Applying {migration.name} ...")
            cur.execute(sql)
            conn.commit()
        print("OK: cadastros migration applied.")
        return 0
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
