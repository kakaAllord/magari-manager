-- Who added each staff member. The director adds factory managers and the mhasibu; a factory
-- manager adds the vehicle managers.
ALTER TABLE users ADD COLUMN added_by integer REFERENCES users(id) ON DELETE SET NULL;

-- Vehicle managers the director added before 013 now belong to the company's factory manager, as
-- if the factory manager had added them. Their accounts, passwords and history don't change.
UPDATE users SET added_by = (SELECT id FROM users WHERE email = 'factory.manager@zuraja.com' AND role = 'factory_manager')
 WHERE role = 'manager' AND added_by IS NULL;

-- The mhasibu (until now only a director could add one) and the factory manager from 013 count as
-- added by the company's director.
UPDATE users SET added_by = (SELECT id FROM users WHERE email = 'director@zuraja.com' AND role = 'director')
 WHERE role IN ('accountant', 'factory_manager') AND added_by IS NULL;
