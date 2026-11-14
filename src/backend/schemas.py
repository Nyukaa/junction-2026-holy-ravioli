"""Pydantic models. They must match src/types/contracts.ts (the UI contract)."""
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

Zone = Literal["green", "yellow", "red"]
BarTone = Literal["neutral", "good", "warn", "bad"]


# ---------------------------------------------------------------- POST /chat
class ChatRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)


class Bar(BaseModel):
    label: str
    value: float
    tone: BarTone = "neutral"


class BarChart(BaseModel):
    id: str = ""  # filled by the server
    title: str
    unit: Literal["EUR", "%", "days"] = "EUR"
    bars: list[Bar] = Field(min_length=1, max_length=6)


class ChatResponse(BaseModel):
    reply: str
    suggestions: list[str] = []
    charts: list[BarChart] = []
    error: str | None = None


# What the model must return as its final message (parsed from JSON text).
class AgentAnswer(BaseModel):
    reply: str
    suggestions: list[str] = Field(default_factory=list, max_length=4)
    charts: list[BarChart] = Field(default_factory=list, max_length=2)


# ---------------------------------------------------------------- GET /status
class GoalProgress(BaseModel):
    title: str
    targetAmount: float
    saved: float
    deadline: date
    monthlyContribution: float
    percent: float
    aheadDays: int  # positive = ahead of plan, negative = behind
    zone: Zone
    statusText: str  # "🟢 You are ahead of plan by +12 days"
    progressText: str  # "2 000 / 8 000 €"


class Sprint(BaseModel):
    weekStart: date
    weekEnd: date
    limit: float
    spent: float
    zone: Zone
    rewardBudget: float  # what the user can unlock by staying within the limit
    rewardLabel: str
    motivatorText: str
    progressText: str  # "41 / 50 €"


class Quest(BaseModel):
    title: str  # "Save 8 € on restaurants to save your coffee and cake"
    saveAmount: float
    days: int
    driver: str
    protects: str
    zone: Zone


class Customer(BaseModel):
    id: str
    label: str


class GoalStatusResponse(BaseModel):
    customer: Customer
    asOf: date
    goal: GoalProgress | None
    sprint: Sprint
    quest: Quest | None


# ---------------------------------------------------------------- save_plan tool input
class PlanIn(BaseModel):
    kind: Literal["goal", "expense"] = "goal"  # goal = saving goal (replaces the active goal), expense = planned big expense
    title: str = Field(min_length=1, max_length=80)
    target_amount: float = Field(gt=0)
    deadline: date
    monthly_contribution: float = Field(ge=0)
    weekly_limit: float | None = Field(default=None, ge=0)  # limit for everyday spending per week, optional
    starting_amount: float = Field(default=0, ge=0)
    note: str | None = Field(default=None, max_length=300)
