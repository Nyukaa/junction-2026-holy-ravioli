"""The agent's two tools. Thin wrappers: no SQL, no math here. The work happens in db/logic.py.

customer_id is closed over from the request (header x-customer-id). The model can not choose it.
"""
import asyncio
from datetime import date, datetime

from db import logic, repo

TOOLS_SCHEMA = [
    {
        "name": "get_customer_data",
        "description": (
            "Get ALL data about the current customer: today's date, 2 years of transactions, a monthly summary, "
            "and all existing plans for the next year. No input needed."
        ),
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "save_plan",
        "description": (
            "Save a NEW plan for the customer. Call ONLY after you showed the plan in the chat and the customer "
            "clearly agreed. kind=goal replaces the current savings goal. kind=expense is a planned big expense."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "kind": {"type": "string", "enum": ["goal", "expense"]},
                "title": {"type": "string"},
                "target_amount": {"type": "number", "description": "EUR"},
                "deadline": {"type": "string", "description": "YYYY-MM-DD, in the future"},
                "monthly_contribution": {"type": "number", "description": "EUR per month"},
                "weekly_limit": {"type": "number", "description": "EUR per week for everyday spending (optional)"},
                "starting_amount": {"type": "number", "description": "EUR already saved (optional)"},
                "note": {"type": "string"},
            },
            "required": ["kind", "title", "target_amount", "deadline", "monthly_contribution"],
        },
    },
]


async def get_customer_data(customer_id: str) -> dict:
    return await asyncio.to_thread(logic.get_customer_data, repo, customer_id)


async def save_plan(customer_id: str, **plan) -> dict:
    try:
        return await asyncio.to_thread(logic.save_plan, repo, customer_id, plan)
    except ValueError as e:  # bad input: tell the model, it can fix it or ask the customer
        return {"saved": False, "error": str(e)[:300]}


TOOL_FUNCTIONS = {"get_customer_data": get_customer_data, "save_plan": save_plan}
