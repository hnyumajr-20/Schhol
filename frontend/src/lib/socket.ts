import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(accessToken: string): Socket {
  if (socket) return socket;
  socket = io(import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000", {
    auth: { token: accessToken },
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
