-- What a standard payment voucher asks for, collected where it is known:
--   * department: chosen by the meneja when they ask for money; a driver's request is always
--     Usafirishaji. Requests already there count as Usafirishaji when they were for a car and
--     Utawala (office) when they weren't. The default keeps a server still running the old code
--     during the deploy able to save.
--   * money_request_items: an optional breakdown (description, quantity, unit price) given with the
--     request; the request's amount is then their sum. Requests without one print a single line.
--   * payment_method, and which supporting documents were attached: given by the mhasibu at Lipa
--     (or by the meneja when typing in history). The free-text issue_note stays as the reference
--     number. Payments made before this have no method and print a dash; nothing is guessed.
ALTER TABLE money_requests ADD COLUMN department text NOT NULL DEFAULT 'usafirishaji'
  CHECK (department IN ('usafirishaji', 'matengenezo', 'utawala', 'mengineyo'));
UPDATE money_requests SET department = 'utawala' WHERE car_id IS NULL;

ALTER TABLE money_requests ADD COLUMN payment_method text CHECK (payment_method IN ('cash', 'bank', 'cheque', 'mobile'));
ALTER TABLE money_requests ADD CONSTRAINT money_requests_method_when_paid CHECK (payment_method IS NULL OR issued_at IS NOT NULL);
ALTER TABLE money_requests ADD COLUMN supporting_documents text[] NOT NULL DEFAULT '{}'
  CHECK (supporting_documents <@ ARRAY['supplier_invoice', 'quotation', 'delivery_note', 'requisition',
                                       'fuel_receipt', 'trip_sheet', 'repair_report', 'other']::text[]);
ALTER TABLE money_requests ADD COLUMN supporting_other text CHECK (length(supporting_other) <= 80);

CREATE TABLE money_request_items (
  request_id  integer NOT NULL REFERENCES money_requests(id) ON DELETE CASCADE,
  position    smallint NOT NULL CHECK (position BETWEEN 1 AND 10),
  description text NOT NULL CHECK (length(description) BETWEEN 2 AND 120),
  quantity    numeric(10, 2) NOT NULL CHECK (quantity > 0),
  unit_price  numeric(12, 2) NOT NULL CHECK (unit_price > 0),
  amount      numeric(12, 2) NOT NULL CHECK (amount > 0),
  PRIMARY KEY (request_id, position)
);

-- Every shilling that went out gets a voucher. History typed in later had none (020 left it out);
-- it now gets numbers after the ones already given in each year, in the order it was paid, and new
-- history gets one as it is typed in.
WITH history AS (
  SELECT id, extract(year FROM issued_at AT TIME ZONE 'Africa/Dar_es_Salaam')::int AS year, issued_at
    FROM money_requests r
   WHERE issued_at IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM payment_vouchers pv WHERE pv.request_id = r.id)
),
numbered AS (
  SELECT h.id, h.year,
         coalesce((SELECT max(seq) FROM payment_vouchers pv WHERE pv.year = h.year), 0)
           + row_number() OVER (PARTITION BY h.year ORDER BY h.issued_at, h.id)::int AS seq
    FROM history h
)
INSERT INTO payment_vouchers (request_id, year, seq, number)
SELECT id, year, seq, 'HM-' || year || '-' || lpad(seq::text, greatest(3, length(seq::text)), '0') FROM numbered;
