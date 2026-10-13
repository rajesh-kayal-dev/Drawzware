import {
  CheckSquare,
  Cpu,
  Database,
  Eye,
  FileCode,
  Gauge,
  Layers,
  Scale,
  Search,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import type { StepId } from '@/types';

export interface SystemDesignStepConfig {
  id: StepId;
  stepNumber: number;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  defaultContent: string;
}

export const SYSTEM_DESIGN_STEPS: readonly SystemDesignStepConfig[] = [
  {
    id: 'requirements',
    stepNumber: 1,
    title: 'Requirements',
    subtitle: 'Scope, core features & system constraints',
    icon: CheckSquare,
    defaultContent: `### Functional Requirements
- What are the core features?
- Who are the users?
- What is in scope?

### Non-Functional Requirements
- Expected traffic and scale
- Latency requirements (e.g. p99 < 100ms)
- Availability requirements (e.g. 99.99%)
- Consistency and durability expectations

### Assumptions & Scope
- Important assumptions
- Explicitly excluded features`,
  },
  {
    id: 'capacity-estimation',
    stepNumber: 2,
    title: 'Capacity Estimation',
    subtitle: 'Traffic, memory, storage & bandwidth scale',
    icon: Gauge,
    defaultContent: `### Traffic Estimates
- Daily Active Users (DAU): 
- Requests Per Second (RPS): 
- Peak Traffic Multiplier: 

### Storage & Memory
- Read / Write Ratio: 
- Storage Growth (per day / year): 
- Cache Memory Needed (80/20 rule): 

### Network & Bandwidth
- Ingress Bandwidth: 
- Egress Bandwidth: `,
  },
  {
    id: 'api-design',
    stepNumber: 3,
    title: 'API Design',
    subtitle: 'Protocols, endpoints & payload schemas',
    icon: FileCode,
    defaultContent: `### Endpoints
- POST /api/v1/resource
  - Request: { ... }
  - Response: { id, status: 201 }
- GET /api/v1/resource/:id
  - Response: { data, metadata }

### Protocol & Security
- Protocol: REST / gRPC / GraphQL
- Authentication: Bearer JWT / OAuth2 / API Key
- Rate Limiting: 100 req/min per IP

### Error Handling & Pagination
- Errors: 400 Bad Request, 404 Not Found, 429 Too Many Requests
- Pagination: Cursor-based (?cursor=xyz&limit=20)`,
  },
  {
    id: 'data-model',
    stepNumber: 4,
    title: 'Data Model',
    subtitle: 'Entities, relational/NoSQL schemas & indexing',
    icon: Database,
    defaultContent: `### Core Entities
- User (id, email, created_at)
- Resource (id, user_id, title, payload, status)

### Database Technology
- Primary Store: Relational (PostgreSQL) vs NoSQL (DynamoDB / Cassandra)
- Justification: Strong consistency vs horizontal write scale

### Indexes & Query Patterns
- Primary Key: id (UUID / ULID)
- Secondary Indexes: user_id, status + created_at
- Query 1: Fetch recent resources by user_id
- Query 2: Lookup single resource by id`,
  },
  {
    id: 'high-level-design',
    stepNumber: 5,
    title: 'High-Level Design',
    subtitle: 'Core components & end-to-end request flow',
    icon: Layers,
    defaultContent: `### Component Breakdown
1. Client & Entry Point (DNS, CDN, API Gateway)
2. Application Services (Stateless Service Cluster)
3. Data Stores (Primary + Read Replicas)
4. Cache Layer (Redis cluster)
5. Async Messaging (Kafka / RabbitMQ)
6. Background Workers & Consumers

### Main Request Flow
- Client -> CDN -> API Gateway -> Service -> Cache -> Database`,
  },
  {
    id: 'deep-dive',
    stepNumber: 6,
    title: 'Deep Dive',
    subtitle: 'Bottlenecks, critical paths & challenging components',
    icon: Search,
    defaultContent: `### Critical Component
- Most challenging part of the architecture

### Alternative Solutions
- Approach A vs Approach B

### Failure Modes & Bottlenecks
- Single points of failure
- Database connection pool exhaustion
- Cache stampede & cold cache mitigation

### Chosen Approach & Justification
- Rationale behind final architecture decisions`,
  },
  {
    id: 'scalability-reliability',
    stepNumber: 7,
    title: 'Scalability & Reliability',
    subtitle: 'Scaling strategies, replication & failover',
    icon: Cpu,
    defaultContent: `### Scaling Strategy
- Horizontal scaling with auto-scaling groups
- Database partitioning / sharding strategy (Shard key: user_id)
- Read replication for read-heavy workloads

### High Availability & Fault Tolerance
- Multi-AZ / Multi-Region deployment
- Circuit breakers & retry with exponential backoff
- Graceful degradation during partial outages
- Disaster recovery & RTO / RPO goals`,
  },
  {
    id: 'trade-offs',
    stepNumber: 8,
    title: 'Trade-offs',
    subtitle: 'CAP theorem, consistency vs latency choices',
    icon: Scale,
    defaultContent: `### Key Decisions
- Strong Consistency vs Eventual Consistency
- SQL vs NoSQL
- Synchronous RPC vs Asynchronous Event-Driven

### Pros & Cons Analysis
- Decision: 
  - Advantages: 
  - Disadvantages: 
  - Why it fits our specific constraints: `,
  },
  {
    id: 'security',
    stepNumber: 9,
    title: 'Security',
    subtitle: 'Auth, encryption, network isolation & compliance',
    icon: Shield,
    defaultContent: `### Authentication & Authorization
- Identity Provider, OAuth2/OIDC, Role-Based Access Control (RBAC)

### Data Protection
- Encryption in transit (TLS 1.3)
- Encryption at rest (AES-256 with KMS)
- Sensitive data tokenization (PII, tokens)

### Network & Application Security
- WAF (DDoS mitigation, SQLi / XSS protection)
- VPC private subnets & security groups
- Input sanitization & strict request validation`,
  },
  {
    id: 'monitoring-observability',
    stepNumber: 10,
    title: 'Monitoring & Observability',
    subtitle: 'Metrics, logging, distributed tracing & SLOs',
    icon: Eye,
    defaultContent: `### Golden Signals & Metrics
- Latency (p50, p95, p99)
- Traffic (Requests per second)
- Errors (4xx, 5xx rate)
- Saturation (CPU, Memory, Disk IO, Connection Pools)

### Logging & Distributed Tracing
- Centralized structured JSON logging (OpenSearch / Loki)
- Distributed request tracing (OpenTelemetry / Jaeger)

### Alerting & SLOs
- Critical alert thresholds & on-call escalation
- Service Level Objective: 99.9% requests < 200ms`,
  },
] as const;

export function getStepConfig(id: string): SystemDesignStepConfig | undefined {
  return SYSTEM_DESIGN_STEPS.find((s) => s.id === id);
}

export interface StepFormattingPreferences {
  fontSize?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
}

const STEP_FORMATTING_KEY = 'system-design-step-formatting';

export function getStepFormatting(stepId: string): StepFormattingPreferences | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(STEP_FORMATTING_KEY);
    if (!raw) return undefined;
    const all = JSON.parse(raw);
    return all[stepId];
  } catch {
    return undefined;
  }
}

export function saveStepFormatting(stepId: string, formatting: StepFormattingPreferences) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STEP_FORMATTING_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[stepId] = { ...(all[stepId] ?? {}), ...formatting };
    localStorage.setItem(STEP_FORMATTING_KEY, JSON.stringify(all));
  } catch {}
}
