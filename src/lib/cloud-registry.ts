import type { LucideIcon } from 'lucide-react';
import {
  Server,
  Cloud,
  Database,
  Globe,
  Radio,
  ShieldCheck,
  Activity,
  Bot,
  Layers,
  Box,
  Flame,
  KeyRound,
  FileCheck2,
  HardDrive,
  Cpu,
  Table,
  LineChart,
  Split,
  Workflow,
  Sparkles,
} from 'lucide-react';
import type { SystemNodeType } from '@/types';

export interface CloudServiceItem {
  id: string;
  name: string;
  provider: 'AWS' | 'Google Cloud' | 'Azure';
  category: string;
  genericType: SystemNodeType;
  description: string;
  icon: LucideIcon;
  color: string;
  defaultTechStack: string[];
}

export const CLOUD_SERVICES: CloudServiceItem[] = [
  // ──────────────────────────── AWS ────────────────────────────
  // Compute & Containers
  {
    id: 'aws-ec2',
    name: 'AWS EC2',
    provider: 'AWS',
    category: 'Compute & Containers',
    genericType: 'server',
    description: 'Amazon Elastic Compute Cloud virtual servers',
    icon: Cpu,
    color: '#f97316', // AWS orange
    defaultTechStack: ['AWS EC2', 'Linux'],
  },
  {
    id: 'aws-lambda',
    name: 'AWS Lambda',
    provider: 'AWS',
    category: 'Compute & Containers',
    genericType: 'serverless',
    description: 'Serverless event-driven compute engine',
    icon: Flame,
    color: '#f97316',
    defaultTechStack: ['AWS Lambda', 'Node.js/Python'],
  },
  {
    id: 'aws-ecs',
    name: 'AWS ECS / Fargate',
    provider: 'AWS',
    category: 'Compute & Containers',
    genericType: 'container-cluster',
    description: 'Elastic Container Service and serverless containers',
    icon: Box,
    color: '#f97316',
    defaultTechStack: ['AWS ECS', 'Docker'],
  },
  // Storage
  {
    id: 'aws-s3',
    name: 'AWS S3',
    provider: 'AWS',
    category: 'Storage',
    genericType: 'object-storage',
    description: 'Simple Storage Service scalable cloud object storage',
    icon: HardDrive,
    color: '#16a34a', // green
    defaultTechStack: ['Amazon S3'],
  },
  // Databases
  {
    id: 'aws-rds',
    name: 'AWS RDS',
    provider: 'AWS',
    category: 'Databases',
    genericType: 'sql-database',
    description: 'Managed Relational Database Service (Postgres, MySQL, Aurora)',
    icon: Table,
    color: '#2563eb', // blue
    defaultTechStack: ['AWS RDS', 'PostgreSQL'],
  },
  {
    id: 'aws-dynamodb',
    name: 'AWS DynamoDB',
    provider: 'AWS',
    category: 'Databases',
    genericType: 'nosql-database',
    description: 'Serverless key-value and document NoSQL database',
    icon: Database,
    color: '#2563eb',
    defaultTechStack: ['Amazon DynamoDB'],
  },
  // Networking
  {
    id: 'aws-cloudfront',
    name: 'AWS CloudFront',
    provider: 'AWS',
    category: 'Networking',
    genericType: 'cdn',
    description: 'Global low-latency content delivery network (CDN)',
    icon: Globe,
    color: '#7c3aed', // purple
    defaultTechStack: ['CloudFront CDN'],
  },
  // Messaging & Integration
  {
    id: 'aws-sqs',
    name: 'AWS SQS',
    provider: 'AWS',
    category: 'Messaging & Integration',
    genericType: 'queue',
    description: 'Fully managed distributed message queuing service',
    icon: Radio,
    color: '#db2777', // pink
    defaultTechStack: ['Amazon SQS'],
  },
  {
    id: 'aws-sns',
    name: 'AWS SNS',
    provider: 'AWS',
    category: 'Messaging & Integration',
    genericType: 'event-bus',
    description: 'Pub/Sub messaging and push notifications',
    icon: Radio,
    color: '#db2777',
    defaultTechStack: ['Amazon SNS'],
  },
  // Security
  {
    id: 'aws-iam',
    name: 'AWS IAM',
    provider: 'AWS',
    category: 'Security',
    genericType: 'authorization-policy',
    description: 'Identity and Access Management fine-grained access control',
    icon: KeyRound,
    color: '#dc2626', // red
    defaultTechStack: ['AWS IAM'],
  },
  // Observability
  {
    id: 'aws-cloudwatch',
    name: 'AWS CloudWatch',
    provider: 'AWS',
    category: 'Observability',
    genericType: 'monitoring',
    description: 'Observability and monitoring for AWS cloud resources',
    icon: LineChart,
    color: '#ea580c',
    defaultTechStack: ['Amazon CloudWatch'],
  },
  // AI & Analytics
  {
    id: 'aws-bedrock',
    name: 'AWS Bedrock',
    provider: 'AWS',
    category: 'AI & Analytics',
    genericType: 'llm-model',
    description: 'Managed Foundation Models & Generative AI service',
    icon: Sparkles,
    color: '#0891b2', // cyan
    defaultTechStack: ['AWS Bedrock', 'Claude / Llama'],
  },

  // ──────────────────────────── Google Cloud ────────────────────────────
  // Compute & Containers
  {
    id: 'gcp-gce',
    name: 'Google Compute Engine',
    provider: 'Google Cloud',
    category: 'Compute & Containers',
    genericType: 'server',
    description: 'Scalable Google Cloud high-performance virtual machines',
    icon: Cpu,
    color: '#4285f4', // Google blue
    defaultTechStack: ['GCE', 'Debian/Ubuntu'],
  },
  {
    id: 'gcp-cloud-run',
    name: 'Google Cloud Run',
    provider: 'Google Cloud',
    category: 'Compute & Containers',
    genericType: 'serverless',
    description: 'Fully managed serverless container runtime',
    icon: Flame,
    color: '#4285f4',
    defaultTechStack: ['Cloud Run', 'Containers'],
  },
  {
    id: 'gcp-gke',
    name: 'Google Kubernetes Engine (GKE)',
    provider: 'Google Cloud',
    category: 'Compute & Containers',
    genericType: 'container-cluster',
    description: 'Managed enterprise Kubernetes container orchestration',
    icon: Box,
    color: '#4285f4',
    defaultTechStack: ['GKE', 'Kubernetes'],
  },
  // Storage
  {
    id: 'gcp-gcs',
    name: 'Google Cloud Storage',
    provider: 'Google Cloud',
    category: 'Storage',
    genericType: 'object-storage',
    description: 'Worldwide object storage for companies of all sizes',
    icon: HardDrive,
    color: '#34a853', // Google green
    defaultTechStack: ['Google Cloud Storage (GCS)'],
  },
  // Databases
  {
    id: 'gcp-cloud-sql',
    name: 'Google Cloud SQL',
    provider: 'Google Cloud',
    category: 'Databases',
    genericType: 'sql-database',
    description: 'Fully managed relational database for MySQL, PostgreSQL, SQL Server',
    icon: Table,
    color: '#4285f4',
    defaultTechStack: ['Cloud SQL', 'PostgreSQL'],
  },
  {
    id: 'gcp-firestore',
    name: 'Google Firestore',
    provider: 'Google Cloud',
    category: 'Databases',
    genericType: 'nosql-database',
    description: 'NoSQL document database built for automatic scaling',
    icon: Database,
    color: '#ea4335', // Google red
    defaultTechStack: ['Cloud Firestore'],
  },
  // Networking
  {
    id: 'gcp-cloud-cdn',
    name: 'Google Cloud CDN',
    provider: 'Google Cloud',
    category: 'Networking',
    genericType: 'cdn',
    description: 'Fast, secure web and video content delivery global network',
    icon: Globe,
    color: '#4285f4',
    defaultTechStack: ['Google Cloud CDN'],
  },
  // Messaging & Integration
  {
    id: 'gcp-pubsub',
    name: 'Google Pub/Sub',
    provider: 'Google Cloud',
    category: 'Messaging & Integration',
    genericType: 'event-bus',
    description: 'Global asynchronous many-to-many messaging service',
    icon: Radio,
    color: '#4285f4',
    defaultTechStack: ['Google Cloud Pub/Sub'],
  },
  // Security
  {
    id: 'gcp-cloud-iam',
    name: 'Google Cloud IAM',
    provider: 'Google Cloud',
    category: 'Security',
    genericType: 'authorization-policy',
    description: 'Fine-grained access control and visibility for Google Cloud',
    icon: ShieldCheck,
    color: '#34a853',
    defaultTechStack: ['Google Cloud IAM'],
  },
  // Observability
  {
    id: 'gcp-cloud-monitoring',
    name: 'Google Cloud Monitoring',
    provider: 'Google Cloud',
    category: 'Observability',
    genericType: 'monitoring',
    description: 'Metrics, logs, and trace observability with Google Cloud Operations',
    icon: LineChart,
    color: '#fbbc05', // Google yellow
    defaultTechStack: ['Cloud Monitoring', 'Cloud Logging'],
  },
  // AI & Analytics
  {
    id: 'gcp-vertex-ai',
    name: 'Google Vertex AI',
    provider: 'Google Cloud',
    category: 'AI & Analytics',
    genericType: 'llm-model',
    description: 'Unified ML platform with Gemini Foundation Models',
    icon: Sparkles,
    color: '#4285f4',
    defaultTechStack: ['Vertex AI', 'Gemini 1.5 Pro'],
  },

  // ──────────────────────────── Azure ────────────────────────────
  // Compute & Containers
  {
    id: 'azure-vm',
    name: 'Azure Virtual Machines',
    provider: 'Azure',
    category: 'Compute & Containers',
    genericType: 'server',
    description: 'On-demand, scalable Microsoft Azure computing resources',
    icon: Cpu,
    color: '#0078d4', // Azure blue
    defaultTechStack: ['Azure VM', 'Windows/Linux'],
  },
  {
    id: 'azure-functions',
    name: 'Azure Functions',
    provider: 'Azure',
    category: 'Compute & Containers',
    genericType: 'serverless',
    description: 'Serverless event-driven compute platform for agile solutions',
    icon: Flame,
    color: '#0078d4',
    defaultTechStack: ['Azure Functions', 'C#/TypeScript'],
  },
  {
    id: 'azure-aks',
    name: 'Azure Kubernetes Service (AKS)',
    provider: 'Azure',
    category: 'Compute & Containers',
    genericType: 'container-cluster',
    description: 'Managed production-grade Kubernetes cluster orchestration',
    icon: Box,
    color: '#0078d4',
    defaultTechStack: ['AKS', 'Kubernetes'],
  },
  // Storage
  {
    id: 'azure-blob',
    name: 'Azure Blob Storage',
    provider: 'Azure',
    category: 'Storage',
    genericType: 'object-storage',
    description: 'Massively scalable and secure object storage for cloud workloads',
    icon: HardDrive,
    color: '#107c41', // Azure green
    defaultTechStack: ['Azure Blob Storage'],
  },
  // Databases
  {
    id: 'azure-sql',
    name: 'Azure SQL Database',
    provider: 'Azure',
    category: 'Databases',
    genericType: 'sql-database',
    description: 'Always up-to-date, intelligent managed SQL database service',
    icon: Table,
    color: '#0078d4',
    defaultTechStack: ['Azure SQL', 'T-SQL'],
  },
  {
    id: 'azure-cosmos-db',
    name: 'Azure Cosmos DB',
    provider: 'Azure',
    category: 'Databases',
    genericType: 'nosql-database',
    description: 'Globally distributed, multi-model NoSQL database service',
    icon: Database,
    color: '#0078d4',
    defaultTechStack: ['Cosmos DB'],
  },
  // Networking
  {
    id: 'azure-front-door',
    name: 'Azure Front Door / CDN',
    provider: 'Azure',
    category: 'Networking',
    genericType: 'cdn',
    description: 'Scalable and secure entry point for fast web applications',
    icon: Globe,
    color: '#0078d4',
    defaultTechStack: ['Azure Front Door'],
  },
  // Messaging & Integration
  {
    id: 'azure-service-bus',
    name: 'Azure Service Bus',
    provider: 'Azure',
    category: 'Messaging & Integration',
    genericType: 'queue',
    description: 'Reliable cloud messaging as a service (MaaS) and event routing',
    icon: Radio,
    color: '#0078d4',
    defaultTechStack: ['Azure Service Bus'],
  },
  // Security
  {
    id: 'azure-entra-id',
    name: 'Microsoft Entra ID',
    provider: 'Azure',
    category: 'Security',
    genericType: 'identity-provider',
    description: 'Universal identity and access management (formerly Azure AD)',
    icon: KeyRound,
    color: '#0078d4',
    defaultTechStack: ['Microsoft Entra ID', 'OAuth2/OIDC'],
  },
  // Observability
  {
    id: 'azure-monitor',
    name: 'Azure Monitor',
    provider: 'Azure',
    category: 'Observability',
    genericType: 'monitoring',
    description: 'Full-stack monitoring, telemetry, and Application Insights',
    icon: LineChart,
    color: '#0078d4',
    defaultTechStack: ['Azure Monitor', 'App Insights'],
  },
  // AI & Analytics
  {
    id: 'azure-openai',
    name: 'Azure OpenAI Service',
    provider: 'Azure',
    category: 'AI & Analytics',
    genericType: 'llm-model',
    description: 'Enterprise GPT-4o and OpenAI models with Azure security',
    icon: Sparkles,
    color: '#0078d4',
    defaultTechStack: ['Azure OpenAI', 'GPT-4o'],
  },
];

export const CLOUD_PROVIDERS = ['AWS', 'Google Cloud', 'Azure'] as const;
export type CloudProvider = (typeof CLOUD_PROVIDERS)[number];

export const CLOUD_CATEGORIES = [
  'Compute & Containers',
  'Storage',
  'Databases',
  'Networking',
  'Messaging & Integration',
  'Security',
  'Observability',
  'AI & Analytics',
] as const;
