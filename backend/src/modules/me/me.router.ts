import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../lib/asyncHandler";
import { myTimetableHandler } from "../timetable/timetable.controller";
import { myAttendanceHandler } from "../attendance/attendance.controller";

export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.get("/timetable", asyncHandler(myTimetableHandler));
meRouter.get("/attendance", asyncHandler(myAttendanceHandler));
