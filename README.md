# Examly

Enterprise Examination & Learning Platform.

## Architecture
This project is a monorepo containing:
- **apps/web**: Next.js 14 frontend application (Student & Admin dashboards).
- **apps/api**: NestJS backend API with Prisma ORM and PostgreSQL.
- **database**: Prisma schema, migrations, and seed scripts.

## Getting Started

### Prerequisites
- Node.js
- PostgreSQL

### Installation
```bash
npm install
```

### Database Setup
```bash
cd database
npx prisma generate
npx prisma migrate dev
```

### Running Locally
To run the backend API:
```bash
npm run dev --workspace=@examly/api
```

To run the frontend:
```bash
npm run dev --workspace=@examly/web
```
