# 21 — Database Workflow & CLI Migrations

Examly enforces a **CLI-driven database workflow**. Developers and CI pipelines never manually manipulate live SQL tables; all schema evolution occurs through Prisma migrations.

---

## 21.1 Local Development Setup (Docker Compose)

A standard local development environment is initialized with Docker:

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: examly_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
      POSTGRES_DB: examly_dev
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: examly_redis
    restart: unless-stopped
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 21.2 Migration Commands & Database Seeding

```bash
# 1. Start local database services
docker-compose up -d

# 2. Navigate to database package
cd database

# 3. Create a new migration after editing any .prisma schema file
npx prisma migrate dev --name add_new_feature

# 4. Generate the latest Prisma Client types
npx prisma generate

# 5. Seed the database with Super Admin and standard Nepal role matrices
npx prisma db seed

# 6. Open interactive visual GUI
npx prisma studio
```
