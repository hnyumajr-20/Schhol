import { createServer } from "node:http";
import { createApp } from "./app";
import { initSocket } from "./realtime/socket";
import { registerRepeatableJobs } from "./jobs";
import { env } from "./config/env";
import { logger } from "./lib/logger";

const app = createApp();
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(env.PORT, async () => {
  logger.info(`API listening on http://localhost:${env.PORT}`);
  await registerRepeatableJobs();
});
