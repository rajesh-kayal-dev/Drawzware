import type { SystemEdge, SystemEdgeType, SystemNode, SystemNodeType } from '@/types';

export interface StackPresetNodeDef {
  key: string;
  label: string;
  nodeType: SystemNodeType;
  customIcon?: string;
  color?: string;
  techStack: string[];
  description?: string;
  isOptional?: boolean;
  offset: { x: number; y: number };
}

export interface StackPresetEdgeDef {
  sourceKey: string;
  targetKey: string;
  edgeType?: SystemEdgeType;
  label?: string;
}

export interface StackPreset {
  id: string;
  name: string;
  category: 'Fullstack' | 'Backend & DB' | 'Enterprise' | 'Cloud & Distributed' | 'Event-Driven';
  description: string;
  tags: string[];
  nodes: StackPresetNodeDef[];
  edges: StackPresetEdgeDef[];
}

export const TECHNOLOGY_STACK_PRESETS: StackPreset[] = [
  // 1. MERN
  {
    id: 'stack-mern',
    name: 'MERN Stack',
    category: 'Fullstack',
    description: 'MongoDB, Express.js, React, Node.js single-language fullstack JavaScript architecture',
    tags: ['mern', 'mongo', 'express', 'react', 'node', 'fullstack'],
    nodes: [
      {
        key: 'client',
        label: 'React Frontend',
        nodeType: 'client',
        customIcon: 'react',
        color: '#61DAFB',
        techStack: ['React', 'SPA', 'Axios'],
        description: 'Single-page client interface rendering user UI components',
        offset: { x: 0, y: 80 },
      },
      {
        key: 'api',
        label: 'Express / Node.js API',
        nodeType: 'service',
        customIcon: 'nodedotjs',
        color: '#5FA04E',
        techStack: ['Node.js', 'Express', 'REST API'],
        description: 'Backend application server handling routing and business logic',
        offset: { x: 260, y: 80 },
      },
      {
        key: 'db',
        label: 'MongoDB Database',
        nodeType: 'nosql-database',
        customIcon: 'mongodb',
        color: '#47A248',
        techStack: ['MongoDB', 'Mongoose', 'Document Store'],
        description: 'Flexible JSON document database for persistent domain data',
        offset: { x: 520, y: 80 },
      },
      {
        key: 'cache',
        label: 'Redis Cache',
        nodeType: 'cache',
        customIcon: 'redis',
        color: '#FF4438',
        techStack: ['Redis', 'In-memory Cache'],
        description: 'Optional high-speed cache for sessions and frequent queries',
        isOptional: true,
        offset: { x: 260, y: 220 },
      },
    ],
    edges: [
      { sourceKey: 'client', targetKey: 'api', edgeType: 'rest', label: 'HTTP / JSON' },
      { sourceKey: 'api', targetKey: 'db', edgeType: 'db-query', label: 'Mongoose Driver' },
      { sourceKey: 'api', targetKey: 'cache', edgeType: 'db-query', label: 'Cache Get/Set' },
    ],
  },

  // 2. MEAN
  {
    id: 'stack-mean',
    name: 'MEAN Stack',
    category: 'Fullstack',
    description: 'MongoDB, Express.js, Angular, Node.js enterprise fullstack TypeScript/JavaScript stack',
    tags: ['mean', 'mongo', 'express', 'angular', 'node', 'enterprise'],
    nodes: [
      {
        key: 'client',
        label: 'Angular Client',
        nodeType: 'client',
        customIcon: 'angular',
        color: '#DD0031',
        techStack: ['Angular', 'TypeScript', 'RxJS'],
        description: 'Type-safe enterprise SPA frontend interface',
        offset: { x: 0, y: 80 },
      },
      {
        key: 'api',
        label: 'Express / Node.js API',
        nodeType: 'service',
        customIcon: 'nodedotjs',
        color: '#5FA04E',
        techStack: ['Node.js', 'Express', 'TypeScript'],
        description: 'REST API service executing middleware and controller logic',
        offset: { x: 260, y: 80 },
      },
      {
        key: 'db',
        label: 'MongoDB Database',
        nodeType: 'nosql-database',
        customIcon: 'mongodb',
        color: '#47A248',
        techStack: ['MongoDB', 'Mongoose'],
        description: 'Document database storing collections and schema models',
        offset: { x: 520, y: 80 },
      },
    ],
    edges: [
      { sourceKey: 'client', targetKey: 'api', edgeType: 'rest', label: 'REST / JSON' },
      { sourceKey: 'api', targetKey: 'db', edgeType: 'db-query', label: 'TCP 27017' },
    ],
  },

  // 3. MEVN
  {
    id: 'stack-mevn',
    name: 'MEVN Stack',
    category: 'Fullstack',
    description: 'MongoDB, Express.js, Vue.js, Node.js lightweight reactive web application stack',
    tags: ['mevn', 'mongo', 'express', 'vue', 'node'],
    nodes: [
      {
        key: 'client',
        label: 'Vue.js Frontend',
        nodeType: 'client',
        customIcon: 'vuedotjs',
        color: '#4FC08D',
        techStack: ['Vue 3', 'Pinia', 'Vite'],
        description: 'Reactive single-page application with component store',
        offset: { x: 0, y: 80 },
      },
      {
        key: 'api',
        label: 'Express / Node.js API',
        nodeType: 'service',
        customIcon: 'nodedotjs',
        color: '#5FA04E',
        techStack: ['Node.js', 'Express', 'JWT'],
        description: 'Stateless RESTful API backend',
        offset: { x: 260, y: 80 },
      },
      {
        key: 'db',
        label: 'MongoDB Database',
        nodeType: 'nosql-database',
        customIcon: 'mongodb',
        color: '#47A248',
        techStack: ['MongoDB', 'NoSQL'],
        description: 'Document-oriented database for rapid schema iteration',
        offset: { x: 520, y: 80 },
      },
    ],
    edges: [
      { sourceKey: 'client', targetKey: 'api', edgeType: 'rest', label: 'HTTP API' },
      { sourceKey: 'api', targetKey: 'db', edgeType: 'db-query', label: 'BSON Queries' },
    ],
  },

  // 4. LAMP Stack
  {
    id: 'stack-lamp',
    name: 'LAMP Stack',
    category: 'Fullstack',
    description: 'Linux, Apache HTTP Server, MySQL, and PHP classic full-stack architecture',
    tags: ['lamp', 'apache', 'mysql', 'php', 'classic'],
    nodes: [
      {
        key: 'client',
        label: 'Browser Client',
        nodeType: 'client',
        customIcon: 'browser',
        color: '#0284C7',
        techStack: ['Web Browser', 'HTML / CSS'],
        description: 'Client browser making standard HTTP/HTTPS page requests',
        offset: { x: 0, y: 80 },
      },
      {
        key: 'web',
        label: 'Apache Web Server',
        nodeType: 'server',
        customIcon: 'server',
        color: '#D22128',
        techStack: ['Apache HTTPD', 'mod_php'],
        description: 'HTTP daemon processing requests and executing embedded PHP scripts',
        offset: { x: 260, y: 80 },
      },
      {
        key: 'app',
        label: 'PHP Application',
        nodeType: 'service',
        customIcon: 'php',
        color: '#777BB4',
        techStack: ['PHP 8', 'PDO / MySQLi'],
        description: 'Server-side application scripts generating dynamic HTML and handling API logic',
        offset: { x: 520, y: 80 },
      },
      {
        key: 'db',
        label: 'MySQL Database',
        nodeType: 'sql-database',
        customIcon: 'mysql',
        color: '#4479A1',
        techStack: ['MySQL', 'InnoDB', 'Relational'],
        description: 'Structured relational storage for application records and user data',
        offset: { x: 780, y: 80 },
      },
    ],
    edges: [
      { sourceKey: 'client', targetKey: 'web', edgeType: 'rest', label: 'HTTP / HTTPS' },
      { sourceKey: 'web', targetKey: 'app', edgeType: 'tcp', label: 'mod_php execution' },
      { sourceKey: 'app', targetKey: 'db', edgeType: 'db-query', label: 'SQL queries :3306' },
    ],
  },

  // 5. Laravel + MySQL
  {
    id: 'stack-laravel-mysql',
    name: 'Laravel + MySQL',
    category: 'Fullstack',
    description: 'Nginx, Laravel MVC PHP framework, MySQL relational database, and optional Redis caching',
    tags: ['laravel', 'mysql', 'php', 'nginx', 'mvc'],
    nodes: [
      {
        key: 'client',
        label: 'Browser Client',
        nodeType: 'client',
        customIcon: 'browser',
        color: '#0284C7',
        techStack: ['Web Browser', 'Blade / Vue / React'],
        description: 'User web browser requesting web pages and sending form submissions',
        offset: { x: 0, y: 90 },
      },
      {
        key: 'web',
        label: 'Nginx Server',
        nodeType: 'reverse-proxy',
        customIcon: 'nginx',
        color: '#009639',
        techStack: ['Nginx', 'FastCGI / PHP-FPM'],
        description: 'Web server terminating TLS, serving static files, and proxying PHP',
        offset: { x: 240, y: 90 },
      },
      {
        key: 'app',
        label: 'Laravel App (PHP)',
        nodeType: 'service',
        customIcon: 'laravel',
        color: '#FF2D20',
        techStack: ['Laravel 11', 'PHP 8.3', 'Eloquent ORM'],
        description: 'Model-View-Controller backend handling requests and business logic',
        offset: { x: 480, y: 90 },
      },
      {
        key: 'db',
        label: 'MySQL Database',
        nodeType: 'sql-database',
        customIcon: 'mysql',
        color: '#4479A1',
        techStack: ['MySQL 8', 'InnoDB', 'Relational'],
        description: 'ACID-compliant relational database for application tables',
        offset: { x: 720, y: 40 },
      },
      {
        key: 'cache',
        label: 'Redis Cache',
        nodeType: 'cache',
        customIcon: 'redis',
        color: '#FF4438',
        techStack: ['Redis', 'Queue / Cache'],
        description: 'Configurable in-memory cache and queue driver for background jobs',
        isOptional: true,
        offset: { x: 720, y: 150 },
      },
    ],
    edges: [
      { sourceKey: 'client', targetKey: 'web', edgeType: 'rest', label: 'HTTPS :443' },
      { sourceKey: 'web', targetKey: 'app', edgeType: 'tcp', label: 'FastCGI :9000' },
      { sourceKey: 'app', targetKey: 'db', edgeType: 'db-query', label: 'SQL :3306' },
      { sourceKey: 'app', targetKey: 'cache', edgeType: 'tcp', label: 'RESP :6379' },
    ],
  },

  // 5. T3 Stack
  {
    id: 'stack-t3',
    name: 'T3 Stack',
    category: 'Fullstack',
    description: 'Next.js, TypeScript, Tailwind CSS, tRPC, and Prisma / PostgreSQL for end-to-end type safety',
    tags: ['t3', 'nextjs', 'typescript', 'trpc', 'prisma', 'tailwind'],
    nodes: [
      {
        key: 'ui',
        label: 'Next.js Client (UI)',
        nodeType: 'client',
        customIcon: 'nextdotjs',
        color: '#000000',
        techStack: ['Next.js', 'React', 'Tailwind CSS'],
        description: 'Server and client components with Tailwind utility styling',
        offset: { x: 0, y: 80 },
      },
      {
        key: 'api',
        label: 'Next.js App / tRPC API',
        nodeType: 'service',
        customIcon: 'typescript',
        color: '#3178C6',
        techStack: ['tRPC', 'TypeScript', 'Server Actions'],
        description: 'End-to-end type-safe API routers without code generation',
        offset: { x: 260, y: 80 },
      },
      {
        key: 'orm',
        label: 'Prisma ORM',
        nodeType: 'service',
        customIcon: 'postgresql',
        color: '#2D3748',
        techStack: ['Prisma Client', 'Schema Migrations'],
        description: 'Type-safe database client and automated schema migrations',
        offset: { x: 500, y: 80 },
      },
      {
        key: 'db',
        label: 'PostgreSQL Database',
        nodeType: 'sql-database',
        customIcon: 'postgresql',
        color: '#4169E1',
        techStack: ['PostgreSQL', 'Relational'],
        description: 'Relational data store with strong consistency',
        offset: { x: 740, y: 80 },
      },
      {
        key: 'auth',
        label: 'NextAuth.js (Auth)',
        nodeType: 'auth-service',
        customIcon: 'auth0',
        color: '#000000',
        techStack: ['NextAuth', 'OAuth', 'JWT'],
        description: 'Optional authentication and session provider',
        isOptional: true,
        offset: { x: 260, y: 220 },
      },
    ],
    edges: [
      { sourceKey: 'ui', targetKey: 'api', edgeType: 'rest', label: 'tRPC Queries' },
      { sourceKey: 'api', targetKey: 'orm', edgeType: 'rest', label: 'Type-safe Calls' },
      { sourceKey: 'orm', targetKey: 'db', edgeType: 'db-query', label: 'SQL Wire :5432' },
      { sourceKey: 'api', targetKey: 'auth', edgeType: 'rest', label: 'Validate Session' },
    ],
  },

  // 6. FARM Stack
  {
    id: 'stack-farm',
    name: 'FARM Stack',
    category: 'Fullstack',
    description: 'FastAPI, React, MongoDB, and Python for modern high-throughput reactive web applications',
    tags: ['farm', 'fastapi', 'react', 'mongodb', 'python'],
    nodes: [
      {
        key: 'client',
        label: 'React Frontend',
        nodeType: 'client',
        customIcon: 'react',
        color: '#61DAFB',
        techStack: ['React', 'TypeScript', 'TanStack Query'],
        description: 'Interactive client making async queries to FastAPI',
        offset: { x: 0, y: 80 },
      },
      {
        key: 'api',
        label: 'FastAPI Backend',
        nodeType: 'service',
        customIcon: 'fastapi',
        color: '#009688',
        techStack: ['FastAPI', 'Python', 'Pydantic', 'Motor'],
        description: 'High-performance ASGI server with automatic OpenAPI docs',
        offset: { x: 260, y: 80 },
      },
      {
        key: 'db',
        label: 'MongoDB Database',
        nodeType: 'nosql-database',
        customIcon: 'mongodb',
        color: '#47A248',
        techStack: ['MongoDB', 'Motor Async Driver'],
        description: 'Asynchronous document storage powered by Motor driver',
        offset: { x: 520, y: 80 },
      },
    ],
    edges: [
      { sourceKey: 'client', targetKey: 'api', edgeType: 'rest', label: 'HTTP / JSON' },
      { sourceKey: 'api', targetKey: 'db', edgeType: 'db-query', label: 'Async BSON' },
    ],
  },

  // 7. Django + PostgreSQL
  {
    id: 'stack-django-postgres',
    name: 'Django + PostgreSQL',
    category: 'Backend & DB',
    description: 'Nginx, Gunicorn / Django, PostgreSQL, and optional Redis caching / Celery worker',
    tags: ['django', 'postgres', 'postgresql', 'python', 'gunicorn', 'celery'],
    nodes: [
      {
        key: 'proxy',
        label: 'Nginx Reverse Proxy',
        nodeType: 'reverse-proxy',
        customIcon: 'nginx',
        color: '#009639',
        techStack: ['Nginx', 'SSL Termination'],
        description: 'Terminates HTTPS and routes traffic to Gunicorn application server',
        offset: { x: 0, y: 80 },
      },
      {
        key: 'app',
        label: 'Django App (Gunicorn)',
        nodeType: 'service',
        customIcon: 'django',
        color: '#092E20',
        techStack: ['Django', 'Python', 'Gunicorn WSGI'],
        description: 'Batteries-included backend handling ORM, admin, and REST views',
        offset: { x: 250, y: 80 },
      },
      {
        key: 'db',
        label: 'PostgreSQL Database',
        nodeType: 'sql-database',
        customIcon: 'postgresql',
        color: '#4169E1',
        techStack: ['PostgreSQL', 'psycopg2'],
        description: 'Primary relational database storing models and transactional data',
        offset: { x: 500, y: 30 },
      },
      {
        key: 'cache',
        label: 'Redis (Optional Cache/Celery)',
        nodeType: 'redis',
        customIcon: 'redis',
        color: '#FF4438',
        techStack: ['Redis', 'Celery Broker'],
        description: 'Configurable in-memory cache and task queue broker for Celery',
        isOptional: true,
        offset: { x: 500, y: 140 },
      },
    ],
    edges: [
      { sourceKey: 'proxy', targetKey: 'app', edgeType: 'rest', label: 'Proxy Pass :8000' },
      { sourceKey: 'app', targetKey: 'db', edgeType: 'db-query', label: 'SQL :5432' },
      { sourceKey: 'app', targetKey: 'cache', edgeType: 'tcp', label: 'Cache / Tasks' },
    ],
  },

  // 8. FastAPI + PostgreSQL
  {
    id: 'stack-fastapi-postgres',
    name: 'FastAPI + PostgreSQL',
    category: 'Backend & DB',
    description: 'FastAPI, Uvicorn, SQLAlchemy async engine, PostgreSQL, and optional Redis session cache',
    tags: ['fastapi', 'postgresql', 'postgres', 'python', 'uvicorn', 'sqlalchemy'],
    nodes: [
      {
        key: 'client',
        label: 'API Consumer / Client',
        nodeType: 'client',
        customIcon: 'client',
        color: '#9333EA',
        techStack: ['Mobile / Web Client'],
        description: 'Client application making high-throughput JSON API calls',
        offset: { x: 0, y: 80 },
      },
      {
        key: 'api',
        label: 'FastAPI (Uvicorn ASGI)',
        nodeType: 'service',
        customIcon: 'fastapi',
        color: '#009688',
        techStack: ['FastAPI', 'Uvicorn', 'Pydantic'],
        description: 'Asynchronous event loop server handling concurrent API requests',
        offset: { x: 250, y: 80 },
      },
      {
        key: 'db',
        label: 'PostgreSQL (asyncpg)',
        nodeType: 'sql-database',
        customIcon: 'postgresql',
        color: '#4169E1',
        techStack: ['PostgreSQL', 'SQLAlchemy 2.0', 'asyncpg'],
        description: 'Relational database queried via asynchronous connection pool',
        offset: { x: 500, y: 30 },
      },
      {
        key: 'redis',
        label: 'Redis (Optional Cache)',
        nodeType: 'redis',
        customIcon: 'redis',
        color: '#FF4438',
        techStack: ['Redis', 'Rate Limiter / Cache'],
        description: 'Configurable in-memory token bucket rate limiter and response cache',
        isOptional: true,
        offset: { x: 500, y: 140 },
      },
    ],
    edges: [
      { sourceKey: 'client', targetKey: 'api', edgeType: 'rest', label: 'HTTP / JSON' },
      { sourceKey: 'api', targetKey: 'db', edgeType: 'db-query', label: 'asyncpg :5432' },
      { sourceKey: 'api', targetKey: 'redis', edgeType: 'tcp', label: 'Cache Hits' },
    ],
  },

  // 9. Java + Spring Boot + PostgreSQL/MySQL
  {
    id: 'stack-spring-postgres-mysql',
    name: 'Java + Spring Boot + PostgreSQL/MySQL',
    category: 'Enterprise',
    description: 'Enterprise Java Spring Boot microservice with HikariCP, PostgreSQL/MySQL, and Redis caching',
    tags: ['java', 'spring', 'springboot', 'postgresql', 'mysql', 'enterprise'],
    nodes: [
      {
        key: 'client',
        label: 'Client Application',
        nodeType: 'client',
        customIcon: 'client',
        color: '#9333EA',
        techStack: ['Web / Mobile Client'],
        description: 'Consumer sending authenticated REST or gRPC requests',
        offset: { x: 0, y: 80 },
      },
      {
        key: 'api',
        label: 'Spring Boot REST API',
        nodeType: 'service',
        customIcon: 'springboot',
        color: '#6DB33F',
        techStack: ['Java 21', 'Spring Boot 3', 'Spring Data JPA'],
        description: 'Enterprise service layer with dependency injection and transaction management',
        offset: { x: 250, y: 80 },
      },
      {
        key: 'db',
        label: 'PostgreSQL / MySQL DB',
        nodeType: 'sql-database',
        customIcon: 'postgresql',
        color: '#4169E1',
        techStack: ['PostgreSQL or MySQL', 'HikariCP Pool'],
        description: 'Persistent relational enterprise database with connection pooling',
        offset: { x: 500, y: 30 },
      },
      {
        key: 'cache',
        label: 'Redis (Optional Cache)',
        nodeType: 'redis',
        customIcon: 'redis',
        color: '#FF4438',
        techStack: ['Spring Cache', 'Redis'],
        description: 'Configurable second-level entity cache and session repository',
        isOptional: true,
        offset: { x: 500, y: 140 },
      },
    ],
    edges: [
      { sourceKey: 'client', targetKey: 'api', edgeType: 'rest', label: 'JSON REST' },
      { sourceKey: 'api', targetKey: 'db', edgeType: 'db-query', label: 'JDBC Pool' },
      { sourceKey: 'api', targetKey: 'cache', edgeType: 'tcp', label: 'Cache Sync' },
    ],
  },

  // 10. Angular + Java/Spring Boot
  {
    id: 'stack-angular-spring',
    name: 'Angular + Java/Spring Boot',
    category: 'Enterprise',
    description: 'Modular enterprise Angular frontend communicating with robust Spring Boot REST services',
    tags: ['angular', 'java', 'springboot', 'spring', 'enterprise-fullstack'],
    nodes: [
      {
        key: 'ui',
        label: 'Angular Enterprise UI',
        nodeType: 'client',
        customIcon: 'angular',
        color: '#DD0031',
        techStack: ['Angular', 'TypeScript', 'RxJS', 'NgRx'],
        description: 'Modular enterprise UI with reactive state management and route guards',
        offset: { x: 0, y: 80 },
      },
      {
        key: 'gateway',
        label: 'API Gateway / Reverse Proxy',
        nodeType: 'api-gateway',
        customIcon: 'apigateway',
        color: '#DC2626',
        techStack: ['Spring Cloud Gateway', 'JWT Auth'],
        description: 'Central security boundary routing requests and validating auth tokens',
        offset: { x: 250, y: 80 },
      },
      {
        key: 'service',
        label: 'Spring Boot Microservice',
        nodeType: 'service',
        customIcon: 'springboot',
        color: '#6DB33F',
        techStack: ['Java', 'Spring Boot', 'Spring Security'],
        description: 'Domain business service exposing authenticated REST endpoints',
        offset: { x: 500, y: 80 },
      },
      {
        key: 'db',
        label: 'PostgreSQL Database',
        nodeType: 'sql-database',
        customIcon: 'postgresql',
        color: '#4169E1',
        techStack: ['PostgreSQL', 'Liquibase'],
        description: 'Enterprise relational database with tracked schema migrations',
        offset: { x: 750, y: 80 },
      },
    ],
    edges: [
      { sourceKey: 'ui', targetKey: 'gateway', edgeType: 'rest', label: 'HTTPS :443' },
      { sourceKey: 'gateway', targetKey: 'service', edgeType: 'rest', label: 'Internal Route' },
      { sourceKey: 'service', targetKey: 'db', edgeType: 'db-query', label: 'JPA / JDBC' },
    ],
  },

  // 11. ASP.NET Core + SQL Server
  {
    id: 'stack-aspnet-sqlserver',
    name: 'ASP.NET Core + SQL Server',
    category: 'Enterprise',
    description: 'Microsoft technology stack using ASP.NET Core Web API, Entity Framework Core, and SQL Server',
    tags: ['aspnet', 'dotnet', 'csharp', 'sqlserver', 'microsoft', 'efcore'],
    nodes: [
      {
        key: 'client',
        label: 'Web / Mobile Client',
        nodeType: 'client',
        customIcon: 'client',
        color: '#9333EA',
        techStack: ['Blazor / React / Native'],
        description: 'Client app consuming ASP.NET Core Web API endpoints',
        offset: { x: 0, y: 80 },
      },
      {
        key: 'api',
        label: 'ASP.NET Core Web API',
        nodeType: 'service',
        customIcon: 'dotnet',
        color: '#512BD4',
        techStack: ['C#', '.NET 8', 'Kestrel Server'],
        description: 'High-performance Web API server handling authentication and business logic',
        offset: { x: 250, y: 80 },
      },
      {
        key: 'ef',
        label: 'Entity Framework Core',
        nodeType: 'service',
        customIcon: 'csharp',
        color: '#239120',
        techStack: ['EF Core', 'LINQ Queries'],
        description: 'Object-relational mapper translating LINQ queries to optimized SQL',
        offset: { x: 500, y: 80 },
      },
      {
        key: 'db',
        label: 'Microsoft SQL Server',
        nodeType: 'sql-database',
        customIcon: 'sqlserver',
        color: '#CC292B',
        techStack: ['MS SQL Server', 'T-SQL', 'AlwaysOn'],
        description: 'Enterprise database management system with high-availability replication',
        offset: { x: 750, y: 80 },
      },
    ],
    edges: [
      { sourceKey: 'client', targetKey: 'api', edgeType: 'rest', label: 'REST / JSON' },
      { sourceKey: 'api', targetKey: 'ef', edgeType: 'rest', label: 'Service Calls' },
      { sourceKey: 'ef', targetKey: 'db', edgeType: 'db-query', label: 'TDS :1433' },
    ],
  },

  // 12. Ruby on Rails + PostgreSQL
  {
    id: 'stack-rails-postgres',
    name: 'Ruby on Rails + PostgreSQL',
    category: 'Fullstack',
    description: 'Ruby on Rails MVC with Puma server, PostgreSQL, Redis, and Sidekiq background workers',
    tags: ['rails', 'ruby', 'rubyonrails', 'postgres', 'sidekiq', 'redis'],
    nodes: [
      {
        key: 'client',
        label: 'Browser / Turbo Client',
        nodeType: 'client',
        customIcon: 'browser',
        color: '#0284C7',
        techStack: ['Hotwire', 'Turbo', 'Stimulus'],
        description: 'Client receiving server-rendered HTML snippets and WebSockets',
        offset: { x: 0, y: 80 },
      },
      {
        key: 'app',
        label: 'Ruby on Rails (Puma)',
        nodeType: 'service',
        customIcon: 'rubyonrails',
        color: '#D30001',
        techStack: ['Ruby on Rails', 'Puma Server', 'ActiveRecord'],
        description: 'Full-stack Rails application server orchestrating web requests',
        offset: { x: 250, y: 80 },
      },
      {
        key: 'db',
        label: 'PostgreSQL Database',
        nodeType: 'sql-database',
        customIcon: 'postgresql',
        color: '#4169E1',
        techStack: ['PostgreSQL', 'ActiveRecord'],
        description: 'Relational database maintaining application state and migrations',
        offset: { x: 500, y: 30 },
      },
      {
        key: 'worker',
        label: 'Sidekiq + Redis (Optional)',
        nodeType: 'worker',
        customIcon: 'redis',
        color: '#FF4438',
        techStack: ['Sidekiq', 'Redis', 'Background Jobs'],
        description: 'Configurable asynchronous worker queue for email and background jobs',
        isOptional: true,
        offset: { x: 500, y: 140 },
      },
    ],
    edges: [
      { sourceKey: 'client', targetKey: 'app', edgeType: 'rest', label: 'HTTP / ActionCable' },
      { sourceKey: 'app', targetKey: 'db', edgeType: 'db-query', label: 'SQL :5432' },
      { sourceKey: 'app', targetKey: 'worker', edgeType: 'tcp', label: 'Enqueue Job' },
    ],
  },

  // 13. Next.js + Node.js + PostgreSQL
  {
    id: 'stack-next-node-postgres',
    name: 'Next.js + Node.js + PostgreSQL',
    category: 'Fullstack',
    description: 'Modern hybrid fullstack: Next.js frontend, standalone Node.js microservice, and PostgreSQL',
    tags: ['nextjs', 'node', 'nodejs', 'postgres', 'postgresql', 'hybrid'],
    nodes: [
      {
        key: 'frontend',
        label: 'Next.js App (SSR/Client)',
        nodeType: 'service',
        customIcon: 'nextdotjs',
        color: '#000000',
        techStack: ['Next.js 15', 'React 19', 'SSR / ISR'],
        description: 'Frontend rendering server components and executing edge caching',
        offset: { x: 0, y: 80 },
      },
      {
        key: 'backend',
        label: 'Node.js Backend Service',
        nodeType: 'service',
        customIcon: 'nodedotjs',
        color: '#5FA04E',
        techStack: ['Node.js', 'Fastify / Express', 'TypeScript'],
        description: 'Dedicated backend microservice handling complex domain computations',
        offset: { x: 260, y: 80 },
      },
      {
        key: 'db',
        label: 'PostgreSQL Database',
        nodeType: 'sql-database',
        customIcon: 'postgresql',
        color: '#4169E1',
        techStack: ['PostgreSQL', 'Drizzle ORM'],
        description: 'Relational data store queried by the backend service',
        offset: { x: 520, y: 80 },
      },
    ],
    edges: [
      { sourceKey: 'frontend', targetKey: 'backend', edgeType: 'rest', label: 'Private REST / gRPC' },
      { sourceKey: 'backend', targetKey: 'db', edgeType: 'db-query', label: 'SQL Connection' },
    ],
  },

  // 14. JAMstack
  {
    id: 'stack-jamstack',
    name: 'JAMstack',
    category: 'Cloud & Distributed',
    description: 'JavaScript, APIs, and Markup: Global CDN, static pre-rendering, and serverless microservices',
    tags: ['jamstack', 'cdn', 'serverless', 'headless', 'static'],
    nodes: [
      {
        key: 'cdn',
        label: 'Global CDN / Edge Cache',
        nodeType: 'cdn',
        customIcon: 'cdn',
        color: '#0D9488',
        techStack: ['Cloudflare / CloudFront', 'Edge Cache'],
        description: 'Distributes pre-rendered static assets with sub-millisecond edge response',
        offset: { x: 0, y: 80 },
      },
      {
        key: 'client',
        label: 'Client (JavaScript SPA)',
        nodeType: 'client',
        customIcon: 'javascript',
        color: '#F7DF1E',
        techStack: ['Dynamic JS', 'Hydration', 'Fetch API'],
        description: 'Client hydrating markup and executing dynamic API requests',
        offset: { x: 250, y: 80 },
      },
      {
        key: 'functions',
        label: 'Serverless Functions (APIs)',
        nodeType: 'serverless',
        customIcon: 'vercel',
        color: '#000000',
        techStack: ['Edge Functions', 'AWS Lambda', 'REST'],
        description: 'Stateless on-demand functions handling form actions and mutations',
        offset: { x: 500, y: 30 },
      },
      {
        key: 'cms',
        label: 'Headless CMS / Object Store',
        nodeType: 'object-storage',
        customIcon: 'objectstorage',
        color: '#059669',
        techStack: ['Headless CMS', 'S3 Storage', 'Webhooks'],
        description: 'Content repository triggering rebuild webhooks when editors publish updates',
        offset: { x: 500, y: 140 },
      },
    ],
    edges: [
      { sourceKey: 'cdn', targetKey: 'client', edgeType: 'rest', label: 'Pre-rendered HTML' },
      { sourceKey: 'client', targetKey: 'functions', edgeType: 'rest', label: 'Dynamic API Calls' },
      { sourceKey: 'functions', targetKey: 'cms', edgeType: 'rest', label: 'Content Query' },
    ],
  },

  // 15. Serverless AWS/Azure/GCP
  {
    id: 'stack-serverless-cloud',
    name: 'Serverless Cloud (AWS/Azure/GCP)',
    category: 'Cloud & Distributed',
    description: 'Edge CDN, managed API Gateway, autoscaling serverless functions, and managed NoSQL DB',
    tags: ['serverless', 'aws', 'azure', 'gcp', 'lambda', 'dynamodb'],
    nodes: [
      {
        key: 'cdn',
        label: 'CloudFront / CDN',
        nodeType: 'cdn',
        customIcon: 'aws',
        color: '#FF9900',
        techStack: ['Amazon CloudFront', 'Edge Cache'],
        description: 'Global content delivery network serving static assets and caching API responses',
        offset: { x: 0, y: 80 },
      },
      {
        key: 'gateway',
        label: 'API Gateway',
        nodeType: 'api-gateway',
        customIcon: 'apigateway',
        color: '#DC2626',
        techStack: ['AWS API Gateway', 'HTTP API', 'JWT Authorizer'],
        description: 'Managed HTTP entrypoint routing paths to serverless function targets',
        offset: { x: 250, y: 80 },
      },
      {
        key: 'compute',
        label: 'Serverless Functions (Lambda)',
        nodeType: 'serverless',
        customIcon: 'aws',
        color: '#FF9900',
        techStack: ['AWS Lambda / Cloud Functions', 'Node.js / Python'],
        description: 'Event-driven serverless compute executing without managing VM instances',
        offset: { x: 500, y: 80 },
      },
      {
        key: 'db',
        label: 'Managed NoSQL (DynamoDB)',
        nodeType: 'nosql-database',
        customIcon: 'dynamodb',
        color: '#4053D6',
        techStack: ['Amazon DynamoDB', 'Single-Digit ms'],
        description: 'Fully managed key-value database providing predictable single-digit ms latency',
        offset: { x: 750, y: 80 },
      },
    ],
    edges: [
      { sourceKey: 'cdn', targetKey: 'gateway', edgeType: 'rest', label: 'Route /api/*' },
      { sourceKey: 'gateway', targetKey: 'compute', edgeType: 'rest', label: 'Lambda Proxy' },
      { sourceKey: 'compute', targetKey: 'db', edgeType: 'db-query', label: 'SDK GetItem/PutItem' },
    ],
  },

  // 16. Docker + Kubernetes Microservices
  {
    id: 'stack-docker-k8s',
    name: 'Docker + Kubernetes Microservices',
    category: 'Cloud & Distributed',
    description: 'Containerized ingress controller, internal K8s cluster services, worker pods, and database',
    tags: ['docker', 'kubernetes', 'k8s', 'microservices', 'ingress', 'containers'],
    nodes: [
      {
        key: 'ingress',
        label: 'Ingress Controller',
        nodeType: 'reverse-proxy',
        customIcon: 'kubernetes',
        color: '#326CE5',
        techStack: ['K8s Ingress', 'Nginx Ingress / Traefik'],
        description: 'Exposes HTTP/HTTPS routes from outside the cluster to internal services',
        offset: { x: 0, y: 80 },
      },
      {
        key: 'svc',
        label: 'K8s Cluster Service',
        nodeType: 'service-discovery',
        customIcon: 'kubernetes',
        color: '#326CE5',
        techStack: ['ClusterIP', 'DNS Service Discovery'],
        description: 'Defines logical sets of Pods and enables internal load-balanced access',
        offset: { x: 250, y: 80 },
      },
      {
        key: 'pod_a',
        label: 'Microservice Pod A (API)',
        nodeType: 'k8s-pod',
        customIcon: 'docker',
        color: '#2496ED',
        techStack: ['Docker Container', 'Go / Node.js Pod'],
        description: 'Scalable container replica processing HTTP API requests',
        offset: { x: 500, y: 30 },
      },
      {
        key: 'pod_b',
        label: 'Microservice Pod B (Worker)',
        nodeType: 'k8s-pod',
        customIcon: 'docker',
        color: '#2496ED',
        techStack: ['Docker Container', 'Async Worker Pod'],
        description: 'Background worker replica processing asynchronous tasks',
        offset: { x: 500, y: 140 },
      },
      {
        key: 'db',
        label: 'Stateful Database',
        nodeType: 'sql-database',
        customIcon: 'postgresql',
        color: '#4169E1',
        techStack: ['PostgreSQL StatefulSet / RDS'],
        description: 'Persistent relational data layer attached to persistent volume claims',
        offset: { x: 760, y: 80 },
      },
    ],
    edges: [
      { sourceKey: 'ingress', targetKey: 'svc', edgeType: 'rest', label: 'Route Path' },
      { sourceKey: 'svc', targetKey: 'pod_a', edgeType: 'tcp', label: 'Pod Balance' },
      { sourceKey: 'svc', targetKey: 'pod_b', edgeType: 'tcp', label: 'Internal RPC' },
      { sourceKey: 'pod_a', targetKey: 'db', edgeType: 'db-query', label: 'DB Query' },
    ],
  },

  // 17. Event-driven Architecture using Kafka
  {
    id: 'stack-kafka-eda',
    name: 'Event-Driven Architecture with Kafka',
    category: 'Event-Driven',
    description: 'Decoupled event producers, partitioned Apache Kafka topics, consumer microservices, and sinks',
    tags: ['kafka', 'event-driven', 'eda', 'pubsub', 'stream', 'streaming'],
    nodes: [
      {
        key: 'producer',
        label: 'Event Producer Service',
        nodeType: 'service',
        customIcon: 'microservice',
        color: '#2563EB',
        techStack: ['Order Service', 'Kafka Producer API'],
        description: 'Domain service publishing immutable state-change events to topics',
        offset: { x: 0, y: 80 },
      },
      {
        key: 'kafka',
        label: 'Kafka Cluster & Topics',
        nodeType: 'stream',
        customIcon: 'apachekafka',
        color: '#231F20',
        techStack: ['Apache Kafka', 'Partitioned Topics'],
        description: 'Distributed append-only log storing event records with high throughput',
        offset: { x: 260, y: 80 },
      },
      {
        key: 'consumer_a',
        label: 'Consumer: Notifications',
        nodeType: 'worker',
        customIcon: 'microservice',
        color: '#059669',
        techStack: ['Notification Worker', 'Consumer Group'],
        description: 'Autonomous worker consuming events to send push and email alerts',
        offset: { x: 520, y: 20 },
      },
      {
        key: 'consumer_b',
        label: 'Consumer: Billing Service',
        nodeType: 'service',
        customIcon: 'microservice',
        color: '#7C3AED',
        techStack: ['Payment Processor', 'Consumer Group'],
        description: 'Processes financial transactions and updates invoice status',
        offset: { x: 520, y: 130 },
      },
      {
        key: 'sink',
        label: 'Analytics / Data Sink',
        nodeType: 'object-storage',
        customIcon: 'elasticsearch',
        color: '#005571',
        techStack: ['Elasticsearch / S3 Data Lake'],
        description: 'Persistent analytics sink indexing events for reporting and search',
        offset: { x: 780, y: 80 },
      },
    ],
    edges: [
      { sourceKey: 'producer', targetKey: 'kafka', edgeType: 'pub-sub', label: 'Publish Event' },
      { sourceKey: 'kafka', targetKey: 'consumer_a', edgeType: 'pub-sub', label: 'Subscribe' },
      { sourceKey: 'kafka', targetKey: 'consumer_b', edgeType: 'pub-sub', label: 'Subscribe' },
      { sourceKey: 'consumer_b', targetKey: 'sink', edgeType: 'db-query', label: 'Sync Sink' },
    ],
  },
];

