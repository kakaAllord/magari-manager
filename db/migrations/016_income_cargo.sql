-- Cargo income is priced per tonne: the manager types the rate and the tonnes, and `amount` keeps
-- their product, so every total, chart and report reads it as before. Older income, and income that
-- isn't cargo, has only its amount. `destination` is where the cargo went, optional.
ALTER TABLE incomes ADD COLUMN rate_per_tonne integer CHECK (rate_per_tonne > 0);
ALTER TABLE incomes ADD COLUMN tonnes numeric(8, 2) CHECK (tonnes > 0);
ALTER TABLE incomes ADD COLUMN destination text;
ALTER TABLE incomes ADD CONSTRAINT incomes_cargo_complete CHECK ((rate_per_tonne IS NULL) = (tonnes IS NULL));
ALTER TABLE incomes ADD CONSTRAINT incomes_destination_for_cargo CHECK (destination IS NULL OR tonnes IS NOT NULL);
