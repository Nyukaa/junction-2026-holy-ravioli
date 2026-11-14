"""Plain Python: no AI, no SQL. Works on the rows that `Repo` returns.

Owner: Alex. Three public functions:
  get_customer_data(repo, customer_id)  -> everything the agent needs (tool 1)
  save_plan(repo, customer_id, plan)    -> saves the plan the user approved (tool 2)
  get_status(repo, customer_id)         -> GET /status (goal progress, sprint, quest)
"""
import calendar
import statistics
from collections import defaultdict
from datetime import date, timedelta

from schemas import PlanIn

from .base import Repo

TRANSFERS = {"salary_sweep", "investment_deposit", "investment_withdrawal"}  # not spending
INCOME = {"salary", "other_income"}
FIXED = {"housing_payment", "utilities_payment"}
IRREGULAR_CATEGORIES = {"Health", "Home & Tech"}  # challenge basket 2: irregular, not part of the weekly sprint
HISTORY_DAYS = 730  # 2 years
PLAN_HORIZON_DAYS = 365  # plans for the next year

REWARD_PCT = 0.15  # reward = 15% of the weekly limit ...
REWARD_CAP = 30.0  # ... at most 30 EUR
REWARD_LABEL = "coffee and cake"
YELLOW_OVER = 0.20  # more than 20% over pace = yellow


def _month_start(d: date) -> date:
    return d.replace(day=1)


def _is_variable(t: dict) -> bool:
    return t["type"] == "purchase"


def _is_everyday(t: dict) -> bool:
    return t["type"] == "purchase" and t.get("category") not in IRREGULAR_CATEGORIES


def _spend(t: dict) -> float:
    return -t["amount"]  # positive number for money out


def _fmt(x: float) -> str:
    return f"{x:,.0f}".replace(",", " ")


# ====================================================================== tool 1
def build_monthly_summary(txs: list[dict]) -> list[dict]:
    """Ready numbers per month, so the model does not have to add up hundreds of rows."""
    months: dict[date, dict] = defaultdict(lambda: {"income": 0.0, "fixed": 0.0, "everyday": 0.0, "irregular": 0.0, "by_category": defaultdict(float)})
    for t in txs:
        m = months[_month_start(t["date"])]
        if t["type"] in INCOME:
            m["income"] += t["amount"]
        elif t["type"] in FIXED:
            m["fixed"] += _spend(t)
        elif t["type"] == "purchase":
            key = "irregular" if t.get("category") in IRREGULAR_CATEGORIES else "everyday"
            m[key] += _spend(t)
            m["by_category"][t.get("category") or "Other"] += _spend(t)
    out = []
    for m in sorted(months):
        v = months[m]
        out.append(
            {
                "month": m.strftime("%Y-%m"),
                "income": round(v["income"]),
                "fixed_payments": round(v["fixed"]),
                "everyday_spending": round(v["everyday"]),
                "irregular_spending": round(v["irregular"]),
                "spending_by_category": {k: round(x) for k, x in sorted(v["by_category"].items(), key=lambda kv: -kv[1])},
            }
        )
    return out


def get_customer_data(repo: Repo, customer_id: str) -> dict:
    """Tool 1. All data about the customer: 2 years of transactions, monthly summary and the plans for the next year."""
    today = repo.get_clock()
    customer = repo.get_customer(customer_id)
    if customer is None:
        return {"error": "unknown customer"}
    txs = repo.fetch_transactions(customer_id, today - timedelta(days=HISTORY_DAYS), today)
    plans = [
        p
        for p in repo.fetch_plans(customer_id)
        if p["deadline"] <= today + timedelta(days=PLAN_HORIZON_DAYS)
    ]
    csv_lines = ["date,amount,type,category,merchant"]
    for t in txs:
        csv_lines.append(f"{t['date']},{t['amount']:.2f},{t['type']},{t.get('category') or ''},{t.get('merchant') or ''}")
    return {
        "today": today.isoformat(),
        "currency": "EUR",
        "customer": customer,
        "notes": (
            "amount: negative = money out, positive = money in. Types salary_sweep, investment_deposit and "
            "investment_withdrawal are transfers, not spending. Health and Home & Tech are irregular costs "
            "(not part of the weekly everyday limit). Use monthly_summary for totals, do not add up rows by hand."
        ),
        "monthly_summary": build_monthly_summary(txs),
        "plans": [
            {**p, "start_date": p["start_date"].isoformat(), "deadline": p["deadline"].isoformat()} for p in plans
        ],
        "transactions_csv": "\n".join(csv_lines),
    }


# ====================================================================== tool 2
def save_plan(repo: Repo, customer_id: str, plan: dict) -> dict:
    """Tool 2. Saves a plan the user approved in the chat. Raises ValueError with a short message on bad input."""
    today = repo.get_clock()
    if repo.get_customer(customer_id) is None:
        raise ValueError("unknown customer")
    p = PlanIn.model_validate(plan)  # raises pydantic ValidationError (a ValueError subclass)
    if p.deadline <= today:
        raise ValueError("deadline must be in the future")
    saved = repo.insert_plan(customer_id, p.model_dump(), today)
    return {
        "saved": True,
        "plan": {**saved, "start_date": saved["start_date"].isoformat(), "deadline": saved["deadline"].isoformat()},
    }


# ====================================================================== GET /status
def _median_monthly(txs: list[dict], today: date, pick, months: int = 6) -> float:
    """Median over the last `months` FULL months of the sum of `pick(t)` spending."""
    first_of_this = _month_start(today)
    totals = []
    m = first_of_this
    for _ in range(months):
        end = m - timedelta(days=1)
        m = _month_start(end)
        totals.append(sum(_spend(t) for t in txs if m <= t["date"] <= end and pick(t)))
    return statistics.median(totals) if totals else 0.0


