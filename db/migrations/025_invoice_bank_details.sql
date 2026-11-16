-- Invoices print the bank to pay into as its own block, as on Zuraja's paper invoices: the bank,
-- the account number and name, the SWIFT code and what the payment is for. Each invoice keeps its
-- own copy (the form starts from the last invoice's), so changing banks later never rewrites an
-- invoice already sent. They live in the database, not the code, because the repo is public.
-- Invoices made before this keep their free-text payment_details and show them as before; nothing
-- is copied or rewritten. New invoices also need a due date, but old ones without one stay valid.
ALTER TABLE invoices ADD COLUMN bank_name text CHECK (length(bank_name) <= 80);
ALTER TABLE invoices ADD COLUMN bank_account_number text CHECK (length(bank_account_number) <= 40);
ALTER TABLE invoices ADD COLUMN bank_account_name text CHECK (length(bank_account_name) <= 120);
ALTER TABLE invoices ADD COLUMN bank_swift text CHECK (length(bank_swift) <= 20);
ALTER TABLE invoices ADD COLUMN payment_purpose text CHECK (length(payment_purpose) <= 160);
