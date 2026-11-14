import json
import re

from anthropic import AsyncAnthropic

from config import ANTHROPIC_API_KEY, CHAT_MODEL
from prompts import SYSTEM_PROMPT
from router import OUT_OF_SCOPE_REPLY, OUT_OF_SCOPE_SUGGESTIONS, classify_scope, history_to_text
from schemas import AgentAnswer, ChatResponse
from tools import TOOL_FUNCTIONS, TOOLS_SCHEMA

client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
model = CHAT_MODEL

MAX_TOOL_ROUNDS = 5
MAX_HISTORY = 20  # messages kept per customer

FALLBACK_SUGGESTIONS = ["How am I doing?", "Help me set a goal", "My washing machine broke"]

# In-memory conversation store, keyed by customer id (same idea as SESSIONS in the Nordic Shop agent).
# We keep ONLY the visible text of each turn (user text + final reply). Tool calls and their big results
# are dropped after the turn, so the history stays small. The model calls get_customer_data again when needed.
HISTORY: dict[str, list] = {}


def get_history(customer_id: str) -> list:
    return HISTORY.setdefault(customer_id, [])


def _remember(history: list, user_text: str, reply: str) -> None:
    history.append({"role": "user", "content": user_text})
    history.append({"role": "assistant", "content": reply})
    del history[:-MAX_HISTORY]


def _assistant_blocks(response) -> list:
    blocks = []
    for block in response.content:
        if block.type == "text":
            blocks.append({"type": "text", "text": block.text})
        elif block.type == "tool_use":
            blocks.append({"type": "tool_use", "id": block.id, "name": block.name, "input": block.input})
    return blocks


async def execute_tool(name: str, tool_input: dict, customer_id: str):
    fn = TOOL_FUNCTIONS.get(name)
    if fn is None:
        return {"error": f"Unknown tool: {name}"}
    try:
        return await fn(customer_id, **tool_input)
    except TypeError as e:  # wrong arguments from the model
        return {"error": f"Bad arguments: {e}"}


def parse_answer(text: str) -> ChatResponse:
    """The model must end with one JSON object. If it does not, show its text as the reply (no crash)."""
    raw = text.strip()
    raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()
    try:
        start, end = raw.index("{"), raw.rindex("}") + 1
        answer = AgentAnswer.model_validate(json.loads(raw[start:end]))
    except (ValueError, json.JSONDecodeError):
        return ChatResponse(reply=text.strip() or "Sorry, I could not answer that.", suggestions=FALLBACK_SUGGESTIONS)
    charts = answer.charts
    for i, chart in enumerate(charts, start=1):
        chart.id = f"c{i}"
    return ChatResponse(reply=answer.reply, suggestions=answer.suggestions or FALLBACK_SUGGESTIONS, charts=charts)


async def handle_chat(customer_id: str, user_text: str) -> ChatResponse:
    history = get_history(customer_id)

    # Routing workflow: a cheap call decides if the full tool loop is needed at all.
    scope = await classify_scope(user_text, history_to_text(history))
    if scope == "out_of_scope":
        _remember(history, user_text, OUT_OF_SCOPE_REPLY)
        return ChatResponse(reply=OUT_OF_SCOPE_REPLY, suggestions=OUT_OF_SCOPE_SUGGESTIONS)

    # Work on a copy: tool blocks live only inside this turn.
    messages = history + [{"role": "user", "content": user_text}]

    for _ in range(MAX_TOOL_ROUNDS):
        response = await client.messages.create(
            model=model,
            max_tokens=1500,
            system=SYSTEM_PROMPT,
            tools=TOOLS_SCHEMA,
            messages=messages,
        )
        messages.append({"role": "assistant", "content": _assistant_blocks(response)})

        if response.stop_reason != "tool_use":
            text = "\n".join(b.text for b in response.content if b.type == "text")
            result = parse_answer(text)
            _remember(history, user_text, result.reply)
            return result

        tool_results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            result = await execute_tool(block.name, block.input, customer_id)
            tool_results.append(
                {"type": "tool_result", "tool_use_id": block.id, "content": json.dumps(result, default=str)}
            )
        messages.append({"role": "user", "content": tool_results})

    return ChatResponse(
        reply="I could not finish that. Please try again in a moment.",
        suggestions=FALLBACK_SUGGESTIONS,
        error="too many tool rounds",
    )
