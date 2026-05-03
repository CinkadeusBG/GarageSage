# docker/api.Dockerfile
# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=libs/prisma/schema.prisma

# Build NestJS API
RUN npx nx build api --prod

# Build Angular frontend (served as static files by NestJS)
RUN npx nx build frontend --prod

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built API
COPY --from=builder /app/dist/apps/api ./

# Copy Angular build into a known path for ServeStaticModule
COPY --from=builder /app/dist/apps/frontend/browser ./frontend

# Copy node_modules (production only)
COPY --from=builder /app/node_modules ./node_modules

# Copy Prisma schema for migrations
COPY --from=builder /app/libs/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3000

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node main.js"]
