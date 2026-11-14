# Project Tasks — Money Polku

**Hackathon deadline:** 48 hours from kickoff  
**Scenario 1 (goal creation):** User opens app for first time. The AI looks at the data and asks "Is this you?". Chats with AI to define goal (Alps trip, 3 months, €2000). Agent suggests plan (save €700/month by cutting dining). User confirms. Goal saved.  
**Scenario 2 (on track + warning):** User opens app. Sees progress "€600/€2000 saved". Warning: "⚠️ Laptop broke (€500). Now €500 behind. Options: (1) cut spending, (2) delay trip."

| Priority | Task | Owner | Status | Notes |
|----------|------|-------|--------|-------|
| **P0** | Setup: database schema, goals, goal_plans, transactions | Alex | — | Run migrations, load S-Bank CSV, create goal tables |
| **P0** | Setup: API endpoints (status, chat) structure | Anna | — | Routes, zod validation, return mock data |
| **P0** | Setup: UI layout, home page + chat interface | Elya | — | Responsive layout for phone, message list + input + goal progress display |
| **P0** | Implement `GET /api/status` with real db calls | Anna | — | Call db methods for goal state, progress, warnings |
| **P0** | Implement `POST /api/chat` with agent loop | Anna | — | Anthropic client, tool definitions, error handling |
| **P1** | Database: query methods (Db interface) | Alex | — | Methods: get_goal, create_goal, get_progress, detect_warnings, calculate_plan |
| **P1** | Database: goal math logic (progress tracking, warning detection, monthly budget) | Alex | — | Plain code in src/lib/db/logic/ |
| **P1** | Agent tools: thin wrappers around db methods | Anna | — | 4–6 tools: create_goal, save_plan, get_progress, detect_issues, suggest_action |
| **P1** | Agent prompts: coach user to create goal, then encourage/warn | Anna | — | System prompt: ask questions in Scenario 1, give feedback in Scenario 2 |
| **P1** | UI: chat interface, message list, input | Elya | — | Fetch from /api/chat, show messages, handle loading + errors |
| **P1** | UI: home page with goal progress + warning alert | Elya | — | Show "€X/€Y saved", motivation text, warning banner if issues detected |
| **P1** | Agent: "Is this you?" step: summarize patterns from the data, ask the user to confirm | Anna | — | Uses db tool results only. User confirms or corrects before the plan |
| **P1** | Database: sprint (weekly limit + reward), forecast line vs real savings, status 🟢/🟡/🔴 | Alex | — | Plain code. Texts built by code |
| **P1** | Database + agent: yellow zone and rescue quest (2 days, never above the overspend) | Alex, Anna | — | Category over its limit gives a quest, not a ban |
| **P1** | UI: sprint card, forecast vs real chart (dashed vs solid green line), status bar colors, buttons Change goal / Explain | Elya | — | Contract for the new fields: agree in `src/types/contracts.ts` first |
| **P2** | Cleanup: remove `src/app/api/ask/route.ts` (starter leftover) and `src/backend/` (old Python draft) | Anna | — | The rule is two endpoints only. The stack is TypeScript |
| **P2** | Testing: manual walk-through Scenario 1 + Scenario 2 | All | — | Browser on phone size, verify end-to-end flow |
| **P2** | Documentation: spec files (ui.md, api-and-agent.md, database.md) | Each | — | One per owner, reference _template.md |
| **P2** | TypeScript strict + linting + formatting | All | — | `npx tsc --noEmit`, `npm run lint` must pass |

## How to pick a task

1. Choose a **P0** or **P1** task from the table above
2. Write your name in the **Owner** column (if not already assigned)
3. Create a branch: `git checkout -b feat/<task-name>`
4. Write a short spec in `docs/specs/<task-name>.md` (copy `_template.md`), then ask the team for a 2-min review
5. Build it in small steps
6. When done, commit and push, open a PR
7. Another team member reviews and merges

## Status codes

- `—` Not started
- `in progress` Currently being worked on
- `done` Completed, merged to main
- `blocked` Waiting for another task

## Notes for each role

**Elya (UI):**  
- Use shadcn/ui components from the starter  
- Phone-first: test on a phone-size window (375px width)  
- Error states: show a simple message, no crash
- Home page: show goal progress + motivation + warning (if any)

**Anna (API + Agent):**  
- Keep endpoints simple: only `status` and `chat`, no extra routes  
- Scenario 1: Agent asks questions and guides user to confirm goal + plan  
- Scenario 2: Agent gives encouraging progress update, detects warnings, suggests actions
- Agent must never calculate; only show tool results or fallback  
- Always parameterize SQL queries (never pass them to agent)

**Alex (Database):**  
- One migration file per schema change; never edit an applied migration  
- All goal math in plain code, not in SQL  
- Warning detection: if spending vs plan is X% off, or upcoming event (holiday), flag it
- Respect the demo clock: never return data after today

---

**Questions?** Ask before you guess. The goal is a working demo, not perfect code.
