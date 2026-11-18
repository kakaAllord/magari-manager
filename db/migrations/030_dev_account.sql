-- A hidden developer account for the system owner: it can view the app as any user to debug with
-- real data. Impersonation is silent by design (no banner, log or notification; the target's own
-- sessions are untouched), so nothing here records who was viewed.

-- Allow the new role. The constraint was last set in 013.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('driver', 'manager', 'director', 'accountant', 'factory_manager', 'dev'));

-- A dev session may be pinned to another user: getCurrentUser then returns that user everywhere, so
-- the app behaves exactly as them. NULL (the default, and for everyone else) means no impersonation.
-- ON DELETE SET NULL so removing a user quietly ends any impersonation of them.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS impersonating_user_id integer REFERENCES users(id) ON DELETE SET NULL;

-- The real account, added only if the email is free. The repo is public, so no password is kept
-- here: '!' is not a bcrypt hash and matches nothing, so nobody can sign in until one is set with
-- `npm run create-dev`. The account shows in no staff list and no demo box.
INSERT INTO users (name, email, password_hash, role)
VALUES ('Dev', 'dev@zuraja.com', '!', 'dev')
ON CONFLICT (email) DO NOTHING;
