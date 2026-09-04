import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/errorHandler";

import { authRouter } from "./modules/auth/auth.router";
import { staffRouter } from "./modules/staff/staff.router";
import { usersRouter } from "./modules/users/users.router";
import { academicYearsRouter } from "./modules/academicCalendar/academicCalendar.router";
import { classesRouter, subjectsRouter } from "./modules/classes/classes.router";
import { timetableSlotsRouter, timetableEntriesRouter } from "./modules/timetable/timetable.router";
import { studentsRouter, parentsRouter } from "./modules/students/students.router";
import { devicesRouter } from "./modules/devices/devices.router";
import { attendanceRouter } from "./modules/attendance/attendance.router";
import { dashboardRouter } from "./modules/dashboard/dashboard.router";
import { meRouter } from "./modules/me/me.router";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));
  app.use("/files", express.static(env.STORAGE_DIR));

  const v1 = express.Router();
  v1.use("/auth", authRouter);
  v1.use("/staff", staffRouter);
  v1.use("/users", usersRouter);
  v1.use("/academic-years", academicYearsRouter);
  v1.use("/classes", classesRouter);
  v1.use("/subjects", subjectsRouter);
  v1.use("/timetable-slots", timetableSlotsRouter);
  v1.use("/timetable-entries", timetableEntriesRouter);
  v1.use("/students", studentsRouter);
  v1.use("/parents", parentsRouter);
  v1.use("/devices", devicesRouter);
  v1.use("/attendance", attendanceRouter);
  v1.use("/dashboard", dashboardRouter);
  v1.use("/me", meRouter);

  app.use("/api/v1", v1);
  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use(errorHandler);

  return app;
}
