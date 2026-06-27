"""
MongoDB-compatible adapter for PostgreSQL (Supabase).

Mimics the subset of motor (AsyncIOMotorClient) API used by this app so that
server.py can swap MongoDB -> PostgreSQL with minimal code changes.

Supports:
    db.<collection>.find_one(filter, projection=None)
    db.<collection>.find(filter, projection=None) -> Cursor (.to_list / async for)
    db.<collection>.insert_one(doc)
    db.<collection>.update_one(filter, {"$set": {...}})
    db.<collection>.delete_one(filter)
    db.<collection>.count_documents(filter)
    db.<collection>.aggregate(pipeline)  -> limited, handled per-call

Filter operators: equality, $in, $ne, $exists, $or
Update operators: $set
"""
import os
import json
import asyncio
import asyncpg
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Iterable
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

# ---------------- Table metadata ----------------
# Maps each "collection" to its primary key column and the columns that should
# be stored as native PG arrays (TEXT[]) / JSONB.
TABLES: Dict[str, Dict[str, Any]] = {
    "users": {
        "pk": "user_id",
        "array_cols": {"role_ids"},
        "json_cols": set(),
        "ts_cols": {"created_at"},
    },
    "roles": {
        "pk": "role_id",
        "array_cols": {"course_ids", "course_order"},
        "json_cols": set(),
        "ts_cols": {"created_at"},
    },
    "courses": {
        "pk": "course_id",
        "array_cols": {"prerequisites"},
        "json_cols": set(),
        "ts_cols": {"created_at"},
    },
    "evaluations": {
        "pk": "evaluation_id",
        "array_cols": set(),
        "json_cols": {"questions"},
        "ts_cols": {"created_at"},
    },
    "evaluation_attempts": {
        "pk": "attempt_id",
        "array_cols": set(),
        "json_cols": {"answers"},
        "ts_cols": {"created_at"},
    },
    "course_completions": {
        "pk": "completion_id",
        "array_cols": set(),
        "json_cols": set(),
        "ts_cols": {"completed_at"},
    },
    "certificates": {
        "pk": "certificate_id",
        "array_cols": {"role_ids", "role_names"},
        "json_cols": {"course_grades", "courses_detail"},
        "ts_cols": {"issued_at", "expires_at"},
    },
    "branding": {
        "pk": "id",
        "array_cols": set(),
        "json_cols": set(),
        "ts_cols": {"updated_at"},
    },
    "user_sessions": {
        "pk": "session_token",
        "array_cols": set(),
        "json_cols": set(),
        "ts_cols": {"expires_at", "created_at"},
    },
}


# ---------------- Connection pool (singleton) ----------------
_pool: Optional[asyncpg.Pool] = None
_pool_lock = asyncio.Lock()


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        async with _pool_lock:
            if _pool is None:
                _pool = await asyncpg.create_pool(
                    dsn=os.environ["DATABASE_URL"],
                    min_size=1,
                    max_size=10,
                    statement_cache_size=0,  # CRITICAL for transaction pooler
                    command_timeout=30,
                )
    return _pool


async def close_pool():
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


# ---------------- Helpers ----------------
def _ts_to_iso(v):
    """Convert datetime values returned by PG to ISO strings for back-compat."""
    if isinstance(v, datetime):
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat()
    return v


def _row_to_dict(row: asyncpg.Record, table_meta: Dict[str, Any]) -> Dict[str, Any]:
    if row is None:
        return None
    d = dict(row)
    # Decode JSONB columns (asyncpg returns them as str unless type codec registered)
    for col in table_meta["json_cols"]:
        if col in d and isinstance(d[col], str):
            try:
                d[col] = json.loads(d[col])
            except Exception:
                pass
    # Stringify timestamps for backward-compat with code that expects ISO strings
    for col in table_meta["ts_cols"]:
        if col in d:
            d[col] = _ts_to_iso(d[col])
    return d


def _apply_projection(doc: Optional[Dict[str, Any]], projection: Optional[Dict[str, int]]):
    if doc is None or not projection:
        return doc
    # Mongo style: {"_id": 0} means exclude _id; {"field": 1} include only those.
    # Our docs have no "_id". Just drop excluded fields, ignore "_id".
    excludes = {k for k, v in projection.items() if v == 0 and k != "_id"}
    includes = {k for k, v in projection.items() if v == 1}
    if includes:
        doc = {k: v for k, v in doc.items() if k in includes}
    if excludes:
        doc = {k: v for k, v in doc.items() if k not in excludes}
    doc.pop("_id", None)
    return doc


