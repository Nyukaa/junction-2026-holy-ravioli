# Junction Starter

Starter template for our Junction 2026 hackathon team (Holy Ravioli).
Goal: start the 48 hours with a working base, not from zero.

## What is inside

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- **shadcn/ui** (Radix UI, Nova preset) for ready UI components
- **Anthropic SDK** for AI features
- **zod** for input validation
- **Prettier** for formatting
- **JSON files** in `data/` instead of a database (simple and fast for a hackathon)
- **Claude Code** config: `CLAUDE.md`, hooks and custom commands
- **docs/** for our idea, tasks and short feature specs

## Before the hackathon (do once, everyone)

Check that you have all of this:

| Tool                   | How to check           | How to get it                                        |
| ---------------------- | ---------------------- | ---------------------------------------------------- |
| Git                    | `git --version`        | https://git-scm.com                                  |
| Node 22                | `node -v`              | `nvm install 22`                                     |
| GitHub access          | can open the team repo | ask Anna to add you                                  |
| Claude Code            | `claude --version`     | https://docs.claude.com/en/docs/claude-code/overview |
| jq (for Prettier hook) | `jq --version`         | macOS: `brew install jq`                             |

Log in to Claude Code once: run `claude` in any folder and follow the login steps.

## Start (hackathon day)

### Step 1: ONE person creates the team repo (Anna)

1. Open the `junction-starter` repo on GitHub.
2. Click **Use this template** → **Create a new repository**.
3. Name it, set it to **Private**.
4. Go to **Settings → Collaborators** and add Alex and Elya.

Everyone works in this ONE new repo. Do not create three copies.

### Step 2: everyone clones the NEW repo

```bash
git clone <new-repo-url>
cd <new-repo-folder>
nvm use 22
npm install
cp .env.example .env.local
```

### Step 3: add the API key

1. Open `.env.local` and put the Anthropic key there.
2. Never commit this file (it is already in `.gitignore`).
3. Share the key in a private message, never in Git or in a public chat.

### Step 4: run

```bash
npm run dev
```

Open http://localhost:3000. If you see the starter page, you are ready.

## Environment variables

| Variable            | What for                      |
| ------------------- | ----------------------------- |
| `ANTHROPIC_API_KEY` | Claude API key (server only!) |

If you add a new variable, add it to `.env.example` too (with an empty value).

## Project structure

```
data/             # JSON files with our data
doc/
  idea.md         # what we build, for whom, 3 main features
  tasks.md        # task list: task, owner, status
  specs/          # one short spec per feature (copy _template.md)
src/
  app/
    api/          # route handlers (src/app/api/<name>/route.ts)
  components/
    ui/           # shadcn components (npx shadcn@latest add <name>)
  lib/
    ai/           # Anthropic client and streaming helper
    data/         # helpers to read and write JSON files
  types/          # shared TypeScript types
.claude/
  commands/       # custom Claude Code commands
  settings.json   # hooks (auto-format with Prettier)
CLAUDE.md         # rules for Claude Code
.env.example      # env template
```

## Scripts

- `npm run dev` - start dev server
- `npm run lint` - run ESLint
- `npx tsc --noEmit` - type check

## How we work (daily flow)

1. Pick a task in `docs/tasks.md` and write your name next to it.
2. Pull the latest code and make a branch:

   ```bash
   git checkout main
   git pull
   git checkout -b feat/<name>
   ```

3. Write a short spec in `docs/specs/<name>.md` (copy `docs/specs/_template.md`). Half a page is enough.
4. Build it in small steps (see "Working with Claude Code" below).
5. Check in the browser. Run `npx tsc --noEmit` and `npm run lint`.
6. Commit and push:

   ```bash
   git add .
   git commit -m "feat: short message"
   git push -u origin feat/<name>
   ```

7. Open a Pull Request on GitHub. One other person looks at it quickly and merges.
8. Back to `main`, `git pull`, next task.

## Working with Claude Code

Run `claude` in the project root. It reads `CLAUDE.md` automatically.

Good way to work:

1. Start with plan mode (press Shift+Tab) and ask for a short plan.
2. Say what to build, for example:
   `Implement docs/specs/search-page.md. Do only this feature.`
3. Read the diff. Run the app. If it is OK, commit.
4. Next small step.

Custom commands (type `/` in Claude Code):

- `/new-api <name>` - new API route with zod validation
- `/new-component <name>` - new component

Tips:

- One request = one small thing. Big requests give big messy diffs.
- After every edit, Prettier runs automatically (needs `jq`).
- If Claude does something you did not ask for, say "revert this part" and be specific.
- For parallel work, use git worktrees:
  `git worktree add ../junction-feat-x feat/x`
- Personal Claude settings (only for you) go in `CLAUDE.local.md`. Do not commit it.

## Team areas

To avoid merge conflicts, each person has a main area:

| Person | Area                          |
| ------ | ----------------------------- |
| Elya   | UI and components             |
| Anna   | AI integration and API routes |
| Alex   | Architecture and core logic   |

If your task needs changes in another person's area, tell them first.

## Team rules

- `main` is always working. Do not push broken code to it.
- One task = one branch: `feat/<name>`. Open a PR, another person reviews it quickly.
- Commit small and often. Commit messages: `feat: ...`, `fix: ...`.
- Pull before you start work. Never force push.
- JSON files in `data/` are shared: tell the team before you change their structure.
- No new dependencies without telling the team.
- Never commit real keys.

<!-- ## Deploy (Vercel) [commented out: demo is local only]

1. Push `main` to GitHub.
2. In Vercel: **Add New → Project** → import the repo.
3. Add `ANTHROPIC_API_KEY` in **Settings → Environment Variables**.
4. Deploy. Check the live link before the demo.

Do the first deploy early (in the first hours), not in the last hour. -->

## Demo day

One person (whose laptop will show the demo) checks beforehand:

- [ ] `npm run dev` or `npm run build && npm start` starts cleanly from scratch
- [ ] Demo scenario (2–3 minutes) is written and rehearsed once
- [ ] Backup: screen recording of the demo working, in case internet or API fails

## Common problems

| Problem                        | What to do                                                       |
| ------------------------------ | ---------------------------------------------------------------- |
| `npm run dev` fails after pull | Run `npm install` again                                          |
| AI route returns an error      | Check `ANTHROPIC_API_KEY` in `.env.local`, restart `npm run dev` |
| Prettier hook does not run     | Install `jq` and restart Claude Code                             |
| Merge conflict                 | Do not panic. Ask in the team chat, solve it together            |
| Works locally, not on Vercel   | Check env variables in Vercel settings                           |

## Checklist: first hour of the hackathon

- [ ] Challenge chosen
- [ ] `docs/idea.md` filled (what, for whom, 3 main features)
- [ ] Team repo created from the template, everyone cloned and can run `npm run dev`
- [ ] API key works for everyone
- [ ] `docs/tasks.md` filled, each task has an owner
- [ ] First deploy to Vercel done
