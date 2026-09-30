-- A mhasibu (accountant) pays out approved requests. Like managers, they sign in with email.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('driver', 'manager', 'director', 'accountant'));

-- Managers can ask for money too, so the request belongs to whoever asked.
ALTER TABLE money_requests RENAME COLUMN driver_id TO requester_id;
ALTER INDEX money_requests_driver_id_idx RENAME TO money_requests_requester_id_idx;

-- An approved request becomes spending once the mhasibu issues the money, with an optional note
-- such as an M-Pesa reference.
ALTER TABLE money_requests ADD COLUMN issued_at timestamptz;
ALTER TABLE money_requests ADD COLUMN issued_by integer REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE money_requests ADD COLUMN issue_note text;
ALTER TABLE money_requests ADD CONSTRAINT money_requests_issued_when_approved
  CHECK (issued_at IS NULL OR status = 'approved');
ALTER TABLE money_requests ADD CONSTRAINT money_requests_issued_by_when
  CHECK (issued_by IS NULL OR issued_at IS NOT NULL);

-- Requests approved before there was a mhasibu were paid when approved; nobody is named as issuer.
UPDATE money_requests SET issued_at = reviewed_at WHERE status = 'approved';

CREATE INDEX money_requests_issued_at_idx ON money_requests (issued_at);
