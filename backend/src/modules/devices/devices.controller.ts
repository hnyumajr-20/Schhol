import type { Request, Response } from "express";
import * as devicesService from "./devices.service";
import * as attendanceService from "../attendance/attendance.service";

export async function listDevicesHandler(_req: Request, res: Response) {
  res.json(await devicesService.listDevices());
}

export async function registerDeviceHandler(req: Request, res: Response) {
  res.status(201).json(await devicesService.registerDevice(req.body, req.user!.id));
}

export async function scanHandler(req: Request, res: Response) {
  await devicesService.markSynced(req.device!.id);
  const record = await attendanceService.handleDeviceScan(
    req.device!.id,
    req.body.rfid_uid,
    new Date(req.body.scanned_at)
  );
  res.status(201).json(record);
}
