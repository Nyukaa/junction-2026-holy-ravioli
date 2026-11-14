"""PostgreSQL (Aiven) implementation of Repo. OWNER: Alex. Not written yet: implement the 6 methods of db/base.py.

Use psycopg (v3), a small connection pool (max 3-5), SSL from DATABASE_URL (+ DATABASE_CA).
See docs/specs/database.md for the tables and the SQL hints. All queries are parameterized.
"""
from datetime import date


class PgRepo:
    def get_clock(self) -> date:
        raise NotImplementedError

    def set_clock(self, today: date) -> None:
        raise NotImplementedError

    def get_customer(self, customer_id: str) -> dict | None:
        raise NotImplementedError

    def fetch_transactions(self, customer_id: str, since: date, until: date) -> list[dict]:
        raise NotImplementedError

    def fetch_plans(self, customer_id: str) -> list[dict]:
        raise NotImplementedError

    def insert_plan(self, customer_id: str, plan: dict, start_date: date) -> dict:
        raise NotImplementedError
