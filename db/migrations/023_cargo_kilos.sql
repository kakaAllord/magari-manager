-- Cargo can be priced by the kilo as well as by the tonne. `unit` ('tonne' or 'kg') says which one
-- the meneja typed, so screens and invoices show it back that way. `tonnes` and `rate_per_tonne`
-- stay in tonnes either way (250 kg at TSh 52.25 a kilo is 0.25 t at TSh 52,250 a tonne), so every
-- total, chart and Excel sum still adds like with like. Everything already saved was typed in tonnes,
-- which the default records; a page opened before this sends no unit and is tonnes too.
-- Both can carry decimals now: tonnes to five places (kilos to two) and the rate to cents.
ALTER TABLE incomes ADD COLUMN unit text NOT NULL DEFAULT 'tonne' CHECK (unit IN ('tonne', 'kg'));
ALTER TABLE incomes ALTER COLUMN tonnes TYPE numeric(12, 5), ALTER COLUMN rate_per_tonne TYPE numeric(12, 2);

ALTER TABLE invoice_lines ADD COLUMN unit text NOT NULL DEFAULT 'tonne' CHECK (unit IN ('tonne', 'kg'));
ALTER TABLE invoice_lines ALTER COLUMN tonnes TYPE numeric(12, 5), ALTER COLUMN rate_per_tonne TYPE numeric(12, 2);
