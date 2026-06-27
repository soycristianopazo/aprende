"""Run F4 migration against Supabase Postgres."""
import asyncio
import asyncpg
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

async def main():
    sql = (Path(__file__).parent / "migration_f4_competencies.sql").read_text()
    conn = await asyncpg.connect(dsn=os.environ["DATABASE_URL"], statement_cache_size=0)
    try:
        await conn.execute(sql)
        print("Migration F4 applied OK")
    finally:
        await conn.close()

asyncio.run(main())
