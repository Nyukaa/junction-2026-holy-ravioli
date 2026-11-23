-- Apply after 004_app_goals.sql.
-- transaction_type on app.plans was never used for any decision (always a
-- placeholder for planned entries). This only drops the NOT NULL constraint so
-- Steps 2-7 can stop writing it; the column itself stays (nullable, unused) in
-- case it's useful again later. junction.tx keeps its real transaction_type
-- untouched throughout.
ALTER TABLE app.plans ALTER COLUMN transaction_type DROP NOT NULL;
