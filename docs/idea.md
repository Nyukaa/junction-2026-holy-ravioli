# Money Polku — Project Idea

*Polku* is Finnish for "path".

## What we build

**Money Polku** is an AI money planner. It finds spending patterns in your life from S-Bank (S-Pankki) mock data. Then it shows what you can afford (your goal), when you can reach it, and what to change to get there.

## For whom

A bank customer (S-Bank demo dataset, PostgreSQL on Aiven) who wants to reach one clear money goal, for example a trip, and needs a plan and some coaching to get there.

## How it works for the user

1. **You choose a goal.** You chat with the agent: what, when, how much.
2. **The AI checks your data first.** It reads your data from the database and asks: "Is this you?" (for example: "You spend about €280 a month on dining out. Is that right?"). You confirm or correct. This makes the plan real.
3. **You get a plan and a home screen:**
   - **Dream progress:** a progress bar (for example "600 / 2 000 €") and a status: "🟢 You are on track".
   - **Weekly sprint:** "Stay within the limit until Friday and we unlock your favourite coffee and cake."
   - **Analytics chart (under the hood):** a dashed line (AI forecast) against a solid green line (your real savings).
4. **Off course (yellow zone).** Spending in one category (for example Groceries) goes over the forecast.
   - The goal bar turns yellow (for example "400 / 2 000 € · 20%") and the status changes: "🟡 You spend a bit faster than the AI forecast".
   - **Rescue quest:** instead of a dry ban, the AI suggests one clear action for 2 days: "Save €15 on food delivery to save your Friday coffee and cake."
5. **You stay in control.** If you want to change something, tap **Change goal** or **Explain**.

## Three main features

1. **Goal + plan creation** (first time): The agent analyzes your data, asks "Is this you?", then asks: "What's your goal? When? How much do you need? Where can you save?" After you confirm, the goal and the plan are saved.

2. **Encourage when on track**: Every time the app opens you see your progress, the weekly sprint and a short encouraging message. Warnings about upcoming events: "⚠️ Christmas is coming. Maybe skip dining out this month?"

3. **Warn on unexpected spending**: When an unexpected purchase happens (for example a broken laptop, €500), the app warns you, shows how far behind you are, and gives options. For smaller overspending in one category, you get the yellow zone and a rescue quest.

## Architecture

- **UI** (Elya): home screen (progress, sprint, chart, status, quest), chat, buttons **Change goal** and **Explain**.
- **API and agent** (Anna): two endpoints, `GET /api/status` and `POST /api/chat`. The agent has thin tools that call the database layer.
- **Database** (Alex): PostgreSQL (Aiven). Raw S-Bank data plus goal state, plan, warnings. All goal math is plain code, not the model.

## Demo scenarios (for the pitch)

**Scenario 1 (first time):**
- User: "I want to save for a snowboarding trip to the Alps in 3 months"
- The agent looks at the user's data and asks: "Is this you?"
- Agent: "Great! How much money do you need? Where do you usually spend the most? What can you cut back on?"
- After the plan is saved: ✅ "Your goal: €2,000 for the Alps trip. Plan: save about €700/month by cutting dining out and reducing shopping. You got this!"

**Scenario 2 (regular user):**
- User opens the app and sees progress "€600 / €2,000" and the weekly sprint.
- Alert: "⚠️ Unexpected €500 laptop repair! This puts you €500 behind. Options: (1) Spend €500 less on dining/shopping, (2) Push the trip back by one month, (3) Save €500 from next month's income"
- The user picks an option and the plan is updated.

## Tech stack

- **Frontend**: Next.js (App Router), TypeScript (strict), Tailwind, shadcn/ui
- **AI**: Anthropic SDK (model name in `src/lib/ai/model.ts`)
- **Backend**: Two endpoints (status, chat), plain Node.js + pg
- **Database**: PostgreSQL (Aiven), SQL + plain code for goal tracking
- **Deployment**: Local demo only (48-hour hackathon)

## Success criteria

- Demo works in a phone-size browser window
- Scenario 1: the agent shows what it sees in the data, the user confirms, the agent suggests a plan, the goal is saved
- Scenario 2: the user sees progress, the sprint and a warning with options
- Yellow zone shows a rescue quest, not a ban
- Messages are simple, motivating and actionable
- All numbers (goal, plan, spending, warnings, chart lines) come from the database, not from the model
- TypeScript strict + lint passing

## Out of scope

- Real bank login, PSD2 (one slide only)
- Investment advice
- More than two API endpoints
