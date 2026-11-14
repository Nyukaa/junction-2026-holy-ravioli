# Trip Coach — Project Idea

## What we build

A **goal-focused money coach**. Users chat with an AI agent to define ONE goal (e.g., "Trip to Alps for snowboarding in 3 months") and create a plan to reach it. The agent tracks progress, gives encouragement, and warns when spending goes off-track or upcoming events (holidays, bills) threaten the goal.

## For whom

A bank customer (S-Bank demo dataset, PostgreSQL on Aiven) who has a specific goal and needs coaching to reach it: save money by cutting certain spending, planning ahead, and staying motivated.

## Three main features

1. **Goal + plan creation** (first time): User chats with the agent to define their goal and create a plan. Agent asks: "What's your goal? When? How much do you need? Where can you save?" After the user confirms, the goal and plan are saved.

2. **Encourage when on track**: Every time the app opens, the user sees encouraging feedback: "Great progress! You're €200 towards your Alps trip. Keep it up!" Warnings about upcoming events: "⚠️ Christmas is coming—remember you wanted to save. Maybe skip the dining out this month?"

3. **Warn on unexpected spending**: When an unexpected purchase happens (e.g., broken laptop €500), the app alerts: "⚠️ This breaks your plan. You need to either spend €500 less elsewhere or push back your trip by a month. Options?"

## How it works

- **UI** (Elya): Chat interface for goal setup, home page with progress + encouragement, alert for warnings
- **Agent** (Anna): Two API endpoints (`/api/status`, `/api/chat`). Agent coaches user through goal setup, then analyzes spending against the plan.
- **Database** (Alex): PostgreSQL (Aiven). Stores user's goal, monthly plan, spending, and upcoming events. Schema: raw S-Bank data + goal state, monthly budget allocation, warnings.

## Demo scenarios

**Scenario 1 (first time):**
- User: "I want to save for a snowboarding trip to the Alps in 3 months"
- Agent: "Great! How much money do you need? Where do you usually spend the most? What can you cut back on?"
- After plan is saved: ✅ "Your goal: €2,000 for Alps trip. Plan: save €700/month by cutting dining out and reducing shopping. You got this!"

**Scenario 2 (regular user):**
- User opens app
- Alert: "⚠️ Unexpected €500 laptop repair! This puts you €500 behind. Options: (1) Spend €500 less on dining/shopping, (2) Push trip back by one month, (3) Save €500 from next month's income"

## Tech stack

- **Frontend**: Next.js (App Router), TypeScript (strict), Tailwind, shadcn/ui
- **AI**: Anthropic SDK (Claude 3.5 Sonnet)
- **Backend**: Two endpoints (status, chat), plain Node.js + pg
- **Database**: PostgreSQL (Aiven), SQL + plain code for goal tracking
- **Deployment**: Local demo only (48-hour hackathon)

## Success criteria

- Demo works on a phone-size browser window
- Scenario 1: User can chat to create a goal, agent suggests a plan, goal is saved
- Scenario 2: User sees encouraging progress message and warning about spending vs plan
- Messages are simple, motivating, and actionable
- All numbers (goal, plan, spending, warnings) come from the database, not calculated by the model
- TypeScript strict + lint passing
