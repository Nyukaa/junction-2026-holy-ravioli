"""Two endpoints only:  GET /status  and  POST /chat.  Both need the header x-customer-id."""
import asyncio
import re
from datetime import date

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from claude_client import FALLBACK_SUGGESTIONS, handle_chat
from config import FRONTEND_ORIGIN
from db import logic, repo
from schemas import ChatRequest, ChatResponse, GoalStatusResponse

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=[FRONTEND_ORIGIN], allow_methods=["GET", "POST"], allow_headers=["*"])

DATE_COMMAND = re.compile(r"^/date\s+(\d{4}-\d{2}-\d{2})$")


async def _customer(x_customer_id: str | None) -> str:
    if not x_customer_id or await asyncio.to_thread(repo.get_customer, x_customer_id) is None:
        raise HTTPException(status_code=403, detail="Unknown customer")
    return x_customer_id


@app.get("/status", response_model=GoalStatusResponse)
async def status(x_customer_id: str | None = Header(default=None)):
    """Goal progress, weekly sprint, rescue quest. Plain code, no AI."""
    customer_id = await _customer(x_customer_id)
    result = await asyncio.to_thread(logic.get_status, repo, customer_id)
    return result


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, x_customer_id: str | None = Header(default=None)):
    customer_id = await _customer(x_customer_id)

    # Demo helper, handled before the model: "/date 2026-09-21" moves the demo clock.
    m = DATE_COMMAND.match(req.text.strip())
    if m:
        try:
            new_date = date.fromisoformat(m.group(1))
        except ValueError:
            return ChatResponse(reply="That date does not look right. Use /date YYYY-MM-DD.", suggestions=FALLBACK_SUGGESTIONS)
        await asyncio.to_thread(repo.set_clock, new_date)
        return ChatResponse(reply=f"Demo date is now {new_date.isoformat()}.", suggestions=FALLBACK_SUGGESTIONS)

    try:
        return await handle_chat(customer_id, req.text)
    except Exception:  # never send a stack trace to the UI
        return ChatResponse(
            reply="Something went wrong. Please try again.",
            suggestions=FALLBACK_SUGGESTIONS,
            error="agent_failed",
        )
