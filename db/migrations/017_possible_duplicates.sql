-- An entry that looked like one already there (same car, nearly the same amount, close in time) and
-- was sent anyway: it points at the one it resembled, so the people who approve, authorise and pay
-- it see "Huenda ni marudio". Null for everything else, including all entries made before this.
ALTER TABLE money_requests ADD COLUMN duplicate_of integer REFERENCES money_requests(id) ON DELETE SET NULL;
ALTER TABLE incomes ADD COLUMN duplicate_of integer REFERENCES incomes(id) ON DELETE SET NULL;
