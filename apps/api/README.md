# @drawzware/api — Drawzware Collaboration REST API

The Drawzware API is a lightweight, function-based Node.js, TypeScript, and Express service providing collaboration, workspace management, and diagram synchronization backed by MongoDB via Mongoose.

---

## 1. Architectural Principles

1. **Client-First Invariant:** Core diagramming and canvas functionality in `@drawzware/web` remains 100% offline-first. This API service is an optional collaboration and remote workspace persistence layer.
2. **Function-Based & Class-Free:** Following the studio's Caveman approach, all logic uses pure async functions, named exports, and straightforward controllers and services without unnecessary OOP classes or abstraction bloat.
3. **Layered Separation of Concerns:**
   - **Routes** (`src/routes/`): Declarative HTTP routing, parameter binding, and middleware chains.
   - **Controllers** (`src/controllers/`): HTTP request parsing, status codes, and JSON response formatting.
   - **Services** (`src/services/`): Business logic, domain rules, role validations, and error throwing.
   - **Repositories** (`src/repositories/`): Pure database queries and Mongoose persistence operations.
   - **Models** (`src/models/`): Mongoose schemas and typed model definitions.
   - **Middleware** (`src/middleware/`): Standard JWT authentication, workspace role enforcement, Zod validation, 404 handling, and centralized error reporting.
   - **Config** (`src/config/`): Minimal, standard MongoDB connection lifecycle (`db.ts`).

---

## 2. Directory Structure

```text
apps/api/
├── src/
│   ├── config/
│   │   └── db.ts                 # MongoDB connection & disconnection
│   ├── models/                   # Mongoose schemas and models
│   │   ├── user.model.ts
│   │   ├── workspace.model.ts
│   │   ├── workspace-member.model.ts
│   │   ├── workspace-invitation.model.ts
│   │   ├── diagram.model.ts
│   │   └── diagram-snapshot.model.ts
│   ├── repositories/             # Direct database query layer
│   │   ├── user.repository.ts
│   │   ├── workspace.repository.ts
│   │   ├── workspace-member.repository.ts
│   │   ├── workspace-invitation.repository.ts
│   │   └── diagram.repository.ts
│   ├── services/                 # Pure business logic layer
│   │   ├── auth.service.ts
│   │   ├── workspace.service.ts
│   │   └── diagram.service.ts
│   ├── controllers/              # HTTP request & response handlers
│   │   ├── auth.controller.ts
│   │   ├── workspace.controller.ts
│   │   └── diagram.controller.ts
│   ├── routes/                   # Express route definitions
│   │   ├── auth.routes.ts
│   │   ├── workspace.routes.ts
│   │   └── diagram.routes.ts
│   ├── middleware/
│   │   ├── auth.ts               # Standard JWT token verification
│   │   ├── workspace-auth.ts     # Role-based workspace authorization
│   │   ├── validate.ts           # Zod schema request body validation
│   │   ├── not-found.ts          # Centralized 404 handler
│   │   └── error-handler.ts      # Centralized 500 error handler
│   ├── types/
│   │   └── express.d.ts          # Express Request declaration merging
│   ├── app.ts                    # Express app & middleware configuration
│   └── server.ts                 # Database connection & HTTP server entrypoint
├── tests/                        # API integration and contract tests
├── .env.example                  # Environment configuration template
├── eslint.config.js              # ESLint flat configuration
├── package.json
└── tsconfig.json
```

---

## 3. Environment Configuration

Copy `.env.example` to `.env` in `apps/api/`:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port on which Express listens |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/drawzware` | MongoDB connection URI (supports Atlas) |
| `JWT_SECRET` | `drawzware-local-development-secret` | Secret key for JWT verification |
| `WEB_ORIGIN` | `http://localhost:3000` | Allowed CORS origin for web app |

---

## 4. API Endpoints

### System & Authentication
- `GET /api/health` — Health check endpoint.
- `GET /api/me` — Return claims for current authenticated user.

### Workspaces & Memberships
- `POST /api/workspaces` — Create a new workspace (creator becomes `owner`).
- `GET /api/workspaces` — List workspaces accessible to current user.
- `GET /api/workspaces/:workspaceId` — Get workspace details (requires membership).
- `GET /api/workspaces/:workspaceId/members` — List members of a workspace.
- `POST /api/workspaces/:workspaceId/invitations` — Invite a user by email (`owner` only).
- `POST /api/invitations/:invitationId/accept` — Accept a pending workspace invitation.

### Diagrams
- `GET /api/workspaces/:workspaceId/diagrams` — List diagrams in a workspace.
- `POST /api/workspaces/:workspaceId/diagrams` — Create diagram metadata (`owner` or `editor`).
- `POST /api/workspaces/:workspaceId/diagrams/import` — Explicit non-destructive import of local diagram.
- `GET /api/diagrams/:diagramId` — Retrieve diagram metadata and latest snapshot.
- `PATCH /api/diagrams/:diagramId` — Update diagram title or type (`owner` or `editor`).

---

## 5. Development & Testing

```bash
# Start in watch mode
npm run dev --workspace=@drawzware/api

# Run TypeScript compilation
npm run build --workspace=@drawzware/api

# Run tests
npm test
```
