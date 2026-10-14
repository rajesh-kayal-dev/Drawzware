import type { Project, DrawzDocument, LegacyAppData } from '../../electron/types/document';
import { DRAWZ_FILE_TYPE, CURRENT_DOCUMENT_SCHEMA_VERSION } from '../../electron/types/document';

export const sampleArchitectureProject: Project = {
  id: 'arch-sample-001',
  name: 'Global E-Commerce Microservices',
  description: 'Multi-region distributed system design with edge caching and event streaming',
  createdAt: '2026-01-15T08:30:00.000Z',
  updatedAt: '2026-03-20T14:45:00.000Z',
  viewport: { x: 120, y: -45, zoom: 0.85 },
  diagramType: 'architecture',
  nodes: [
    {
      id: 'node-edge-gateway',
      type: 'systemNode',
      position: { x: 100, y: 150 },
      data: {
        title: 'API Gateway',
        technology: 'Kong / Envoy',
        description: 'Rate limiting and JWT authentication',
      },
    },
    {
      id: 'node-order-service',
      type: 'systemNode',
      position: { x: 400, y: 150 },
      data: {
        title: 'Order Service',
        technology: 'Go / gRPC',
        description: 'Order orchestration and saga management',
      },
    },
  ],
  edges: [
    {
      id: 'edge-gateway-order',
      source: 'node-edge-gateway',
      target: 'node-order-service',
      label: 'gRPC / TLS',
      animated: true,
    },
  ],
  diagramData: {
    architecture: {
      nodes: [
        { id: 'node-edge-gateway', position: { x: 100, y: 150 } },
        { id: 'node-order-service', position: { x: 400, y: 150 } },
      ],
      edges: [{ id: 'edge-gateway-order', source: 'node-edge-gateway', target: 'node-order-service' }],
    },
    sequence: {
      nodes: [
        { id: 'seq-client', position: { x: 50, y: 50 } },
        { id: 'seq-service', position: { x: 250, y: 50 } },
      ],
      edges: [{ id: 'seq-msg-1', source: 'seq-client', target: 'seq-service' }],
    },
    er: {
      nodes: [{ id: 'er-table-orders', position: { x: 100, y: 100 } }],
      edges: [],
    },
  },
};

export const sampleCanonicalDocument: DrawzDocument = {
  fileType: DRAWZ_FILE_TYPE,
  schemaVersion: CURRENT_DOCUMENT_SCHEMA_VERSION,
  appVersion: '0.1.0',
  exportedAt: '2026-03-20T14:45:00.000Z',
  project: sampleArchitectureProject,
};

export const sampleLegacyBackupBundle: LegacyAppData = {
  version: 1,
  lastOpenedProjectId: 'arch-sample-001',
  projects: [
    sampleArchitectureProject,
    {
      id: 'legacy-er-002',
      name: 'Auth DB Entity Diagram',
      description: 'PostgreSQL schema models',
      createdAt: '2026-02-10T10:00:00.000Z',
      updatedAt: '2026-02-10T11:30:00.000Z',
      viewport: { x: 0, y: 0, zoom: 1 },
      diagramType: 'er',
      nodes: [],
      edges: [],
      diagramData: {},
    },
  ],
};
