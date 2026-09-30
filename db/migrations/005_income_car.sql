-- Income is recorded against the car that earned it. `source` keeps the plate as it was at the
-- time, so older entries (typed by hand) and the feed still read the same.
ALTER TABLE incomes ADD COLUMN car_id integer REFERENCES cars(id) ON DELETE SET NULL;
CREATE INDEX incomes_car_id_idx ON incomes (car_id);
