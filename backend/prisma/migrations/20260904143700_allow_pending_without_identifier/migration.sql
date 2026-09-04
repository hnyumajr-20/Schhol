-- Student/parent intake creates a 'pending' placeholder account with no
-- email/phone/id_number yet (assigned at approval time, students.service.ts
-- intake()/students-provisioning job). Pending accounts can never log in
-- (auth.service.ts's login() rejects any status != 'active'), so they don't
-- need an identifier until they're activated — exempt 'pending' from the check.
ALTER TABLE "users" DROP CONSTRAINT "users_identifier_present";
ALTER TABLE "users" ADD CONSTRAINT "users_identifier_present" CHECK (email IS NOT NULL OR id_number IS NOT NULL OR phone IS NOT NULL OR status = 'pending');
