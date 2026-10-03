-- Real use: the company's director, who adds managers and the mhasibu in the app. Only added if
-- the email is free, so nothing existing changes. The password was handed to the director and
-- should be changed on Akaunti after the first sign-in.
INSERT INTO users (name, email, password_hash, role)
VALUES ('Mkurugenzi', 'director@zuraja.com', '$2b$12$cWiTnDZuN5ejP6Z5N.fgYugsOqWSC55wrx0lSaN.aw3i8fL/nSjSW', 'director')
ON CONFLICT (email) DO NOTHING;
