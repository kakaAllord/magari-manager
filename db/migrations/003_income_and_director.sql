-- Directors oversee the business: they add managers and watch what is going on.
-- Like managers, they sign in with email.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('driver', 'manager', 'director'));
ALTER TABLE users DROP CONSTRAINT users_manager_has_email;
ALTER TABLE users ADD CONSTRAINT users_email_login_has_email CHECK (role = 'driver' OR email IS NOT NULL);

-- Money coming in, recorded by a manager: where it came from, how much, and an optional note.
CREATE TABLE incomes (
  id          serial PRIMARY KEY,
  source      text NOT NULL,
  amount      numeric(10, 2) NOT NULL CHECK (amount > 0),
  description text,
  recorded_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX incomes_created_at_idx ON incomes (created_at);
