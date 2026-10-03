-- History typed in after the fact. The entry keeps its real date in the usual columns (an income's
-- created_at, an expense's issued_at), so totals and reports place it in the right month;
-- backfilled_at is when someone actually entered it. Null for everything entered as it happened.
ALTER TABLE incomes ADD COLUMN backfilled_at timestamptz;
ALTER TABLE money_requests ADD COLUMN backfilled_at timestamptz;

-- A past expense is entered as already paid: it never waits for the manager, the mhasibu or a receipt.
ALTER TABLE money_requests ADD CONSTRAINT money_requests_backfilled_paid
  CHECK (backfilled_at IS NULL OR (issued_at IS NOT NULL AND NOT receipt_due));
