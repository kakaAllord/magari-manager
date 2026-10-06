-- Ankara: invoices the meneja makes for customers, one line per trip priced per tonne. They are
-- documents only: they never touch Mapato, so income is still recorded there and nothing is
-- counted twice. Numbers run per year (ANK-2026-001) and are never reused: a mistaken invoice is
-- cancelled, not edited or deleted.
CREATE TABLE invoices (
  id               serial PRIMARY KEY,
  year             smallint NOT NULL,
  seq              integer NOT NULL CHECK (seq > 0),
  number           text NOT NULL UNIQUE,
  customer_name    text NOT NULL CHECK (length(customer_name) BETWEEN 2 AND 120),
  customer_contact text,
  issued_on        date NOT NULL,
  due_on           date CHECK (due_on >= issued_on),
  payment_details  text,
  total            numeric(12, 2) NOT NULL CHECK (total > 0),
  created_by       integer REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  paid_at          timestamptz,
  paid_by          integer REFERENCES users(id) ON DELETE SET NULL,
  cancelled_at     timestamptz,
  cancelled_by     integer REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (year, seq),
  CHECK (paid_at IS NULL OR cancelled_at IS NULL)
);
CREATE INDEX invoices_created_at_idx ON invoices (created_at);

-- A line is a trip: where to, the car (its plate as typed on the invoice, so deleting a car never
-- touches an invoice), the tonnes and the rate. amount is their product.
CREATE TABLE invoice_lines (
  invoice_id     integer NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  position       smallint NOT NULL CHECK (position BETWEEN 1 AND 20),
  description    text NOT NULL CHECK (length(description) BETWEEN 2 AND 160),
  plate          text,
  tonnes         numeric(8, 2) NOT NULL CHECK (tonnes > 0),
  rate_per_tonne integer NOT NULL CHECK (rate_per_tonne > 0),
  amount         numeric(12, 2) NOT NULL CHECK (amount > 0),
  PRIMARY KEY (invoice_id, position)
);