def _build_where(filter_: Dict[str, Any], start_param: int = 1):
    """Translate a Mongo-style filter to SQL WHERE clause + params list."""
    if not filter_:
        return "", []
    clauses = []
    params = []
    i = start_param

    def add(col, op, val):
        nonlocal i
        clauses.append(f'"{col}" {op} ${i}')
        params.append(val)
        i += 1

    for key, val in filter_.items():
        if key == "$or":
            sub_clauses = []
            for sub in val:
                sub_sql, sub_params = _build_where(sub, i)
                if sub_sql:
                    sub_clauses.append(f"({sub_sql})")
                    params.extend(sub_params)
                    i += len(sub_params)
            if sub_clauses:
                clauses.append("(" + " OR ".join(sub_clauses) + ")")
            continue
        if key == "$and":
            for sub in val:
                sub_sql, sub_params = _build_where(sub, i)
                if sub_sql:
                    clauses.append(f"({sub_sql})")
                    params.extend(sub_params)
                    i += len(sub_params)
            continue

        if isinstance(val, dict):
            for op_key, op_val in val.items():
                if op_key == "$in":
                    if not op_val:
                        clauses.append("FALSE")
                    else:
                        clauses.append(f'"{key}" = ANY(${i})')
                        params.append(list(op_val))
                        i += 1
                elif op_key == "$ne":
                    clauses.append(f'("{key}" IS DISTINCT FROM ${i})')
                    params.append(op_val)
                    i += 1
                elif op_key == "$exists":
                    if op_val:
                        clauses.append(f'"{key}" IS NOT NULL')
                    else:
                        clauses.append(f'"{key}" IS NULL')
                elif op_key in ("$gt", "$gte", "$lt", "$lte"):
                    op_map = {"$gt": ">", "$gte": ">=", "$lt": "<", "$lte": "<="}
                    add(key, op_map[op_key], op_val)
                else:
                    # Unsupported operator -> equality fallback
                    add(key, "=", op_val)
        else:
            add(key, "=", val)

    return " AND ".join(clauses), params


def _prep_value(col: str, val: Any, meta: Dict[str, Any]):
    """Prepare a Python value for storage in a typed PG column."""
    if val is None:
        return None
    if col in meta["json_cols"]:
        return json.dumps(val)
    if col in meta["array_cols"]:
        # Ensure list of strings for TEXT[]
        if isinstance(val, (list, tuple, set)):
            return [str(x) for x in val]
        return [str(val)]
    if col in meta["ts_cols"]:
        if isinstance(val, datetime):
            return val.astimezone(timezone.utc) if val.tzinfo else val.replace(tzinfo=timezone.utc)
        if isinstance(val, str):
            try:
                dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt
            except Exception:
                return None
        return val
    return val


# ---------------- Cursor (find result) ----------------
class _Cursor:
    def __init__(self, collection: "_Collection", filter_: Dict[str, Any], projection: Optional[Dict[str, int]] = None):
        self._collection = collection
        self._filter = filter_ or {}
        self._projection = projection
        self._limit: Optional[int] = None
        self._skip: Optional[int] = None
        self._sort: Optional[List[tuple]] = None
        self._cached: Optional[List[Dict[str, Any]]] = None

    def sort(self, key, direction=1):
        if isinstance(key, list):
            self._sort = key
        else:
            self._sort = [(key, direction)]
        return self

    def limit(self, n: int):
        self._limit = n
        return self

    def skip(self, n: int):
        self._skip = n
        return self

    async def _fetch(self) -> List[Dict[str, Any]]:
        if self._cached is not None:
            return self._cached
        sql = f'SELECT * FROM "{self._collection.name}"'
        where_sql, params = _build_where(self._filter, 1)
        if where_sql:
            sql += f" WHERE {where_sql}"
        if self._sort:
            parts = []
            for col, dirn in self._sort:
                parts.append(f'"{col}" {"ASC" if dirn >= 0 else "DESC"}')
            sql += " ORDER BY " + ", ".join(parts)
        if self._limit is not None:
            sql += f" LIMIT {int(self._limit)}"
        if self._skip is not None:
            sql += f" OFFSET {int(self._skip)}"
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(sql, *params)
        docs = [_row_to_dict(r, self._collection.meta) for r in rows]
        docs = [_apply_projection(d, self._projection) for d in docs]
        self._cached = docs
        return docs

    async def to_list(self, length: Optional[int] = None):
        if length is not None:
            self._limit = length
        return await self._fetch()

    def __aiter__(self):
        self._iter_index = 0
        return self

    async def __anext__(self):
        if self._cached is None:
            await self._fetch()
        if self._iter_index >= len(self._cached):
            raise StopAsyncIteration
        item = self._cached[self._iter_index]
        self._iter_index += 1
        return item


# ---------------- Update / Delete result objects ----------------
class _UpdateResult:
    def __init__(self, matched_count: int, modified_count: int):
        self.matched_count = matched_count
        self.modified_count = modified_count


class _DeleteResult:
    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count


class _InsertResult:
    def __init__(self, inserted_id: Any):
        self.inserted_id = inserted_id


