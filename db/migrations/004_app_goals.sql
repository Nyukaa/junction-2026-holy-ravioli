-- Apply after 003_app_demo_clock.sql.
-- App-created goals use demo_clock.today as their creation day.
-- New savings begin on the following day; existing balances are not counted.
CREATE TABLE IF NOT EXISTS app.goals (
    goal_id           bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id       text          NOT NULL UNIQUE REFERENCES junction.cust (customer_id),
    name              text          NOT NULL CHECK (length(trim(name)) > 0),
    target_amount_eur numeric(12,2) NOT NULL CHECK (target_amount_eur > 0),
    target_date       date          NOT NULL,
    reason            text,
    created_at        timestamp     NOT NULL,
    CHECK (target_date > created_at::date)
);