def _zone(spent: float, expected: float, limit: float) -> str:
    if limit > 0 and spent > limit:
        return "red"
    if expected > 0 and spent > expected * (1 + YELLOW_OVER):
        return "yellow"
    return "green"


def _worst(*zones: str) -> str:
    return max(zones, key=["green", "yellow", "red"].index)


def get_status(repo: Repo, customer_id: str) -> dict | None:
    """GET /status. Returns None if the customer is unknown. All texts are built here from numbers."""
    today = repo.get_clock()
    customer = repo.get_customer(customer_id)
    if customer is None:
        return None
    txs = repo.fetch_transactions(customer_id, today - timedelta(days=210), today)
    plans = repo.fetch_plans(customer_id)
    goal_plan = next((p for p in plans if p["kind"] == "goal"), None)

    # ---- month pace: all purchases (incl. irregular) vs the customer's usual month
    typical_month = _median_monthly(txs, today, _is_variable)
    dim = calendar.monthrange(today.year, today.month)[1]
    frac = today.day / dim
    expected_month = typical_month * frac
    month_start = _month_start(today)
    spent_month = sum(_spend(t) for t in txs if t["date"] >= month_start and _is_variable(t))
    month_zone = _zone(spent_month, expected_month, typical_month)

    # ---- weekly sprint: everyday purchases, Monday to Sunday
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    weekly_weeks = []
    for i in range(1, 27):
        ws = week_start - timedelta(days=7 * i)
        weekly_weeks.append(sum(_spend(t) for t in txs if ws <= t["date"] < ws + timedelta(days=7) and _is_everyday(t)))
    weekly_limit = float(goal_plan["weekly_limit"]) if goal_plan and goal_plan.get("weekly_limit") else round(statistics.median(weekly_weeks) if weekly_weeks else 0)
    spent_week = sum(_spend(t) for t in txs if week_start <= t["date"] <= today and _is_everyday(t))
    expected_week = weekly_limit * ((today - week_start).days + 1) / 7
    sprint_zone = _zone(spent_week, expected_week, weekly_limit)
    reward = round(min(REWARD_CAP, REWARD_PCT * weekly_limit))
    if sprint_zone == "red":
        motivator = "Over the limit this week. No stress, a new week starts on Monday"
    else:
        motivator = f"Stay within the limit until {week_end:%A} and we unlock {reward} € for your {REWARD_LABEL}"
    sprint = {
        "weekStart": week_start,
        "weekEnd": week_end,
        "limit": weekly_limit,
        "spent": round(spent_week),
        "zone": sprint_zone,
        "rewardBudget": reward,
        "rewardLabel": REWARD_LABEL,
        "motivatorText": motivator,
        "progressText": f"{_fmt(spent_week)} / {_fmt(weekly_limit)} €",
    }

    # ---- goal progress
    goal = None
    ahead_days = 0
    if goal_plan:
        monthly = float(goal_plan["monthly_contribution"])
        start = goal_plan["start_date"]
        months_done = max(0, (today.year - start.year) * 12 + today.month - start.month - (1 if today.day < start.day else 0))
        saved = float(goal_plan["starting_amount"]) + monthly * months_done
        target = float(goal_plan["target_amount"])
        if monthly > 0:
            ahead_days = int(max(-365, min(365, round((expected_month - spent_month) / (monthly / 30)))))
        sign = f"+{ahead_days}" if ahead_days > 0 else str(ahead_days)
        if month_zone == "green":
            status = f"🟢 You are ahead of plan by +{ahead_days} days" if ahead_days > 0 else f"🟢 You are on plan ({sign} days)"
        elif month_zone == "yellow":
            status = f"🟡 You spend a bit faster than planned ({sign} days)"
        else:
            status = f"🔴 You are over your usual spending this month, the goal is slipping ({sign} days)"
        goal = {
            "title": goal_plan["title"],
            "targetAmount": target,
            "saved": round(saved),
            "deadline": goal_plan["deadline"],
            "monthlyContribution": monthly,
            "percent": round(min(100.0, saved / target * 100), 1) if target else 0.0,
            "aheadDays": ahead_days,
            "zone": month_zone,
            "statusText": status,
            "progressText": f"{_fmt(saved)} / {_fmt(target)} €",
        }

    # ---- rescue quest: only when yellow or red. Never asks to save more than the overspend.
    quest = None
    overall = _worst(month_zone, sprint_zone)
    if overall != "green":
        cats = {t.get("category") or "Other" for t in txs if _is_everyday(t)}
        best, best_over = None, 0.0
        for c in cats:
            typical = _median_monthly(txs, today, lambda t, c=c: _is_everyday(t) and (t.get("category") or "Other") == c)
            now = sum(_spend(t) for t in txs if t["date"] >= month_start and _is_everyday(t) and (t.get("category") or "Other") == c)
            over = now - typical * frac
            if over > best_over:
                best, best_over = c, over
        driver = best.lower() if best else "everyday things"
        over_by = max(best_over, 0.0) if best else max(spent_week - expected_week, 0.0)
        save = round(min(over_by, max(5.0, over_by * 0.5)))
        if save >= 1:
            protects = REWARD_LABEL if sprint_zone != "red" else "your goal"
            quest = {
                "title": f"Save {save} € on {driver} to save your {protects}",
                "saveAmount": save,
                "days": 2 if save >= 20 else 1,
                "driver": driver,
                "protects": protects,
                "zone": overall,
            }

    return {
        "customer": customer,
        "asOf": today,
        "goal": goal,
        "sprint": sprint,
        "quest": quest,
    }