let presetCounter = 0;

/**
 * Instantiates a Technology Stack preset into concrete SystemNodes and SystemEdgeModels
 * positioned around the specified canvas origin coordinates.
 */
export function instantiateStackPreset(
  preset: StackPreset,
  origin: { x: number; y: number }
): { nodes: SystemNode[]; edges: SystemEdge[] } {
  presetCounter += 1;
  const time = Date.now();
  const idMap = new Map<string, string>();

  // Create nodes with sensible offsets
  const nodes: SystemNode[] = preset.nodes.map((nodeDef, index) => {
    const id = `node-${preset.id}-${time}-${presetCounter}-${index + 1}`;
    idMap.set(nodeDef.key, id);

    return {
      id,
      type: 'system',
      position: {
        x: Math.round(origin.x + nodeDef.offset.x),
        y: Math.round(origin.y + nodeDef.offset.y),
      },
      data: {
        label: nodeDef.label,
        nodeType: nodeDef.nodeType,
        customIcon: nodeDef.customIcon,
        color: nodeDef.color,
        description: nodeDef.description || '',
        techStack: [...nodeDef.techStack],
      },
    };
  });

  // Create edges wiring the nodes together
  const edges: SystemEdge[] = preset.edges
    .map((edgeDef, index) => {
      const sourceId = idMap.get(edgeDef.sourceKey);
      const targetId = idMap.get(edgeDef.targetKey);
      if (!sourceId || !targetId) return null;

      const sourceNode = preset.nodes.find((n) => n.key === edgeDef.sourceKey);
      const targetNode = preset.nodes.find((n) => n.key === edgeDef.targetKey);

      // Determine handle directions based on relative position
      const isVertical =
        sourceNode && targetNode && Math.abs(targetNode.offset.y - sourceNode.offset.y) > 70;

      const sourceHandle = isVertical ? 'bottom-source' : 'right-source';
      const targetHandle = isVertical ? 'top-target' : 'left-target';

      const edge: SystemEdge = {
        id: `edge-${preset.id}-${time}-${presetCounter}-${index + 1}`,
        source: sourceId,
        target: targetId,
        sourceHandle,
        targetHandle,
        type: 'system',
        data: {
          edgeType: edgeDef.edgeType || 'rest',
          label: edgeDef.label || '',
        },
      };

      return edge;
    })
    .filter((e): e is SystemEdge => e !== null);

  return { nodes, edges };
}
