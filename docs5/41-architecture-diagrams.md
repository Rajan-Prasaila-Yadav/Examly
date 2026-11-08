# Architecture diagrams

```mermaid
sequenceDiagram
  participant UI as Next.js UI
  participant API as Fastify
  participant DB as PostgreSQL
  UI->>API: authenticated /api/v1 request
  API->>API: JWT and RBAC
  API->>DB: Prisma operation
  DB-->>API: result
  API-->>UI: JSON response
```
