-- A meneja can correct a mapato entry, or a matumizi request that the mhasibu hasn't paid yet (and
-- history typed in later, which never goes through the mhasibu). These say who changed it last and
-- when, so every list can show that it was edited. Nothing already saved counts as edited.
ALTER TABLE incomes ADD COLUMN edited_at timestamptz;
ALTER TABLE incomes ADD COLUMN edited_by integer REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE incomes ADD CONSTRAINT incomes_edited_by_when CHECK (edited_by IS NULL OR edited_at IS NOT NULL);

ALTER TABLE money_requests ADD COLUMN edited_at timestamptz;
ALTER TABLE money_requests ADD COLUMN edited_by integer REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE money_requests ADD CONSTRAINT money_requests_edited_by_when CHECK (edited_by IS NULL OR edited_at IS NOT NULL);
