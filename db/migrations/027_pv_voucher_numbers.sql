-- Every payment voucher says PV-, including those numbered HM- before 026. None had been printed
-- yet (the company confirmed), so they take the same year and digits with the new prefix:
-- HM-2026-032 becomes PV-2026-032. (year, seq) is unique and the number is built from it, so no
-- two vouchers can end up with the same number.
UPDATE payment_vouchers SET number = 'PV-' || substr(number, 4) WHERE number LIKE 'HM-%';
