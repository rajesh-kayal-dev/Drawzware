import {
  Server,
  Database,
  Zap,
  MessageSquare,
  Scale,
  Monitor,
  Globe,
  Shield,
  SquareDashed,
  Globe2,
  ShieldCheck,
  Cog,
  CloudLightning,
  Boxes,
  HardDrive,
  Search,
  Radio,
  Clock,
  ScrollText,
  Activity,
  Gauge,
  Network,
  Compass,
  TrendingUp,
  Table,
  Layers,
  Copy,
  MailWarning,
  LineChart,
  Binary,
  Bell,
  Lock,
  KeyRound,
  FileCheck2,
  Key,
  ExternalLink,
  Webhook,
  Cloud,
  MapPin,
  Box,
  Layers3,
  Split,
  Workflow,
  Archive,
  RefreshCw,
  Warehouse,
  Flame,
  Undo2,
  Sliders,
  Flag,
  GitBranch,
  PlaySquare,
  Cpu,
  GitFork,
  GitPullRequest,
  Bot,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { SystemNodeType } from '@/features/canvas/types/canvas.types';

export type NodeCategory =
  | 'Client & Edge'
  | 'Compute'
  | 'Data'
  | 'Async'
  | 'Observability'
  | 'Security & Identity'
  | 'Integrations'
  | 'AI/ML'
  | 'Others';

export const NODE_CATEGORIES: NodeCategory[] = [
  'Client & Edge',
  'Compute',
  'Data',
  'Async',
  'Observability',
  'Security & Identity',
  'Integrations',
  'AI/ML',
  'Others',
];

/** One icon per category, used by the collapsed library rail and toolbar. */
export const CATEGORY_ICONS: Record<NodeCategory, LucideIcon> = {
  'Client & Edge': Monitor,
  Compute: Server,
  Data: Database,
  Async: Radio,
  Observability: Activity,
  'Security & Identity': ShieldCheck,
  Integrations: Webhook,
  'AI/ML': Sparkles,
  Others: Layers,
};

export interface NodeTypeConfig {
  label: string;
  icon: LucideIcon;
  /** Component color (Tailwind 600 shade). Used only for the icon, icon chip tint and minimap. */
  color: string;
  defaultTechStack: string[];
  /** Quick-add suggestions in the node editor's tech stack field. */
  suggestedTech: string[];
  category: NodeCategory;
  /** Optional subcategory used under the Others category */
  subcategory?: string;
}

export const NODE_REGISTRY: Record<SystemNodeType, NodeTypeConfig> = {
  // Client & Edge
  client: {
    label: 'Client',
    icon: Monitor,
    color: '#9333ea', // purple-600
    defaultTechStack: [],
    suggestedTech: ['React', 'Next.js', 'iOS', 'Android'],
    category: 'Client & Edge',
  },
  cdn: {
    label: 'CDN',
    icon: Globe,
    color: '#0d9488', // teal-600
    defaultTechStack: ['CloudFront'],
    suggestedTech: ['CloudFront', 'Cloudflare', 'Fastly'],
    category: 'Client & Edge',
  },
  dns: {
    label: 'DNS',
    icon: Globe2,
    color: '#0284c7', // sky-600
    defaultTechStack: ['Route 53'],
    suggestedTech: ['Route 53', 'Cloudflare DNS'],
    category: 'Client & Edge',
  },
  waf: {
    label: 'WAF',
    icon: ShieldCheck,
    color: '#ea580c', // orange-600
    defaultTechStack: ['AWS WAF'],
    suggestedTech: ['AWS WAF', 'Cloudflare WAF'],
    category: 'Client & Edge',
  },
  'load-balancer': {
    label: 'Load Balancer',
    icon: Scale,
    color: '#4f46e5', // indigo-600
    defaultTechStack: ['Nginx'],
    suggestedTech: ['Nginx', 'HAProxy', 'AWS ALB', 'Envoy'],
    category: 'Client & Edge',
  },
  'api-gateway': {
    label: 'API Gateway',
    icon: Shield,
    color: '#dc2626', // red-600
    defaultTechStack: [],
    suggestedTech: ['Kong', 'AWS API Gateway', 'Apigee'],
    category: 'Client & Edge',
  },
  'rate-limiter': {
    label: 'Rate Limiter',
    icon: Gauge,
    color: '#e11d48', // rose-600
    defaultTechStack: ['Redis Token Bucket'],
    suggestedTech: ['Redis', 'Kong Rate Limiting', 'Envoy', 'Cloudflare'],
    category: 'Client & Edge',
  },
  'reverse-proxy': {
    label: 'Reverse Proxy',
    icon: Network,
    color: '#0284c7', // sky-600
    defaultTechStack: ['Nginx'],
    suggestedTech: ['Nginx', 'Envoy', 'Traefik', 'Caddy'],
    category: 'Client & Edge',
  },

  // Compute
  service: {
    label: 'Service',
    icon: Server,
    color: '#2563eb', // blue-600
    defaultTechStack: [],
    suggestedTech: ['Node.js', 'Go', 'Python', 'Java'],
    category: 'Compute',
  },
  server: {
    label: 'Server',
    icon: Cpu,
    color: '#0284c7', // sky-600
    defaultTechStack: ['Linux VM', 'EC2'],
    suggestedTech: ['AWS EC2', 'GCE', 'DigitalOcean Droplet', 'Bare Metal', 'Ubuntu'],
    category: 'Compute',
  },
  worker: {
    label: 'Worker',
    icon: Cog,
    color: '#475569', // slate-600
    defaultTechStack: [],
    suggestedTech: ['Celery', 'Sidekiq', 'BullMQ'],
    category: 'Compute',
  },
  serverless: {
    label: 'Serverless',
    icon: CloudLightning,
    color: '#7c3aed', // violet-600
    defaultTechStack: ['AWS Lambda'],
    suggestedTech: ['AWS Lambda', 'Cloudflare Workers', 'TypeScript'],
    category: 'Compute',
  },
  'container-cluster': {
    label: 'Container Cluster',
    icon: Boxes,
    color: '#0891b2', // cyan-600
    defaultTechStack: ['Kubernetes'],
    suggestedTech: ['Kubernetes', 'ECS', 'Nomad'],
    category: 'Compute',
  },
  'service-discovery': {
    label: 'Service Discovery / Registry',
    icon: Compass,
    color: '#059669', // emerald-600
    defaultTechStack: ['Consul'],
    suggestedTech: ['Consul', 'Eureka', 'ZooKeeper', 'etcd', 'CoreDNS'],
    category: 'Compute',
  },
  autoscaler: {
    label: 'Autoscaler',
    icon: TrendingUp,
    color: '#2563eb', // blue-600
    defaultTechStack: ['KEDA'],
    suggestedTech: ['KEDA', 'HPA', 'Cluster Autoscaler', 'AWS ASG'],
    category: 'Compute',
  },

  // Data
  database: {
    label: 'Database',
    icon: Database,
    color: '#16a34a', // green-600
    defaultTechStack: ['PostgreSQL'],
    suggestedTech: ['PostgreSQL', 'MySQL', 'MongoDB', 'DynamoDB'],
    category: 'Data',
  },
  'sql-database': {
    label: 'SQL Database',
    icon: Table,
    color: '#15803d', // green-700
    defaultTechStack: ['PostgreSQL'],
    suggestedTech: ['PostgreSQL', 'MySQL', 'Aurora', 'SQLite'],
    category: 'Data',
  },
  'nosql-database': {
    label: 'NoSQL / Document Database',
    icon: Layers,
    color: '#16a34a', // green-600
    defaultTechStack: ['MongoDB'],
    suggestedTech: ['MongoDB', 'DynamoDB', 'Couchbase', 'Cassandra'],
    category: 'Data',
  },
  'read-replica': {
    label: 'Read Replica',
    icon: Copy,
    color: '#059669', // emerald-600
    defaultTechStack: ['PostgreSQL Read Replica'],
    suggestedTech: ['PostgreSQL', 'MySQL Replica', 'Aurora Replica'],
    category: 'Data',
  },
  cache: {
    label: 'Cache',
    icon: Zap,
    color: '#d97706', // amber-600
    defaultTechStack: ['Redis'],
    suggestedTech: ['Redis', 'Memcached', 'Valkey'],
    category: 'Data',
  },
  redis: {
    label: 'Redis',
    icon: Zap,
    color: '#dc2626', // red-600
    defaultTechStack: ['Redis Cluster', 'In-Memory'],
    suggestedTech: ['Redis Sentinel', 'Redis Cluster', 'Redis Pub/Sub', 'Redis Streams'],
    category: 'Data',
  },
  'object-storage': {
    label: 'Object Storage',
    icon: HardDrive,
    color: '#059669', // emerald-600
    defaultTechStack: ['S3'],
    suggestedTech: ['S3', 'GCS', 'R2'],
    category: 'Data',
  },
  'search-index': {
    label: 'Search Index',
    icon: Search,
    color: '#ca8a04', // yellow-600
    defaultTechStack: ['Elasticsearch'],
    suggestedTech: ['Elasticsearch', 'OpenSearch', 'Meilisearch'],
    category: 'Data',
  },

  // Async
  queue: {
    label: 'Message Queue',
    icon: MessageSquare,
    color: '#db2777', // pink-600
    defaultTechStack: ['RabbitMQ'],
    suggestedTech: ['RabbitMQ', 'SQS', 'DLQ'],
    category: 'Async',
  },
  stream: {
    label: 'Stream',
    icon: Radio,
    color: '#e11d48', // rose-600
    defaultTechStack: ['Kafka'],
    suggestedTech: ['Kafka', 'Kinesis', 'Redpanda'],
    category: 'Async',
  },
  'event-bus': {
    label: 'Event Bus / Pub/Sub',
    icon: Radio,
    color: '#9333ea', // purple-600
    defaultTechStack: ['EventBridge'],
    suggestedTech: ['EventBridge', 'Google Pub/Sub', 'Kafka', 'SNS'],
    category: 'Async',
  },
  'dead-letter-queue': {
    label: 'Dead Letter Queue (DLQ)',
    icon: MailWarning,
    color: '#dc2626', // red-600
    defaultTechStack: ['SQS DLQ'],
    suggestedTech: ['SQS DLQ', 'RabbitMQ DLX', 'Kafka DLQ'],
    category: 'Async',
  },
  scheduler: {
    label: 'Scheduler',
    icon: Clock,
    color: '#57534e', // stone-600
    defaultTechStack: [],
    suggestedTech: ['Cron', 'EventBridge', 'Temporal'],
    category: 'Async',
  },

  // Observability
  logging: {
    label: 'Logging',
    icon: ScrollText,
    color: '#65a30d', // lime-600
    defaultTechStack: ['ELK Stack'],
    suggestedTech: ['ELK Stack', 'CloudWatch', 'Loki'],
    category: 'Observability',
  },
  monitoring: {
    label: 'Monitoring',
    icon: Activity,
    color: '#c026d3', // fuchsia-600
    defaultTechStack: ['Prometheus'],
    suggestedTech: ['Prometheus', 'Grafana', 'Datadog'],
    category: 'Observability',
  },
  metrics: {
    label: 'Metrics',
    icon: LineChart,
    color: '#0284c7', // sky-600
    defaultTechStack: ['Prometheus'],
    suggestedTech: ['Prometheus', 'StatsD', 'Datadog', 'VictoriaMetrics'],
    category: 'Observability',
  },
  'distributed-tracing': {
    label: 'Distributed Tracing',
    icon: Binary,
    color: '#7c3aed', // violet-600
    defaultTechStack: ['OpenTelemetry'],
    suggestedTech: ['OpenTelemetry', 'Jaeger', 'Zipkin', 'AWS X-Ray'],
    category: 'Observability',
  },
  alerting: {
    label: 'Alerting',
    icon: Bell,
    color: '#ea580c', // orange-600
    defaultTechStack: ['PagerDuty'],
    suggestedTech: ['PagerDuty', 'Opsgenie', 'Prometheus Alertmanager', 'Slack'],
    category: 'Observability',
  },

  // Security & Identity
  'auth-service': {
    label: 'Authentication Service',
    icon: Lock,
    color: '#4f46e5', // indigo-600
    defaultTechStack: ['NextAuth'],
    suggestedTech: ['Auth0', 'Keycloak', 'Clerk', 'NextAuth', 'Supabase Auth'],
    category: 'Security & Identity',
  },
  'identity-provider': {
    label: 'Identity Provider (OAuth/OIDC)',
    icon: KeyRound,
    color: '#2563eb', // blue-600
    defaultTechStack: ['Okta'],
    suggestedTech: ['Okta', 'Google Identity', 'Azure AD', 'Keycloak', 'Auth0'],
    category: 'Security & Identity',
  },
  'authorization-policy': {
    label: 'Authorization / Policy Engine',
    icon: FileCheck2,
    color: '#059669', // emerald-600
    defaultTechStack: ['OPA (Open Policy Agent)'],
    suggestedTech: ['OPA', 'Ory Keto', 'Casbin', 'AWS Verified Permissions'],
    category: 'Security & Identity',
  },
  'secrets-manager': {
    label: 'Secrets Manager',
    icon: Key,
    color: '#ca8a04', // yellow-600
    defaultTechStack: ['HashiCorp Vault'],
    suggestedTech: ['Vault', 'AWS Secrets Manager', 'Doppler', 'Infisical'],
    category: 'Security & Identity',
  },

  // Integrations
  'external-service': {
    label: 'External Service / Third-Party API',
    icon: ExternalLink,
    color: '#475569', // slate-600
    defaultTechStack: ['Stripe API'],
    suggestedTech: ['Stripe', 'Twilio', 'SendGrid', 'OpenAI', 'Salesforce'],
    category: 'Integrations',
  },
  'webhook-endpoint': {
    label: 'Webhook Endpoint',
    icon: Webhook,
    color: '#0891b2', // cyan-600
    defaultTechStack: ['Svix'],
    suggestedTech: ['Svix', 'Hookdeck', 'Express Webhook', 'Next.js API'],
    category: 'Integrations',
  },

  // Others: Networking
  vpc: {
    label: 'VPC / Network Boundary',
    icon: Cloud,
    color: '#0284c7', // sky-600
    defaultTechStack: ['AWS VPC'],
    suggestedTech: ['AWS VPC', 'GCP VPC', 'Azure VNet'],
    category: 'Others',
    subcategory: 'Networking',
  },
  region: {
    label: 'Region',
    icon: Globe,
    color: '#0d9488', // teal-600
    defaultTechStack: ['us-east-1'],
    suggestedTech: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
    category: 'Others',
    subcategory: 'Networking',
  },
  'availability-zone': {
    label: 'Availability Zone',
    icon: MapPin,
    color: '#2563eb', // blue-600
    defaultTechStack: ['us-east-1a'],
    suggestedTech: ['AZ-a', 'AZ-b', 'AZ-c'],
    category: 'Others',
    subcategory: 'Networking',
  },

  // Others: Kubernetes
  'k8s-pod': {
    label: 'Pod',
    icon: Box,
    color: '#3b82f6', // blue-500
    defaultTechStack: ['Kubernetes Pod'],
    suggestedTech: ['k8s', 'Container'],
    category: 'Others',
    subcategory: 'Kubernetes',
  },
  'k8s-deployment': {
    label: 'Deployment',
    icon: Layers3,
    color: '#2563eb', // blue-600
    defaultTechStack: ['Kubernetes Deployment'],
    suggestedTech: ['k8s', 'ReplicaSet', 'RollingUpdate'],
    category: 'Others',
    subcategory: 'Kubernetes',
  },
  'k8s-service': {
    label: 'Kubernetes Service',
    icon: Split,
    color: '#4f46e5', // indigo-600
    defaultTechStack: ['ClusterIP'],
    suggestedTech: ['ClusterIP', 'NodePort', 'LoadBalancer', 'Headless'],
    category: 'Others',
    subcategory: 'Kubernetes',
  },
  'k8s-ingress': {
    label: 'Ingress Controller',
    icon: Workflow,
    color: '#7c3aed', // violet-600
    defaultTechStack: ['Ingress Nginx'],
    suggestedTech: ['Ingress Nginx', 'Traefik', 'ALB Ingress Controller', 'Istio'],
    category: 'Others',
    subcategory: 'Kubernetes',
  },
  'container-registry': {
    label: 'Container Registry',
    icon: Archive,
    color: '#0891b2', // cyan-600
    defaultTechStack: ['Docker Hub'],
    suggestedTech: ['ECR', 'GCR', 'Docker Hub', 'Quay', 'Harbor'],
    category: 'Others',
    subcategory: 'Kubernetes',
  },

  // Others: Data & Recovery
  'database-shard': {
    label: 'Database Shard',
    icon: Database,
    color: '#16a34a', // green-600
    defaultTechStack: ['Citus Shard'],
    suggestedTech: ['Citus', 'Vitess', 'Mongo Shard', 'PostgreSQL'],
    category: 'Others',
    subcategory: 'Data & Recovery',
  },
  'backup-recovery': {
    label: 'Backup / Disaster Recovery',
    icon: RefreshCw,
    color: '#059669', // emerald-600
    defaultTechStack: ['Automated Snapshots'],
    suggestedTech: ['AWS Backup', 'Velero', 'WAL-G', 'Restic'],
    category: 'Others',
    subcategory: 'Data & Recovery',
  },
  'data-warehouse': {
    label: 'Data Warehouse',
    icon: Warehouse,
    color: '#ca8a04', // yellow-600
    defaultTechStack: ['Snowflake'],
    suggestedTech: ['Snowflake', 'BigQuery', 'Redshift', 'ClickHouse', 'Databricks'],
    category: 'Others',
    subcategory: 'Data & Recovery',
  },

  // Others: Reliability
  'circuit-breaker': {
    label: 'Circuit Breaker',
    icon: Flame,
    color: '#ea580c', // orange-600
    defaultTechStack: ['Resilience4j'],
    suggestedTech: ['Resilience4j', 'Hystrix', 'Envoy Outlier Detection', 'Polly'],
    category: 'Others',
    subcategory: 'Reliability',
  },
  'retry-backoff': {
    label: 'Retry / Backoff',
    icon: Undo2,
    color: '#d97706', // amber-600
    defaultTechStack: ['Exponential Backoff'],
    suggestedTech: ['Jitter', 'Temporal', 'BullMQ Retry'],
    category: 'Others',
    subcategory: 'Reliability',
  },

  // Others: Configuration
  'config-store': {
    label: 'Configuration Store',
    icon: Sliders,
    color: '#475569', // slate-600
    defaultTechStack: ['Consul KV'],
    suggestedTech: ['Consul KV', 'etcd', 'AWS AppConfig', 'Spring Cloud Config'],
    category: 'Others',
    subcategory: 'Configuration',
  },
  'feature-flag': {
    label: 'Feature Flag Service',
    icon: Flag,
    color: '#9333ea', // purple-600
    defaultTechStack: ['LaunchDarkly'],
    suggestedTech: ['LaunchDarkly', 'Unleash', 'Flagsmith', 'PostHog'],
    category: 'Others',
    subcategory: 'Configuration',
  },

  // Others: DevOps
  'cicd-pipeline': {
    label: 'CI/CD Pipeline',
    icon: GitBranch,
    color: '#2563eb', // blue-600
    defaultTechStack: ['GitHub Actions'],
    suggestedTech: ['GitHub Actions', 'GitLab CI', 'ArgoCD', 'Jenkins'],
    category: 'Others',
    subcategory: 'DevOps',
  },
  'build-runner': {
    label: 'Build Runner',
    icon: PlaySquare,
    color: '#475569', // slate-600
    defaultTechStack: ['Self-hosted Runner'],
    suggestedTech: ['GitHub Runner', 'GitLab Runner', 'Buildkite Agent'],
    category: 'Others',
    subcategory: 'DevOps',
  },
  git: {
    label: 'Git',
    icon: GitFork,
    color: '#ea580c', // orange-600
    defaultTechStack: ['Git'],
    suggestedTech: ['Git CLI', 'Git Hooks', 'Git LFS'],
    category: 'Others',
    subcategory: 'DevOps',
  },
  github: {
    label: 'GitHub',
    icon: GitPullRequest,
    color: '#3b82f6', // blue-500
    defaultTechStack: ['GitHub Repo'],
    suggestedTech: ['GitHub Enterprise', 'GitHub Packages', 'GitHub Pages'],
    category: 'Others',
    subcategory: 'DevOps',
  },
  'github-actions': {
    label: 'GitHub Actions',
    icon: PlaySquare,
    color: '#2563eb', // blue-600
    defaultTechStack: ['Workflows (.github/workflows)'],
    suggestedTech: ['Matrix Builds', 'Reusable Workflows', 'Composite Actions'],
    category: 'Others',
    subcategory: 'DevOps',
  },

  // AI/ML
  'llm-model': {
    label: 'LLM / Foundation Model',
    icon: Sparkles,
    color: '#8b5cf6', // purple-500
    defaultTechStack: ['GPT-4o', 'Claude 3.5 Sonnet'],
    suggestedTech: ['OpenAI', 'Anthropic', 'Llama 3', 'Mistral', 'Gemini'],
    category: 'AI/ML',
  },
  'vector-db': {
    label: 'Vector Database',
    icon: Database,
    color: '#06b6d4', // cyan-500
    defaultTechStack: ['Pinecone'],
    suggestedTech: ['Pinecone', 'Milvus', 'Qdrant', 'Chroma', 'pgvector', 'Weaviate'],
    category: 'AI/ML',
  },
  'prompt-template': {
    label: 'Prompt / Template',
    icon: ScrollText,
    color: '#f59e0b', // amber-500
    defaultTechStack: ['LangChain Prompt'],
    suggestedTech: ['LangChain', 'LlamaIndex', 'DSPy', 'Few-Shot'],
    category: 'AI/ML',
  },
  'ai-agent': {
    label: 'AI Agent / Orchestrator',
    icon: Bot,
    color: '#10b981', // emerald-500
    defaultTechStack: ['LangGraph'],
    suggestedTech: ['LangGraph', 'CrewAI', 'AutoGen', 'Semantic Kernel'],
    category: 'AI/ML',
  },
  embedding: {
    label: 'Embedding Model',
    icon: Binary,
    color: '#3b82f6', // blue-500
    defaultTechStack: ['text-embedding-3-small'],
    suggestedTech: ['OpenAI Embeddings', 'Cohere Embed', 'HuggingFace', 'Voyage AI'],
    category: 'AI/ML',
  },
  'model-eval': {
    label: 'Model Evaluation / Guardrails',
    icon: ShieldCheck,
    color: '#ef4444', // red-500
    defaultTechStack: ['NeMo Guardrails'],
    suggestedTech: ['NeMo Guardrails', 'Ragas', 'LangSmith', 'Promptfoo'],
    category: 'AI/ML',
  },

  // Others: Utilities
  group: {
    label: 'Group / Boundary',
    icon: SquareDashed,
    color: '#64748b', // slate-500
    defaultTechStack: [],
    suggestedTech: [],
    category: 'Others',
    subcategory: 'Utilities',
  },
};

/** Group node types by category, in category order */
export function getNodesByCategory(): { category: NodeCategory; types: { type: SystemNodeType; config: NodeTypeConfig }[] }[] {
  return NODE_CATEGORIES.map((category) => ({
    category,
    types: (Object.entries(NODE_REGISTRY) as [SystemNodeType, NodeTypeConfig][])
      .filter(([, config]) => config.category === category)
      .map(([type, config]) => ({ type, config })),
  })).filter((group) => group.types.length > 0);
}
