# Spec: <feature name>

**Owner:** Alex / Anna / Elya
**Branch:** feat/<name>

## Goal

One or two sentences. What does this feature do and why do we need it for the demo?

## User flow

1. User does X
2. App shows Y
3. User clicks Z, then ...

## Data

- **Input:** where the data comes from (form, `data/xxx.json` via `src/lib/data/*`, API route)
- **Output:** what the user sees or what the API returns
- **Shape:** short example

```json
{
  "id": "1",
  "title": "Example"
}
```

## UI

- Page or component: `src/app/xxx/page.tsx` / `src/components/Xxx.tsx`
- Main elements: list, button, input, loading state, error state
- Figma link (optional):

## AI part (if any)

- What we send to Claude (via `src/lib/ai/*`):
- What we expect back (text / JSON):
- Fallback if the API fails:

## Edge cases

- Empty data
- API error
- Slow response (show loading)

## Out of scope

Things we do NOT build now (to keep the task small):
-

## Done when

- [ ] Works in the browser with the demo scenario
- [ ] `npx tsc --noEmit` and `npm run lint` pass
- [ ] Committed and pushed
