-- Every invoice says INV-, including those numbered ANK- before 17 Nov 2026 (the owner confirmed on
-- 20 Nov). They keep their year and digits, ANK-2026-009 becoming INV-2026-009; (year, seq) is unique
-- and the number is built from it, so no two invoices can share one. Some ANK- invoices went to
-- clients on paper, so the old number stays in `former_number` and the invoice search still finds it.
-- Their trips in Mapato and the payments made when they were marked paid said "Ankara ANK-…"; they now
-- read "Invoice INV-…" like those of newer invoices. Only that exact wording is rewritten, and the
-- old text is 'Ankara ' || former_number, so nothing is lost.
ALTER TABLE invoices ADD COLUMN former_number text;

UPDATE invoices SET former_number = number, number = 'INV-' || substr(number, 5) WHERE number LIKE 'ANK-%';

UPDATE incomes i SET description = 'Invoice ' || inv.number
  FROM invoices inv
 WHERE inv.id = i.invoice_id AND inv.former_number IS NOT NULL AND i.description = 'Ankara ' || inv.former_number;

UPDATE income_payments p SET note = 'Invoice ' || inv.number
  FROM incomes i JOIN invoices inv ON inv.id = i.invoice_id
 WHERE i.id = p.income_id AND inv.former_number IS NOT NULL AND p.note = 'Ankara ' || inv.former_number;
