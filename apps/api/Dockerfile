# Multi-stage Dockerfile for Examly High-Performance Fastify API
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY database/ ./database/
COPY apps/api/ ./apps/api/

RUN npm ci --workspace=@examly/api
RUN npx prisma generate --schema=database/prisma/schema
RUN npm run build --workspace=@examly/api

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json

USER node
EXPOSE 4000

CMD ["node", "dist/main.js"]
