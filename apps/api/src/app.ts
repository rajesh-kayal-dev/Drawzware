import "dotenv/config";
import express, { Express, Request, Response } from "express";
import cors from "cors";
import { isOriginAllowed } from "./config/env.js";
import { requireAuth } from "./middleware/auth.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRoutes } from "./routes/auth.routes.js";
import { workspaceRoutes, acceptInvitationHandler, getInvitationPreviewHandler } from "./routes/workspace.routes.js";
import { diagramRoutes } from "./routes/diagram.routes.js";

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        if (!requestOrigin || isOriginAllowed(requestOrigin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS origin not allowed'));
        }
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "10mb" }));

  // Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "drawzware-api", timestamp: new Date().toISOString() });
  });

  // Current authenticated user info
  app.get("/api/me", requireAuth, (req: Request, res: Response) => {
    res.json({ user: req.user });
  });

  // Invitation preview and accept routes
  app.get("/api/invitations/:invitationId", getInvitationPreviewHandler);
  app.post("/api/invitations/:invitationId/accept", requireAuth, acceptInvitationHandler);


  // Auth routes
  app.use("/api/auth", authRoutes);
  app.use("/api/user", authRoutes);

  // Modular resource routes
  app.use("/api/workspaces", workspaceRoutes);
  app.use("/api", diagramRoutes);

  // 404 Handler
  app.use(notFoundHandler);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
