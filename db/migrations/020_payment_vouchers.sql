-- Hati ya malipo: every payment the mhasibu makes gets a payment voucher, printed to be signed by
-- whoever received the money and filed. Its number is given when the money is paid and runs per
-- year of payment (HM-2026-001); numbers are never reused. Everything else on the voucher is read
-- from the request itself, so only the number is kept here.
CREATE TABLE payment_vouchers (
  request_id integer PRIMARY KEY REFERENCES money_requests(id) ON DELETE CASCADE,
  year       smallint NOT NULL,
  seq        integer NOT NULL CHECK (seq > 0),
  number     text NOT NULL UNIQUE,
  UNIQUE (year, seq)
);

-- Payments already made get their numbers in the order they were paid. History typed in later was
-- paid outside the app, before it, so it gets none.
INSERT INTO payment_vouchers (request_id, year, seq, number)
SELECT id, year, seq, 'HM-' || year || '-' || lpad(seq::text, greatest(3, length(seq::text)), '0')
  FROM (SELECT id, year, row_number() OVER (PARTITION BY year ORDER BY issued_at, id)::int AS seq
          FROM (SELECT id, issued_at, extract(year FROM issued_at AT TIME ZONE 'Africa/Dar_es_Salaam')::int AS year
                  FROM money_requests
                 WHERE issued_at IS NOT NULL AND backfilled_at IS NULL) paid) numbered;
