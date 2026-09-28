# docker/api.Dockerfile
# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
# Lockfile matches npm 11. Node 20 ships npm 10, which rejects it.
# Cap registry sockets so a wide fan-out does not stall in CLOSE_WAIT.
RUN npm install -g npm@11.11.0 \
 && npm config set maxsockets 3 \
 && npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm ci --no-audit --no-fund

COPY . .

ENV NX_DAEMON=false

# Prisma picks its query-engine binary from the openssl version it can detect.
RUN apk add --no-cache openssl

# Generate Prisma client. The URL is only read at generate time; runtime uses the real one.
RUN DATABASE_URL="postgresql://garagesage:build@localhost:5432/garagesage" \
    npx prisma generate --schema=libs/prisma/schema.prisma

# Build NestJS API and the Angular app it serves
RUN npx nx build api
RUN npx nx build frontend --configuration=production

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl libc6-compat

# Copy built API
COPY --from=builder /app/dist/apps/api ./

# Copy Angular build next to main.js (served from /app/frontend)
COPY --from=builder /app/dist/apps/frontend/browser ./frontend

# Copy node_modules (production only)
COPY --from=builder /app/node_modules ./node_modules

# Copy Prisma schema and migrations
COPY --from=builder /app/libs/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/libs/prisma/migrations ./prisma/migrations
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3000

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node main.js"]
