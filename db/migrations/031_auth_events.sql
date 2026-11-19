-- Sign-ins, failed sign-ins and sign-outs, for the log in the hidden dev console. Everything else in
-- that log is read from the tables that already hold it; this is the one thing nothing recorded.
-- A new table only: no existing row or column changes. Nobody but the dev account ever sees it.
CREATE TABLE IF NOT EXISTS auth_events (
  id         bigserial PRIMARY KEY,
  kind       text NOT NULL CHECK (kind IN ('sign_in', 'sign_in_failed', 'sign_out')),
  user_id    integer REFERENCES users(id) ON DELETE SET NULL,
  -- What was typed in the plate-or-email box, kept for failed attempts only (never the password).
  login      text,
  ip         text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_events_created_at_idx ON auth_events (created_at DESC);
