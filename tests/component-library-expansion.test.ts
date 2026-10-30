import { describe, it, expect, beforeEach } from 'vitest';
import {
  EXPANDED_COMPONENTS,
  EXPANDED_COMPONENT_CATEGORIES,
} from '@/features/canvas/registries/expanded-components-registry';
import {
  POPULAR_SERVICES,
  POPULAR_SERVICE_CATEGORIES,
} from '@/features/canvas/registries/popular-services-registry';
import {
  TECHNOLOGY_STACK_PRESETS,
  instantiateStackPreset,
} from '@/features/canvas/registries/technology-stacks';
import {
  hasTechIcon,
  getTechIconDef,
} from '@/lib/icons/tech-icons';
import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import { createSystemNode } from '@/features/canvas/utils/node-factory';
import { SystemNodeDataSchema } from '@/features/canvas/types/canvas.types';

describe('Component Library Expansion & Resizing Fix', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      nodes: [],
      edges: [],
      history: [{ nodes: [], edges: [] }],
      historyIndex: 0,
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  });

  describe('Requirement 2: Expanded Components Library Categories', () => {
    it('contains all 8 required categories', () => {
      expect(EXPANDED_COMPONENT_CATEGORIES).toEqual([
        'Languages',
        'Frontend',
        'Backend',
        'Databases',
        'Infrastructure',
        'Messaging & Monitoring',
        'Security',
        'Networking',
      ]);
    });

    it('contains all 13 requested languages', () => {
      const languages = EXPANDED_COMPONENTS.filter((c) => c.category === 'Languages').map(
        (c) => c.label
      );
      const expected = [
        'JavaScript',
        'TypeScript',
        'Python',
        'Java',
        'PHP',
        'C#',
        'Go',
        'Rust',
        'Ruby',
        'Kotlin',
        'Swift',
        'Dart',
        'SQL',
      ];
      for (const lang of expected) {
        expect(languages).toContain(lang);
      }
    });

    it('contains all 10 requested frontend technologies', () => {
      const frontend = EXPANDED_COMPONENTS.filter((c) => c.category === 'Frontend').map(
        (c) => c.label
      );
      const expected = [
        'React',
        'Next.js',
        'Angular',
        'Vue',
        'Svelte',
        'Vite',
        'Astro',
        'Tailwind CSS',
        'Electronjs',
        'Flutter',
      ];
      for (const fe of expected) {
        expect(frontend).toContain(fe);
      }
    });

    it('contains all 10 requested backend frameworks', () => {
      const backend = EXPANDED_COMPONENTS.filter((c) => c.category === 'Backend').map(
        (c) => c.label
      );
      const expected = [
        'Node.js',
        'Express',
        'NestJS',
        'Laravel',
        'Django',
        'Flask',
        'FastAPI',
        'Spring Boot',
        'ASP.NET Core',
        'Ruby on Rails',
      ];
      for (const be of expected) {
        expect(backend).toContain(be);
      }
    });

    it('contains all 11 requested databases with aliases', () => {
      const databases = EXPANDED_COMPONENTS.filter((c) => c.category === 'Databases');
      const labels = databases.map((c) => c.label);
      const expected = [
        'PostgreSQL',
        'MySQL',
        'MongoDB',
        'SQLite',
        'Redis',
        'DynamoDB',
        'Cassandra',
        'Elasticsearch',
        'Neo4j',
        'Oracle',
        'SQL Server',
      ];
      for (const db of expected) {
        expect(labels).toContain(db);
      }

      // Verify PostgreSQL alias
      const postgres = databases.find((c) => c.label === 'PostgreSQL');
      const lowerAliases = postgres?.aliases.map((a) => a.toLowerCase());
      expect(lowerAliases).toContain('postgres');
    });

    it('contains all 10 requested infrastructure platforms', () => {
      const infra = EXPANDED_COMPONENTS.filter((c) => c.category === 'Infrastructure').map(
        (c) => c.label
      );
      const expected = [
        'AWS',
        'Azure',
        'Google Cloud',
        'Docker',
        'Kubernetes',
        'Nginx',
        'Terraform',
        'Cloudflare',
        'Vercel',
        'GitHub Actions',
      ];
      for (const item of expected) {
        expect(infra).toContain(item);
      }
    });

    it('contains all 6 requested messaging and monitoring technologies', () => {
      const msg = EXPANDED_COMPONENTS.filter(
        (c) => c.category === 'Messaging & Monitoring'
      ).map((c) => c.label);
      const expected = [
        'Kafka',
        'RabbitMQ',
        'Prometheus',
        'Grafana',
        'OpenTelemetry',
        'Jaeger',
      ];
      for (const item of expected) {
        expect(msg).toContain(item);
      }
    });

    it('contains all 7 requested security components', () => {
      const security = EXPANDED_COMPONENTS.filter((c) => c.category === 'Security').map(
        (c) => c.label
      );
      const expected = [
        'OAuth 2.0',
        'OpenID Connect',
        'Keycloak',
        'Auth0',
        'JWT',
        'WAF',
        'Secrets Manager',
      ];
      for (const item of expected) {
        expect(security).toContain(item);
      }
    });

    it('contains all 10 requested networking components', () => {
      const net = EXPANDED_COMPONENTS.filter((c) => c.category === 'Networking').map(
        (c) => c.label
      );
      const expected = [
        'Browser',
        'Client',
        'DNS',
        'CDN',
        'API Gateway',
        'Load Balancer',
        'Web Server',
        'Microservice',
        'Queue',
        'Object Storage',
      ];
      for (const item of expected) {
        expect(net).toContain(item);
      }
    });
  });

  describe('Requirement 3: Technology Stack Presets', () => {
    it('has all required presets', () => {
      expect(TECHNOLOGY_STACK_PRESETS.length).toBeGreaterThanOrEqual(17);
      const presetNames = TECHNOLOGY_STACK_PRESETS.map((p) => p.name);
      expect(presetNames).toContain('MERN Stack');
      expect(presetNames).toContain('MEAN Stack');
      expect(presetNames).toContain('MEVN Stack');
      expect(presetNames).toContain('LAMP Stack');
      expect(presetNames).toContain('Laravel + MySQL');
      expect(presetNames).toContain('T3 Stack');
      expect(presetNames).toContain('FARM Stack');
      expect(presetNames).toContain('Django + PostgreSQL');
      expect(presetNames).toContain('FastAPI + PostgreSQL');
      expect(presetNames).toContain('Java + Spring Boot + PostgreSQL/MySQL');
      expect(presetNames).toContain('Angular + Java/Spring Boot');
      expect(presetNames).toContain('ASP.NET Core + SQL Server');
      expect(presetNames).toContain('Ruby on Rails + PostgreSQL');
      expect(presetNames).toContain('Next.js + Node.js + PostgreSQL');
      expect(presetNames).toContain('JAMstack');
      expect(presetNames).toContain('Serverless Cloud (AWS/Azure/GCP)');
      expect(presetNames).toContain('Docker + Kubernetes Microservices');
      expect(presetNames).toContain('Event-Driven Architecture with Kafka');
    });

    it('instantiates presets with editable independent nodes and wired edges', () => {
      const mern = TECHNOLOGY_STACK_PRESETS.find((p) => p.id === 'stack-mern')!;
      const { nodes, edges } = instantiateStackPreset(mern, { x: 100, y: 100 });

      expect(nodes.length).toBe(4);
      expect(edges.length).toBe(3);

      // Verify all node IDs are unique
      const ids = new Set(nodes.map((n) => n.id));
      expect(ids.size).toBe(nodes.length);

      // Verify node types and labels
      const labels = nodes.map((n) => n.data.label);
      expect(labels).toContain('React Frontend');
      expect(labels).toContain('Express / Node.js API');
      expect(labels).toContain('MongoDB Database');
      expect(labels).toContain('Redis Cache');

      // Verify edges connect the nodes
      for (const edge of edges) {
        expect(ids.has(edge.source)).toBe(true);
        expect(ids.has(edge.target)).toBe(true);
      }
    });

    it('clearly flags optional and configurable technologies', () => {
      const t3 = TECHNOLOGY_STACK_PRESETS.find((p) => p.id === 'stack-t3')!;
      const optionalNodes = t3.nodes.filter((n) => n.isOptional);
      expect(optionalNodes.length).toBeGreaterThan(0);
      expect(optionalNodes.some((n) => n.label.includes('NextAuth'))).toBe(true);
    });

    it('adds presets into canvas store with a single history entry and supports undo/redo', () => {
      const mern = TECHNOLOGY_STACK_PRESETS.find((p) => p.id === 'stack-mern')!;
      const { nodes, edges } = instantiateStackPreset(mern, { x: 200, y: 200 });

      useCanvasStore.getState().addElements(nodes, edges);
      useCanvasStore.getState().pushHistory();

      const state = useCanvasStore.getState();
      expect(state.nodes.length).toBe(4);
      expect(state.edges.length).toBe(3);

      // Undo removes all added preset elements, restoring baseline
      useCanvasStore.getState().undo();
      const undone = useCanvasStore.getState();
      expect(undone.nodes.length).toBe(0);
      expect(undone.edges.length).toBe(0);

      // Redo restores all preset elements
      useCanvasStore.getState().redo();
      const redone = useCanvasStore.getState();
      expect(redone.nodes.length).toBe(4);
      expect(redone.edges.length).toBe(3);
    });
  });

  describe('Requirement 4: Popular Apps & Services', () => {
    it('contains all 10 service categories', () => {
      expect(POPULAR_SERVICE_CATEGORIES).toEqual([
        'AI',
        'Google',
        'Messaging',
        'Social',
        'Media',
        'Commerce & Payments',
        'Mobility & Delivery',
        'Developer Tools',
        'Cloud & Platforms',
        'Identity & Analytics',
      ]);
    });

    it('contains all required recognizable services', () => {
      const names = POPULAR_SERVICES.map((s) => s.name);
      const expected = [
        'ChatGPT',
        'Gemini',
        'Claude',
        'Google Search',
        'Gmail',
        'YouTube',
        'Google Drive',
        'WhatsApp',
        'Telegram',
        'Discord',
        'Slack',
        'Instagram',
        'Facebook',
        'X',
        'LinkedIn',
        'Reddit',
        'Netflix',
        'Spotify',
        'Twitch',
        'Amazon',
        'Shopify',
        'Stripe',
        'Razorpay',
        'Uber',
        'Gojek',
        'DoorDash',
        'GitHub',
        'GitLab',
        'npm',
        'Docker Hub',
        'AWS',
        'Azure',
        'Google Cloud',
        'Cloudflare',
        'Vercel',
        'Auth0',
        'Firebase',
        'Supabase',
        'Sentry',
        'PostHog',
      ];
      for (const name of expected) {
        expect(names).toContain(name);
      }
    });
  });

  describe('Requirement 5: Offline Local SVG Icons', () => {
    it('has local SVG icon definitions for all expanded components', () => {
      for (const comp of EXPANDED_COMPONENTS) {
        expect(hasTechIcon(comp.customIcon)).toBe(true);
        const def = getTechIconDef(comp.customIcon);
        expect(def).toBeDefined();
        expect(def?.path.length).toBeGreaterThan(10);
      }
    });

    it('has local SVG icon definitions for all popular services', () => {
      for (const service of POPULAR_SERVICES) {
        expect(hasTechIcon(service.customIcon)).toBe(true);
        const def = getTechIconDef(service.customIcon);
        expect(def).toBeDefined();
        expect(def?.path.length).toBeGreaterThan(10);
      }
    });

    it('safely handles unknown icons with undefined for fallback handling', () => {
      expect(hasTechIcon('unknown-random-icon-xyz')).toBe(false);
      const def = getTechIconDef('unknown-random-icon-xyz');
      expect(def).toBeUndefined();
    });
  });

  describe('Requirement 1 & 6: Node Resizing & Serialization Schema Compatibility', () => {
    it('allows system node dimensions to shrink below 100x40px', () => {
      const node = createSystemNode('server', { x: 10, y: 10 });
      // Setting smaller dimensions
      node.style = { width: 75, height: 35 };

      useCanvasStore.getState().addNode(node);
      const retrieved = useCanvasStore.getState().nodes.find((n) => n.id === node.id);
      expect(retrieved?.style?.width).toBe(75);
      expect(retrieved?.style?.height).toBe(35);
    });

    it('validates node data with customIcon, color, and techStack with SystemNodeDataSchema', () => {
      const rawData = {
        label: 'FastAPI Service',
        nodeType: 'service',
        customIcon: 'fastapi',
        color: '#009688',
        techStack: ['Python', 'Uvicorn'],
        description: 'Modern, fast web framework for building APIs with Python',
        status: 'operational',
      };

      const parsed = SystemNodeDataSchema.safeParse(rawData);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.customIcon).toBe('fastapi');
        expect(parsed.data.color).toBe('#009688');
        expect(parsed.data.techStack).toEqual(['Python', 'Uvicorn']);
      }
    });

    it('preserves dimensions across undo/redo cycle', () => {
      const node = createSystemNode('database', { x: 50, y: 50 });
      node.style = { width: 140, height: 50 };
      useCanvasStore.getState().setNodes([node]);
      useCanvasStore.getState().pushHistory();

      // Current history has initial state with width: 140
      expect(useCanvasStore.getState().nodes[0].style?.width).toBe(140);

      // Simulate resizing the node and pushing history
      useCanvasStore.setState({
        nodes: [{ ...node, style: { width: 80, height: 34 } }],
      });
      useCanvasStore.getState().pushHistory();

      expect(useCanvasStore.getState().nodes[0].style?.width).toBe(80);
      expect(useCanvasStore.getState().nodes[0].style?.height).toBe(34);

      // Undo restores previous dimensions
      useCanvasStore.getState().undo();
      expect(useCanvasStore.getState().nodes[0].style?.width).toBe(140);
      expect(useCanvasStore.getState().nodes[0].style?.height).toBe(50);

      // Redo restores new resized dimensions
      useCanvasStore.getState().redo();
      expect(useCanvasStore.getState().nodes[0].style?.width).toBe(80);
      expect(useCanvasStore.getState().nodes[0].style?.height).toBe(34);
    });
  });
});
