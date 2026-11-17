-- Departments are gone from requests and payment vouchers (the company asked to drop the idea).
-- The app stopped reading and writing money_requests.department in the deploy before this one, so
-- no server still running during this deploy touches it. Its CHECK goes with it.
ALTER TABLE money_requests DROP COLUMN department;
