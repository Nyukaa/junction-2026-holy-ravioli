"""In-memory demo data, so Anna and Elya can work without a database. Same shape as the real Repo.

Customer "demo": salary on the 25th, rent on the 1st, regular everyday purchases for 24 months.
Clock starts on 2026-09-20 (green). On 2026-09-21 there is a big unexpected expense (washing machine).
"""
import random
from datetime import date, timedelta
from uuid import uuid4

START = date(2024, 10, 1)
END = date(2026, 9, 30)
EVERYDAY = [  # category, merchant, typical amount, share of days
    ("Groceries", "K-Market", 38, 0.55),
    ("Restaurants", "Lunch place", 14, 0.20),
    ("Entertainment", "Cinema", 16, 0.04),
    ("Transportation", "HSL", 3, 0.20),
    ("Lifestyle", "Kids clothes", 30, 0.05),
]


def _make_transactions() -> list[dict]:
    rnd = random.Random(7)
    rows: list[dict] = []
    d = START
    while d <= END:
        if d.day == 25:
            rows.append({"date": d, "amount": 3200.0, "type": "salary", "category": None, "merchant": "Employer"})
        if d.day == 1:
            rows.append({"date": d, "amount": -950.0, "type": "housing_payment", "category": None, "merchant": "Landlord"})
        if d.day == 5:
            rows.append({"date": d, "amount": -120.0, "type": "utilities_payment", "category": None, "merchant": "Utilities"})
        for cat, merchant, typical, share in EVERYDAY:
            if rnd.random() < share:
                rows.append({"date": d, "amount": -round(typical * rnd.uniform(0.7, 1.3), 2), "type": "purchase", "category": cat, "merchant": merchant})
        d += timedelta(days=1)
    rows.append({"date": date(2026, 9, 21), "amount": -649.0, "type": "purchase", "category": "Home & Tech", "merchant": "Gigantti (washing machine)"})
    rows.sort(key=lambda r: r["date"])
    return rows


class FakeRepo:
    def __init__(self) -> None:
        self._today = date(2026, 9, 20)
        self._tx = _make_transactions()
        self._customers = {"demo": {"id": "demo", "label": "Demo: holiday saver"}}
        self._plans: list[dict] = [
            {
                "id": "plan-1",
                "kind": "goal",
                "title": "Holiday in Italy",
                "target_amount": 2400.0,
                "start_date": date(2026, 6, 20),
                "deadline": date(2027, 6, 1),
                "monthly_contribution": 200.0,
                "weekly_limit": None,
                "starting_amount": 0.0,
                "note": None,
                "customer_id": "demo",
                "active": True,
            }
        ]

    def get_clock(self) -> date:
        return self._today

    def set_clock(self, today: date) -> None:
        self._today = today

    def get_customer(self, customer_id: str) -> dict | None:
        return self._customers.get(customer_id)

    def fetch_transactions(self, customer_id: str, since: date, until: date) -> list[dict]:
        if customer_id not in self._customers:
            return []
        return [dict(t) for t in self._tx if since <= t["date"] <= until]

    def fetch_plans(self, customer_id: str) -> list[dict]:
        return [self._public(p) for p in self._plans if p["customer_id"] == customer_id and p["active"]]

    def insert_plan(self, customer_id: str, plan: dict, start_date: date) -> dict:
        if plan["kind"] == "goal":
            for p in self._plans:
                if p["customer_id"] == customer_id and p["kind"] == "goal":
                    p["active"] = False
        row = {**plan, "id": str(uuid4())[:8], "start_date": start_date, "customer_id": customer_id, "active": True}
        self._plans.append(row)
        return self._public(row)

    @staticmethod
    def _public(p: dict) -> dict:
        return {k: v for k, v in p.items() if k not in ("customer_id", "active")}
