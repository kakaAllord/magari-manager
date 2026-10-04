-- A factory manager (meneja wa kiwanda) authorises what the vehicle manager approved before the
-- mhasibu pays it. The director adds factory managers and the mhasibu; a factory manager adds the
-- vehicle managers. Like other staff, they sign in with email.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('driver', 'manager', 'director', 'accountant', 'factory_manager'));

-- The factory manager's decision on an approved request. Authorised keeps status 'approved' and
-- the request goes on to the mhasibu; declined turns it 'rejected', with these columns naming who
-- declined it at this step (a vehicle manager's rejection leaves them empty).
ALTER TABLE money_requests ADD COLUMN factory_reviewed_at timestamptz;
ALTER TABLE money_requests ADD COLUMN factory_reviewed_by integer REFERENCES users(id) ON DELETE SET NULL;

-- Everything approved before this step existed counts as authorised when it was approved, with
-- nobody named: paid requests, and approved ones already waiting for the mhasibu, who can pay them
-- as before. Only approvals from now on wait for the factory manager.
UPDATE money_requests SET factory_reviewed_at = coalesce(reviewed_at, issued_at, created_at) WHERE status = 'approved';

ALTER TABLE money_requests ADD CONSTRAINT money_requests_factory_reviewed_after_approval
  CHECK (factory_reviewed_at IS NULL OR status <> 'pending');
ALTER TABLE money_requests ADD CONSTRAINT money_requests_factory_reviewed_by_when
  CHECK (factory_reviewed_by IS NULL OR factory_reviewed_at IS NOT NULL);
-- The mhasibu pays only what the factory manager authorised.
ALTER TABLE money_requests ADD CONSTRAINT money_requests_issued_when_authorised
  CHECK (issued_at IS NULL OR factory_reviewed_at IS NOT NULL);

CREATE INDEX money_requests_awaiting_factory_idx ON money_requests (reviewed_at)
  WHERE status = 'approved' AND factory_reviewed_at IS NULL;

-- Real use: the company's factory manager, added only if the email is free. The repo is public, so
-- no password (or hash of one) is kept here: '!' is not a bcrypt hash and matches no password, so
-- nobody can sign in until one is set, with `npm run create-factory-manager` or by the director on
-- Wafanyakazi (⋯ → Badilisha nenosiri). Migration 014 needs the account to exist already.
INSERT INTO users (name, email, password_hash, role)
VALUES ('Meneja wa Kiwanda', 'factory.manager@zuraja.com', '!', 'factory_manager')
ON CONFLICT (email) DO NOTHING;
