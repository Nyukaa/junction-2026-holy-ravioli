# Database behavior

Apply the numbered migrations in order. Migration `004_app_goals.sql` completes
the storage needed by the current `Db` interface. Raw data stays in `junction`;
the application writes only to `app`.

## Goals and progress

Each customer can have one goal. Creating another goal fails without replacing
the existing one. The target must be a positive EUR amount with at most two
decimal places, and its date must follow the demo clock's current day.

Goals are created on `app.demo_clock.today`. Savings come from spending less than
planned, compared separately for each calendar month and category. Only positive
differences count; overspending in one group does not reduce savings from another.
Spending without a plan does not earn savings.

Both actual transactions and planned expenses must fall after the goal's creation
day and on or before the current demo day. The current month's positive difference
counts immediately and can change as spending continues. Future planned expenses
do not earn savings early. Starting balances and income are not goal savings;
only negative planned spending entries define the budgets. Transfers
(`salary_sweep`, `investment_deposit`, `investment_withdrawal`) are excluded.
Refunds offset actual spending, which is never treated as negative spending.

Saved amounts cannot display below zero; remaining amounts cannot display below
zero; percentage is rounded to a whole number and capped at 100.

On-track status and behind-plan warnings use these same plan-based savings.
The expected savings calculation is unchanged: when a dated plan exists, it uses
the signed plan cash flow due by today, including planned income and expenses.
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
