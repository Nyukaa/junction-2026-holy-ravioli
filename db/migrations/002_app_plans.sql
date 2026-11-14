-- Apply after 001_junction_schema.sql.
-- Planned transactions are separate from the read-only junction dataset.

CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.plans (
    plan_id          bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id      text          NOT NULL REFERENCES junction.cust (customer_id),
    plan_date        date          NOT NULL,
    plan_timestamp   timestamp     NOT NULL,
    category         text          NOT NULL,
    plan_amount_eur  numeric(12,2) NOT NULL,
    transaction_type text          NOT NULL,
    reason           text          NULL
);

CREATE INDEX IF NOT EXISTS plans_customer_date_idx ON app.plans (customer_id, plan_date);
