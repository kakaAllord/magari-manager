-- Fuel tracking. Every reading is the odometer and the fuel gauge (in eighths of a tank) at one
-- moment. Between two readings of a car, fuel used = fuel at the first + fuel paid for in between
-- - fuel at the second, and the km driven are the difference in odometer.

-- Each car's tank size turns the gauge into litres; it stays empty until the manager sets it.
ALTER TABLE cars ADD COLUMN fuel_type text NOT NULL DEFAULT 'petrol' CHECK (fuel_type IN ('petrol', 'diesel'));
ALTER TABLE cars ADD COLUMN tank_litres integer CHECK (tank_litres BETWEEN 10 AND 1000);

-- Today's price per litre, set by a manager. Each fuel request keeps the price of its day.
CREATE TABLE fuel_prices (
  fuel_type       text PRIMARY KEY CHECK (fuel_type IN ('petrol', 'diesel')),
  price_per_litre integer NOT NULL CHECK (price_per_litre > 0),
  updated_by      integer REFERENCES users(id) ON DELETE SET NULL,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- A request is either for fuel or for anything else. Older requests stay "other", even when the
-- reason says Mafuta, because they have no reading to measure from.
ALTER TABLE money_requests ADD COLUMN kind text NOT NULL DEFAULT 'other' CHECK (kind IN ('fuel', 'other'));
ALTER TABLE money_requests ADD COLUMN fuel_price integer CHECK (fuel_price > 0);
ALTER TABLE money_requests ADD CONSTRAINT money_requests_fuel_price_for_fuel
  CHECK (kind = 'fuel' OR fuel_price IS NULL);

-- `driver_id` is who drives the car from this reading on, so the stretch up to the next reading
-- is theirs. A driver's reading belongs to their fuel request; a manager's has no request.
CREATE TABLE fuel_readings (
  id            serial PRIMARY KEY,
  car_id        integer NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  driver_id     integer REFERENCES users(id) ON DELETE SET NULL,
  recorded_by   integer REFERENCES users(id) ON DELETE SET NULL,
  request_id    integer UNIQUE REFERENCES money_requests(id) ON DELETE CASCADE,
  odometer_km   integer NOT NULL CHECK (odometer_km BETWEEN 0 AND 9999999),
  gauge_eighths smallint NOT NULL CHECK (gauge_eighths BETWEEN 0 AND 8),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fuel_readings_car_id_idx ON fuel_readings (car_id, created_at);
CREATE INDEX money_requests_fuel_idx ON money_requests (car_id, issued_at) WHERE kind = 'fuel';
