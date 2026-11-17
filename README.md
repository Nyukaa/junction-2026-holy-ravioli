# 🧭 Money Polku — AI Financial Coach

**Your money has a past. Let's plan its future.**

*Polku* is Finnish for "path". Money Polku turns your bank transactions into a personal savings plan and a coach you can talk to. Built at **Junction 2026** for the **S-Bank (S-Pankki)** challenge by team **Holy Ravioli**.

## 💡 The idea

Bank apps show what already happened. People want to know what is coming and what they can do about it. "Can I afford this trip?" or "What do I cut to build an emergency fund?" are hard questions to answer from a list of transactions.

Money Polku answers them from **your own data**. The AI coaches, the code does the math, and you stay in control.

## 📸 Screenshots

<table>
  <tr>
    <td align="center" width="33%">
      <img src="docs/screenshots/01-choose-goal.png" alt="Choose a goal" width="230"><br>
      <sub><b>Pick a goal</b><br>Holiday, first home, emergency fund or your own.</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/screenshots/02-goal-and-plan-saved.png" alt="Coach proposes a plan and the user confirms" width="230"><br>
      <sub><b>Confirm the plan</b><br>Limits come from your past spending. Nothing is saved before "yes".</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/screenshots/04-on-track-chat.png" alt="Goal on track, user asks the coach" width="230"><br>
      <sub><b>🟢 On track</b><br>Ask the coach anything about your goal.</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="docs/screenshots/03-behind-plan-rainy-day.png" alt="Rainy-day fund needs adjusting" width="230"><br>
      <sub><b>🟡 Needs adjusting</b><br>Status is clear at a glance.</sub>
    </td>
    <td align="center">
      <img src="docs/screenshots/05-behind-plan-home.png" alt="Family holiday behind plan with quick questions" width="230"><br>
      <sub><b>Behind plan?</b><br>Tap <i>Change plan</i> or use a quick question.</sub>
    </td>
    <td align="center">
      <img src="docs/screenshots/06-change-plan-confirm.png" alt="Coach shows the proposed change and the user confirms" width="230"><br>
      <sub><b>You confirm every change</b><br>The coach shows what changes and what stays.</sub>
    </td>
  </tr>
</table>

## ✨ Key Features

- **Personal** — the plan is built from your own transaction history. The coach finds patterns and asks "Is this you?" before it plans anything.
- **Realistic** — one goal at a time. The coach says if the goal is possible, how much to save each month and where to cut back.
- **Clear progress** — a goal bar with status (🟢 on track, 🟡 needs adjusting), a weekly sprint and a forecast vs. actual chart.
- **Rescue quest, not a ban** — if you go off course, you get one small action for 2 days. It never asks you to save more than the overspend.
- **You stay in control** — every plan change needs your "yes". Tap **Change plan** or **Explain** anytime.
- **Numbers come from code, not from the model** — goal, progress, warnings and limits are calculated in TypeScript from the database. The model never calculates or invents a number.

## 🛠 Tech Stack

| Layer    | Tools                                                    |
| -------- | -------------------------------------------------------- |
| Frontend | Next.js 16 (App Router), TypeScript (strict), Tailwind CSS, shadcn/ui |
| AI       | Anthropic SDK (Claude) with tool use                     |
| Backend  | Next.js API routes, zod validation                       |
| Database | PostgreSQL on Aiven (`pg` driver)                        |

## 🧠 Architecture

```mermaid
flowchart LR
    UI["📱 Web app<br/>Next.js, mobile-first"]

    subgraph API["API · only 2 endpoints"]
        S["GET /api/status"]
        C["POST /api/chat"]
    end

    AG["🤖 Coaching agent<br/>Claude + tools"]
    DB["⚙️ Database layer<br/>SQL · goal tracking · plan math"]
    PG[("🗄️ PostgreSQL<br/>Aiven")]

    UI --> S
    UI --> C
    S -->|"no AI"| DB
    C --> AG
    AG -->|"tool calls"| DB
    DB --> PG

    classDef ai fill:#d1e7dd,stroke:#1a5f3c,color:#0f3d26
    classDef code fill:#e8f1fb,stroke:#3b6ea5,color:#1c3d63
    class AG ai
    class DB,S code
```

- **Two API routes only.** `/api/status` reads the home screen data with no AI. `/api/chat` talks to the agent.
- **Thin tools.** One agent tool per `Db` method. No SQL and no math in the agent layer.
- **All goal math is plain TypeScript** in `src/lib/db/logic/`, so every number can be traced and tested.

## 📊 Data Findings

We checked the S-Bank dataset (synthetic: 5,100 customers, 3.6M transactions, Oct 2024 – Sep 2026) before building the forecast.

- **Fixed payments are easy to predict.** Housing and salary: about 5% median error using last month.
- **Everyday spending is noisy.** About 31% median error for purchases, so every plan needs a buffer.
- **Seasonality is real by category, not in total.** Travel peaks in July (+28%), Home & Tech in November (+28%), Health in February (+20%). Friday and Saturday spending is about 27% above average.
- **Recent months beat "same as last year"** (31% vs 45% error), so we use seasonal indexes per category.
- **Merchant-based subscription detection does not work** on this data. We use transaction type instead.
- **"People like you" did not beat the user's own history** in our backtest. It helps most when the history is short.

## 🗂 Project Structure

<details>
<summary>Show structure</summary>

```
src/app/                 pages and layouts (UI)
src/app/api/status/      GET /api/status
src/app/api/chat/        POST /api/chat
src/components/          UI components (home screen, chat, coach widgets)
src/lib/ai/              Anthropic client, prompts, tools, run loop
src/lib/db/              the only place that talks to PostgreSQL
  logic/goals.ts         pure goal math: progress, savings, warnings
src/types/contracts.ts   shared types between UI, API and db layer
db/migrations/           numbered SQL files
scripts/                 CSV → SQL loader for the S-Bank dataset
docs/                    idea, tasks, specs, screenshots, setup
```

</details>

Want to run it locally? See [`docs/SETUP.md`](docs/SETUP.md).

## 🔭 Roadmap

- **Recurring payments** — detect rent, mortgage, car and loan payments from categories, MCC codes and timing.
- **Smarter seasonality** — Finnish holidays and seasons, plus spending from past years.
- **More goals per person** — today the app focuses on one goal at a time.
- **More banks** — a multi-bank view with PSD2.
- **People like you** — benchmarks from similar customers, with open data from Statistics Finland.
- **Proactive alerts** before a tight month.
- **Prompt evaluation** for more reliable coaching.

## 👥 Team

**Holy Ravioli** — **Anna** (API, AI agent and tools) · **Alex** (database and goal logic) · **Elya** (UI)
