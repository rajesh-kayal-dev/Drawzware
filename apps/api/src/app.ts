import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { createRouter } from './routes';
import { WorkspaceController } from './controllers/workspace.controller';
import { DiagramController } from './controllers/diagram.controller';

export interface AppOptions {
  workspaceController?: WorkspaceController;
  diagramController?: DiagramController;
}

export function createApp(options?: AppOptions): Express {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: config.webOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));

  // API router
  const router = createRouter(options?.workspaceController, options?.diagramController);
  app.use('/api', router);

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
