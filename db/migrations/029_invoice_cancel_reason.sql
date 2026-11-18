-- Cancelling (deleting) an invoice now needs a reason, kept with it and shown wherever it shows as
-- Imefutwa. Invoices cancelled before this have none and show as before; nothing is backfilled.
ALTER TABLE invoices ADD COLUMN cancel_reason text CHECK (length(cancel_reason) <= 300);
