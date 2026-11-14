-- Raw S-Bank synthetic dataset (read-only for the app).
-- Data is loaded by the files generated with scripts/build-junction-sql.ps1.

CREATE SCHEMA IF NOT EXISTS junction;

-- tx_customers_junction.csv
CREATE TABLE IF NOT EXISTS junction.cust (
    customer_id          text     PRIMARY KEY,
    customer_postal_code text     NOT NULL,
    customer_age         smallint NOT NULL
);

-- tx_junction_transactions.csv
CREATE TABLE IF NOT EXISTS junction.tx (
    tx_id             bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id       text          NOT NULL REFERENCES junction.cust (customer_id),
    bank_account_id   text          NOT NULL,
    tx_date           date          NOT NULL,
    tx_timestamp      timestamp     NOT NULL,
    category          text          NOT NULL,
    tx_amount_eur     numeric(12,2) NOT NULL,
    balance_after_eur numeric(12,2) NOT NULL,
    transaction_type  text          NOT NULL,
    merchant_id       text,
    mcc_code          text
);

CREATE INDEX IF NOT EXISTS tx_customer_date_idx ON junction.tx (customer_id, tx_date);

-- mtg_tx_customer_link_and_final_mtg_infio.csv
CREATE TABLE IF NOT EXISTS junction.mtg_link (
    mortgage_customer_id        text          PRIMARY KEY,
    customer_id                 text          NOT NULL UNIQUE REFERENCES junction.cust (customer_id),
    final_decision              text          NOT NULL,
    rejection_reason            text,
    final_property_price_eur    numeric(12,2) NOT NULL,
    final_requested_loan_eur    numeric(12,2) NOT NULL,
    final_equity_amount_eur     numeric(12,2) NOT NULL,
    final_collateral_value_eur  numeric(12,2) NOT NULL,
    required_monthly_income_eur numeric       NOT NULL,
    final_loan_to_value         numeric       NOT NULL -- "lfinal_loan_to_value" in the CSV
);

-- mtg_negotiation_history.csv
CREATE TABLE IF NOT EXISTS junction.mtg_events (
    event_id                bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mortgage_customer_id    text          NOT NULL REFERENCES junction.mtg_link (mortgage_customer_id),
    event_timestamp         timestamp     NOT NULL, -- "timestamp" in the CSV
    event_type              text          NOT NULL,
    property_id             text,
    property_type           text,
    property_price_estimate numeric(12,2),
    loan_amount             numeric(12,2),
    equity_amount           numeric(12,2),
    collateral_type         text,
    collateral_value        numeric(12,2),
    collateral_status       text,
    decision                text,
    rejection_reason        text,
    expense_type            text,
    expense_amount          numeric(12,2),
    note                    text          NOT NULL
);

CREATE INDEX IF NOT EXISTS mtg_events_mortgage_ts_idx ON junction.mtg_events (mortgage_customer_id, event_timestamp);
