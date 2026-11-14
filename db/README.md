# Database behavior

Apply the numbered migrations in order. Migration `004_app_goals.sql` completes
the storage needed by the current `Db` interface. Raw data stays in `junction`;
the application writes only to `app`.

## Goals and progress

Each customer can have one goal. Creating another goal fails without replacing
the existing one. The target must be a positive EUR amount with at most two
decimal places, and its date must follow the demo clock's current day.

Goals are created on `app.demo_clock.today`. Savings start at zero and include
net income minus spending on later days, through the current demo day. Existing
balances and transactions on the creation day do not count. Transfers
(`salary_sweep`, `investment_deposit`, `investment_withdrawal`) are excluded.
Refunds offset spending.

Saved amounts cannot display below zero; remaining amounts cannot display below
zero; percentage is rounded to a whole number and capped at 100. A negative net
cash flow still affects whether the goal is on track.

When a dated plan exists, on-track status compares actual net savings with the
signed plan cash flow due by today. This allows planned expenses before income.
Without a plan, the expected savings follow the elapsed fraction of the goal's
timeline. At or after the target date, the target amount must be reached.
Expected savings never exceed the goal target, even if the plan would save more.

Rewinding the demo clock before a goal's creation day hides that goal and its
progress. Goal, budget, and savings reads use one consistent database snapshot.

## Warnings and plans

Spending warnings compare actual net category spending so far this calendar
month with the complete month's planned category limit. Once the month has a
budget, an unbudgeted spending category has a zero limit. Without any monthly
budget, no category overspending warning is inferred.

Behind-plan warnings use the same expected savings as progress. Warnings are
medium severity, rising to high for an unmet goal at or after its deadline. A
low-severity Christmas reminder appears in the preceding calendar month for
unfinished goals spanning Christmas; it does not forecast an amount.

Saving a plan replaces the customer's entire set of dated entries atomically.
Future plan entries are intentionally visible to the coach, but future actual
transactions never are. Goal math uses exact integer cents in
`src/lib/db/logic/goals.ts`; PostgreSQL supplies aggregates, not model-generated
calculations.

## Local setup

Set `DATABASE_URL` and, for Aiven, `DATABASE_CA` to trusted PEM contents or a
certificate file path. Do not commit credentials, certificates, raw CSVs, or
generated seed SQL. The CSV import script is for initial loading before `app`
tables reference customers; it resets the raw tables.

Methods expect a real `junction.cust.customer_id`. The frontend's current `demo`
placeholder is not mapped to another customer; callers must supply a real ID.
