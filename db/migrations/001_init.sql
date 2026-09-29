-- Users are either drivers or managers.
CREATE TABLE users (
  id            serial PRIMARY KEY,
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role          text NOT NULL CHECK (role IN ('driver', 'manager')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- A car is assigned to at most one driver, and a driver has at most one car.
CREATE TABLE cars (
  id         serial PRIMARY KEY,
  plate      text NOT NULL UNIQUE,
  make       text NOT NULL,
  model      text NOT NULL,
  driver_id  integer UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sessions store a SHA-256 hash of the cookie token, never the token itself.
CREATE TABLE sessions (
  id         text PRIMARY KEY,
  user_id    integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);

CREATE TABLE money_requests (
  id          serial PRIMARY KEY,
  driver_id   integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  car_id      integer REFERENCES cars(id) ON DELETE SET NULL,
  amount      numeric(10, 2) NOT NULL CHECK (amount > 0),
  reason      text NOT NULL,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by integer REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX money_requests_driver_id_idx ON money_requests (driver_id);
CREATE INDEX money_requests_status_idx ON money_requests (status);
