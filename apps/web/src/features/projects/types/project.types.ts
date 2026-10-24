import { z } from 'zod';

// Project
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number(),
  }).default({ x: 0, y: 0, zoom: 1 }),
  diagramType: z.enum(['architecture', 'sequence', 'er']).optional(),
  diagramData: z.record(z.string(), z.unknown()).optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

// App data (persisted)
export const AppDataSchema = z.object({
  version: z.number().default(1),
  projects: z.array(ProjectSchema).default([]),
  lastOpenedProjectId: z.string().nullable().default(null),
});

export type AppData = z.infer<typeof AppDataSchema>;
