import "dotenv/config";
import http from "http";
import { app } from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { validateEnvironment } from "./config/env.js";
import { attachCollaborationServer, CollabServer } from "./websocket/collab.server.js";

const PORT = process.env.PORT || 3000;

export { validateEnvironment };

export interface ServerInstance {
  httpServer: http.Server;
  collabServer: CollabServer;
}

export function createServerInstance(): ServerInstance {
  const httpServer = http.createServer(app);
  const collabServer = attachCollaborationServer(httpServer);
  return { httpServer, collabServer };
}

export async function gracefulShutdown(
  serverInstance: ServerInstance,
  signal = "SIGTERM"
): Promise<void> {
  console.log(`[Server] Received ${signal}, initiating graceful shutdown...`);
  try {
    // 1. Flush all in-memory CRDT dirty sessions and close WebSocket connections
    await serverInstance.collabServer.close();

    // 2. Close HTTP listener and existing idle/active connections
    serverInstance.httpServer.closeAllConnections?.();
    await new Promise<void>((resolve) => {
      serverInstance.httpServer.close(() => resolve());
    });

    // 3. Disconnect MongoDB cleanly
    await disconnectDB();
    console.log("[Server] Graceful shutdown completed successfully.");
  } catch (err) {
    console.error("[Server] Error during graceful shutdown:", err);
  }
}

async function startServer() {
  validateEnvironment();
  await connectDB();

  const serverInstance = createServerInstance();
  const { httpServer } = serverInstance;

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  const onShutdownSignal = (sig: string) => {
    void gracefulShutdown(serverInstance, sig).then(() => {
      process.exit(0);
    });
  };

  process.once("SIGTERM", () => onShutdownSignal("SIGTERM"));
  process.once("SIGINT", () => onShutdownSignal("SIGINT"));
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}

