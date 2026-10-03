-- Make and model were folded into cars.name (Aina) in 011 and nothing reads them now.
ALTER TABLE cars DROP COLUMN make, DROP COLUMN model;

-- A mistyped car can be deleted, but only while nothing was booked to it. Deleting used to turn its
-- requests and income into "no car", which would let spending be hidden by removing a car. The
-- database now refuses that outright; its readings still go with it.
ALTER TABLE money_requests DROP CONSTRAINT money_requests_car_id_fkey,
  ADD CONSTRAINT money_requests_car_id_fkey FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE RESTRICT;
ALTER TABLE incomes DROP CONSTRAINT incomes_car_id_fkey,
  ADD CONSTRAINT incomes_car_id_fkey FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE RESTRICT;
