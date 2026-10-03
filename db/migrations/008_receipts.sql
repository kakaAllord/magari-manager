-- Once the mhasibu pays, the payment waits for its receipt: a photo the mhasibu adds after the
-- purchase. Only payments made from now on wait; older ones were paid before receipts were asked for.
ALTER TABLE money_requests ADD COLUMN receipt_due boolean NOT NULL DEFAULT false;
ALTER TABLE money_requests ADD CONSTRAINT money_requests_receipt_due_when_issued
  CHECK (NOT receipt_due OR issued_at IS NOT NULL);

-- One receipt per payment, stored in the database so there is no file host to set up.
-- Photos are shrunk in the browser first, so each is a few hundred KB.
CREATE TABLE receipts (
  request_id   integer PRIMARY KEY REFERENCES money_requests(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/svg+xml')),
  data         bytea NOT NULL,
  note         text,
  uploaded_by  integer REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX money_requests_receipt_due_idx ON money_requests (issued_at) WHERE receipt_due;
