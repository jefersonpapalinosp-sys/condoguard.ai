from __future__ import annotations

from typing import Any

from app.core.config import settings

try:
    import oracledb  # type: ignore
except Exception:  # pragma: no cover
    oracledb = None

_pool = None


async def get_oracle_pool():
    global _pool
    if settings.db_dialect != "oracle":
        return None
    if _pool is not None:
        return _pool
    if oracledb is None:
        raise RuntimeError("Driver oracledb nao instalado. Execute: pip install oracledb")
    if not settings.oracle_user or not settings.oracle_password or not settings.oracle_connect_string:
        raise RuntimeError("Credenciais Oracle incompletas no ambiente.")

    _pool = oracledb.create_pool(
        user=settings.oracle_user,
        password=settings.oracle_password,
        dsn=settings.oracle_connect_string,
        min=settings.oracle_pool_min,
        max=settings.oracle_pool_max,
        increment=1,
    )
    return _pool


async def run_oracle_query(sql: str, binds: dict[str, Any] | None = None) -> list[dict[str, Any]] | None:
    pool = await get_oracle_pool()
    if pool is None:
        return None

    conn = pool.acquire()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, binds or {})
        columns = [c[0] for c in cursor.description or []]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        conn.close()


async def run_oracle_execute(sql: str, binds: dict[str, Any] | None = None) -> int | None:
    pool = await get_oracle_pool()
    if pool is None:
        return None

    conn = pool.acquire()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, binds or {})
        conn.commit()
        return int(cursor.rowcount or 0)
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        conn.close()


async def close_oracle_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close(force=True)
        _pool = None