# ---------------- Collection ----------------
class _Collection:
    def __init__(self, name: str):
        if name not in TABLES:
            raise ValueError(f"Unknown table: {name}")
        self.name = name
        self.meta = TABLES[name]

    async def find_one(self, filter_: Dict[str, Any] = None, projection: Optional[Dict[str, int]] = None):
        sql = f'SELECT * FROM "{self.name}"'
        where_sql, params = _build_where(filter_ or {}, 1)
        if where_sql:
            sql += f" WHERE {where_sql}"
        sql += " LIMIT 1"
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(sql, *params)
        doc = _row_to_dict(row, self.meta)
        return _apply_projection(doc, projection)

    def find(self, filter_: Dict[str, Any] = None, projection: Optional[Dict[str, int]] = None):
        return _Cursor(self, filter_, projection)

    async def insert_one(self, doc: Dict[str, Any]):
        # Strip Mongo internals
        doc = {k: v for k, v in doc.items() if k != "_id"}
        cols = list(doc.keys())
        vals = [_prep_value(c, doc[c], self.meta) for c in cols]
        placeholders = ", ".join(f"${i+1}" for i in range(len(cols)))
        col_sql = ", ".join(f'"{c}"' for c in cols)
        sql = f'INSERT INTO "{self.name}" ({col_sql}) VALUES ({placeholders}) RETURNING "{self.meta["pk"]}"'
        pool = await get_pool()
        async with pool.acquire() as conn:
            inserted = await conn.fetchval(sql, *vals)
        return _InsertResult(inserted)

    async def update_one(self, filter_: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        set_doc = update.get("$set") if "$set" in update else update
        if not set_doc:
            return _UpdateResult(0, 0)
        # For branding singleton: filter may be {} but row uses id='default'
        cols = list(set_doc.keys())
        set_values = [_prep_value(c, set_doc[c], self.meta) for c in cols]
        set_sql = ", ".join(f'"{c}" = ${i+1}' for i, c in enumerate(cols))
        where_sql, where_params = _build_where(filter_ or {}, len(cols) + 1)
        sql = f'UPDATE "{self.name}" SET {set_sql}'
        if where_sql:
            sql += f" WHERE {where_sql}"
        else:
            # For singleton tables (branding), update first row
            if self.name == "branding":
                sql += ' WHERE "id" = \'default\''
        pool = await get_pool()
        async with pool.acquire() as conn:
            status = await conn.execute(sql, *set_values, *where_params)
        # status like "UPDATE 1"
        try:
            count = int(status.split()[-1])
        except Exception:
            count = 0
        if count == 0 and upsert:
            # Build a doc combining filter + set
            doc = {**(filter_ or {}), **set_doc}
            await self.insert_one(doc)
            return _UpdateResult(1, 1)
        return _UpdateResult(count, count)

    async def delete_one(self, filter_: Dict[str, Any]):
        sql = f'DELETE FROM "{self.name}"'
        where_sql, params = _build_where(filter_ or {}, 1)
        if where_sql:
            sql += f" WHERE {where_sql}"
        # Limit not directly supported in DELETE in PG, but our PK filters target 1 row.
        pool = await get_pool()
        async with pool.acquire() as conn:
            status = await conn.execute(sql, *params)
        try:
            count = int(status.split()[-1])
        except Exception:
            count = 0
        return _DeleteResult(count)

    async def count_documents(self, filter_: Dict[str, Any] = None):
        sql = f'SELECT COUNT(*) FROM "{self.name}"'
        where_sql, params = _build_where(filter_ or {}, 1)
        if where_sql:
            sql += f" WHERE {where_sql}"
        pool = await get_pool()
        async with pool.acquire() as conn:
            return await conn.fetchval(sql, *params)

    async def aggregate(self, pipeline: List[Dict[str, Any]]):
        """Limited support: handles {$match} + {$group: {_id:'$col', count:{$sum:1}}}."""
        match = {}
        group = None
        for stage in pipeline:
            if "$match" in stage:
                match = stage["$match"]
            elif "$group" in stage:
                group = stage["$group"]
        if not group:
            # Fallback: just return cursor of matched docs
            cursor = self.find(match)
            for doc in await cursor.to_list(10000):
                yield doc
            return

        group_id = group["_id"]
        if isinstance(group_id, str) and group_id.startswith("$"):
            group_col = group_id[1:]
        else:
            group_col = None
        sql = f'SELECT "{group_col}" AS _id, COUNT(*) AS count FROM "{self.name}"'
        where_sql, params = _build_where(match, 1)
        if where_sql:
            sql += f" WHERE {where_sql}"
        sql += f' GROUP BY "{group_col}"'
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(sql, *params)
        for r in rows:
            yield {"_id": r["_id"], "count": r["count"]}


# ---------------- Database facade ----------------
class _Database:
    def __getattr__(self, name: str) -> _Collection:
        return _Collection(name)


db = _Database()


# ---------------- Health check helper ----------------
async def ping():
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.fetchval("SELECT 1")
    return True
