from anthropic import AsyncAnthropic

from config import ANTHROPIC_API_KEY, ROUTER_MODEL

client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

# One canned reply for everything the router flags as out of scope.
OUT_OF_SCOPE_REPLY = (
    "I can help with your money goals, your spending and your plan. "
    "What would you like to look at?"
)
OUT_OF_SCOPE_SUGGESTIONS = ["How am I doing?", "Help me set a goal", "Can I afford something?"]

# Cheap call: its only job is a one-word classification, before the expensive tool loop starts.
ROUTING_PROMPT = """You are a strict binary classifier for a personal money coach chat (savings goals, spending, budget, plans).

Classify the user's message as exactly one of:
- in_scope: anything about the user's money, spending, saving, goals, plans, big purchases, unexpected expenses,
  income, or a reasonable follow-up or short answer ("yes", "2 kids", "rent") to the conversation so far.
- out_of_scope: nothing to do with personal finance: weather, recipes, coding help, sports, general knowledge,
  or asking the assistant to do an unrelated task.

Conversation so far:
{history}

Latest message to classify: "{message}"

Respond with ONLY one word: in_scope or out_of_scope"""


def history_to_text(history: list) -> str:
    lines = [f"{m['role']}: {m['content']}" for m in history if isinstance(m["content"], str)]
    return "\n".join(lines[-6:]) if lines else "(none yet)"


async def classify_scope(message: str, history_text: str = "(none yet)") -> str:
    response = await client.messages.create(
        model=ROUTER_MODEL,
        max_tokens=10,
        messages=[{"role": "user", "content": ROUTING_PROMPT.format(history=history_text, message=message)}],
    )
    text = next((b.text for b in response.content if b.type == "text"), "").strip().lower()
    # If the classifier answers something unexpected, let the message through.
    return "out_of_scope" if "out_of_scope" in text else "in_scope"
