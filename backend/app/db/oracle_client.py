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

    _pool = await oracledb.create_pool_async(
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

    async with pool.acquire() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute(sql, binds or {})
            if cursor.description is None:
                return []
            columns = [c[0] for c in cursor.description]
            rows = await cursor.fetchall()
            return [dict(zip(columns, row)) for row in rows]


async def run_oracle_execute(sql: str, binds: dict[str, Any] | None = None) -> int | None:
    pool = await get_oracle_pool()
    if pool is None:
        return None

    async with pool.acquire() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute(sql, binds or {})
            await conn.commit()
            return int(cursor.rowcount or 0)


async def close_oracle_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close(force=True)
        _pool = None
