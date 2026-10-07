-- A client may pay part of a job now and the rest later, or nothing yet (a debt). Income still counts
-- the job's full value on its date, as before; `amount_paid` says how much of it has come in, so
-- amount − amount_paid is what the client still owes. Every entry made before this was paid in full.
-- A part-paid entry names its client so the debt can be followed up.
ALTER TABLE incomes ADD COLUMN amount_paid numeric(10, 2);
UPDATE incomes SET amount_paid = amount;
ALTER TABLE incomes ALTER COLUMN amount_paid SET NOT NULL;
-- Income saved without saying what was paid (the code running until this deploy is live, or the
-- seed) was paid in full, the default.
CREATE FUNCTION incomes_paid_in_full_by_default() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.amount_paid := coalesce(NEW.amount_paid, NEW.amount);
  RETURN NEW;
END $$;
CREATE TRIGGER incomes_paid_in_full_by_default BEFORE INSERT ON incomes
  FOR EACH ROW EXECUTE FUNCTION incomes_paid_in_full_by_default();
ALTER TABLE incomes ADD CONSTRAINT incomes_paid_within_amount CHECK (amount_paid >= 0 AND amount_paid <= amount);
ALTER TABLE incomes ADD COLUMN customer_name text CHECK (length(customer_name) BETWEEN 2 AND 120);
ALTER TABLE incomes ADD CONSTRAINT incomes_debt_has_customer CHECK (amount_paid = amount OR customer_name IS NOT NULL);
CREATE INDEX incomes_open_debt_idx ON incomes (created_at) WHERE amount_paid < amount AND deleted_at IS NULL;

-- Money that came in for income taken on credit: the part paid when it was recorded (if any) and
-- each payment after it, with who received it and an optional note such as an M-Pesa reference.
-- Their sum is the entry's amount_paid. Entries paid in full at once have no rows here.
CREATE TABLE income_payments (
  id          serial PRIMARY KEY,
  income_id   integer NOT NULL REFERENCES incomes(id) ON DELETE CASCADE,
  amount      numeric(10, 2) NOT NULL CHECK (amount > 0),
  note        text CHECK (length(note) <= 120),
  paid_at     timestamptz NOT NULL DEFAULT now(),
  recorded_by integer REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX income_payments_income_id_idx ON income_payments (income_id);
