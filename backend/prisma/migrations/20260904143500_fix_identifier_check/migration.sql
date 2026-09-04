-- Parents are legitimately created with only a phone number (no email/id_number),
-- and auth.service.ts's login() already treats phone as a valid identifier
-- alongside email and id_number. The original constraint didn't account for
-- phone-only users; broaden it to match the actual identifier model.
ALTER TABLE "users" DROP CONSTRAINT "users_identifier_present";
ALTER TABLE "users" ADD CONSTRAINT "users_identifier_present" CHECK (email IS NOT NULL OR id_number IS NOT NULL OR phone IS NOT NULL);
