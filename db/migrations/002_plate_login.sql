-- Drivers sign in with their car's plate and a password the manager sets,
-- so only managers need an email.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_manager_has_email CHECK (role <> 'manager' OR email IS NOT NULL);

-- Plates are stored without spaces or dashes, so "T 103 ABE" and "T103ABE" match.
UPDATE cars SET plate = upper(regexp_replace(plate, '[^A-Za-z0-9]', '', 'g'));
ALTER TABLE cars ADD CONSTRAINT cars_plate_normalized CHECK (plate ~ '^[A-Z0-9]+$');
