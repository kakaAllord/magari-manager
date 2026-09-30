-- A manager can take back an income entry they recorded in the last 24 hours. The row stays,
-- marked deleted, so the director's feed still shows what was removed and by whom.
ALTER TABLE incomes ADD COLUMN deleted_at timestamptz;
ALTER TABLE incomes ADD COLUMN deleted_by integer REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE incomes ADD CONSTRAINT incomes_deleted_by_when CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL);

-- A director switches a manager off instead of deleting them, so their name stays on past
-- decisions and income. Switched-off users cannot sign in.
ALTER TABLE users ADD COLUMN deactivated_at timestamptz;
