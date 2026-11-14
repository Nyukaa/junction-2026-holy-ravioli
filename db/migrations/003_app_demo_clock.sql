-- Apply after 002_app_plans.sql. Change today to advance or rewind the demo.
CREATE TABLE IF NOT EXISTS app.demo_clock (
    singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
    today     date NOT NULL
);

INSERT INTO app.demo_clock (singleton, today)
VALUES (true, CURRENT_DATE)
ON CONFLICT (singleton) DO NOTHING;
