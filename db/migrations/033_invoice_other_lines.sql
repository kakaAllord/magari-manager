-- An invoice line can be "mengineyo" as well as cargo by the tonne or the kilo: a car hired out, a
-- job not measured by weight. Such a line is its description, a quantity (1 for a lump sum) and a
-- price each. It keeps the quantity in `tonnes` and the price each in `rate_per_tonne`, with unit
-- 'other' saying so; invoice_lines are never added up by the tonne, only shown back. Its entry in
-- Mapato has no tonnes or rate (like any income that isn't cargo), so tonne totals stay true, and
-- carries the line's description in `destination`. Every line already saved is cargo and keeps its unit.
ALTER TABLE invoice_lines DROP CONSTRAINT invoice_lines_unit_check;
ALTER TABLE invoice_lines ADD CONSTRAINT invoice_lines_unit_check CHECK (unit IN ('tonne', 'kg', 'other'));
