# Real architecture

```mermaid
flowchart LR
  Web[Next.js] --> API[Fastify /api/v1]
  API --> Guard[JWT + RBAC]
  API --> Prisma
  Prisma --> Postgres[(PostgreSQL)]
  API --> Queue[BullMQ / Redis]
```
