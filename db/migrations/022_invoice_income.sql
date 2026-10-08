-- An invoice made from now on is income on credit: each trip on it is saved in Mapato on the
-- invoice's date, nothing paid yet, so it shows on Madeni under the client's name. Marking the
-- invoice paid pays off those entries; paying them off on Madeni marks the invoice paid; cancelling
-- the invoice removes them. Invoices made before this stay documents only: the meneja was told to
-- record their income on Mapato by hand, so linking them now could count it twice.
ALTER TABLE incomes ADD COLUMN invoice_id integer REFERENCES invoices(id);
CREATE INDEX incomes_invoice_id_idx ON incomes (invoice_id) WHERE invoice_id IS NOT NULL;
