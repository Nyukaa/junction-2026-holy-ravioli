"""The ONLY thing the rest of the backend knows about the database. Alex implements it in db/pg.py.

Rows are plain dicts. Dates are datetime.date. Money is EUR, plain floats.
Every function is for one customer. There is no raw SQL access for the agent.
"""
from datetime import date
from typing import Protocol


class Repo(Protocol):
    # ---- demo setup
    def get_clock(self) -> date: ...  # app.demo_clock.today
    def set_clock(self, today: date) -> None: ...
    def get_customer(self, customer_id: str) -> dict | None:
        """{"id", "label"} for a demo customer, None if the id is not a demo customer."""

    # ---- reads
    def fetch_transactions(self, customer_id: str, since: date, until: date) -> list[dict]:
        """All transactions with since <= date <= until, oldest first.
        Each row: {"date": date, "amount": float (money out is negative), "type": str,
                   "category": str | None, "merchant": str | None}
        `type` is the dataset's transaction_type (purchase, housing_payment, utilities_payment, salary,
        other_income, salary_sweep, investment_deposit, investment_withdrawal).
        """

    def fetch_plans(self, customer_id: str) -> list[dict]:
        """Active plans (kind goal or expense). Each row: {"id", "kind", "title", "target_amount",
        "start_date": date, "deadline": date, "monthly_contribution", "weekly_limit" (or None),
        "starting_amount", "note" (or None)}"""

    # ---- write
    def insert_plan(self, customer_id: str, plan: dict, start_date: date) -> dict:
        """Saves a plan (fields as in PlanIn). If plan["kind"] == "goal", the previous active goal is
        set inactive in the same transaction. Returns the saved row (same shape as fetch_plans)."""
