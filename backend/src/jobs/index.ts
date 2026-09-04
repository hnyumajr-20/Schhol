// Importing these starts their BullMQ Workers (each calls `new Worker(...)`
// at module scope), so this file just needs to be imported once at boot.
import "./workers/sendStaffOnboardingEmail";
import "./workers/provisionStudentAccount";
import "./workers/transitionAcademicCalendar";

export { registerRepeatableJobs } from "./scheduler";
