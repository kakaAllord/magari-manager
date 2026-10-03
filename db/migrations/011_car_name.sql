-- A car only needs its plate. "Aina" is one optional free-text field ("Toyota IST") in place of
-- make and model. The fuel type can wait like the tank size, but no fuel can be asked for until
-- the car has both and a starting reading.
ALTER TABLE cars ADD COLUMN name text;
UPDATE cars SET name = nullif(trim(concat_ws(' ', make, model)), '');

-- The app no longer reads make and model. They stay, without NOT NULL, so the deploy still
-- running while this one builds keeps working; a later migration can drop them.
ALTER TABLE cars ALTER COLUMN make DROP NOT NULL, ALTER COLUMN model DROP NOT NULL;
ALTER TABLE cars ALTER COLUMN fuel_type DROP NOT NULL, ALTER COLUMN fuel_type DROP DEFAULT;
