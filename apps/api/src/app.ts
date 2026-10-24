import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { requireAuth } from './middleware/auth';
import { workspaceRoutes, acceptInvitationHandler } from './routes/workspace.routes';
import { diagramRoutes } from './routes/diagram.routes';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: config.webOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'drawzware-api', timestamp: new Date().toISOString() });
  });

  // Current authenticated user info
  app.get('/api/me', requireAuth, (req: Request, res: Response) => {
    res.json({ user: req.user });
  });

  // Accept Invitation route
  app.post('/api/invitations/:invitationId/accept', requireAuth, acceptInvitationHandler);

  // Modular resource routes
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api', diagramRoutes);

  // 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Requested API endpoint not found.' });
  });

  // Global Error Handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[API Error]:', err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected internal server error occurred.',
      details: err instanceof Error ? err.message : undefined,
    });
  });

  return app;
}
