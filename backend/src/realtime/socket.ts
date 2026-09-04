import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { verifyAccessToken } from "../lib/tokens";
import { env } from "../config/env";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Missing token"));
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
    socket.on("join", (room: string) => {
      // Phase 1: any authenticated socket may join a class room to watch
      // live attendance taps. Tighten to ownership checks in a later phase.
      if (typeof room === "string" && room.startsWith("class:")) {
        socket.join(room);
      }
    });
  });

  return io;
}

export function emitAttendanceRecorded(classId: string, record: unknown) {
  io?.to(`class:${classId}`).emit("attendance:recorded", record);
}
