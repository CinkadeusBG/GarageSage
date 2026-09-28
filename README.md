# GarageSage 🔧

> Self-hosted car maintenance tracker — built for your home server, NAS, or any Docker host.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Stack](https://img.shields.io/badge/stack-Angular%2018%20%2B%20NestJS%20%2B%20PostgreSQL-informational)

---

## What is GarageSage?

GarageSage is a private, fully self-hosted alternative to cloud-based vehicle maintenance apps (like LubeLogger or FIXD). It runs entirely on your own hardware — no subscriptions, no telemetry, no third-party cloud.

**Key features:**
- Track multiple vehicles (make, model, year, VIN, mileage, photo)
- Log maintenance services with cost, shop, attachments
- Time- and mileage-based service reminders
- Cost reports with charts + CSV export

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Angular 18, PrimeNG (Aura theme), PrimeFlex |
| Backend | NestJS (TypeScript), Prisma ORM |
| Database | PostgreSQL 16 |
| Infrastructure | Docker Compose, single-command startup |
| Monorepo | Nx workspace |

---

## Quick start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker + Compose on Linux)
- [Node.js 20+](https://nodejs.org/) (for local development)
- 1 GB RAM minimum

### Production (single command)

```bash
git clone https://github.com/Cinkadeus/GarageSage
cd GarageSage
cp .env.example .env        # edit .env — set DB_PASSWORD and JWT_SECRET
docker compose up -d
```

Open **http://localhost:3000** and register your first account.

---

### Development

```bash
# 1. Install dependencies
npm install

# 2. Start only the database
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db

# 3. Run DB migrations
npm run db:migrate -- --name init

# 4. Generate Prisma client
npm run db:generate

# 5. Start both servers with hot-reload
npm run dev
# API  → http://localhost:3000   (Swagger: http://localhost:3000/api/docs)
# App  → http://localhost:4200
```

---

## Project structure

```
GarageSage/
├── apps/
│   ├── api/            # NestJS REST API
│   └── frontend/       # Angular 18 SPA
├── libs/
│   ├── prisma/         # PrismaService + schema.prisma
│   └── shared/         # Shared DTOs (used by both api and frontend)
├── docker/
│   ├── api.Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── docker-compose.dev.yml
└── .env.example
```

---

## Environment variables

Copy `.env.example` to `.env` and set at minimum:

| Variable | Description |
|---|---|
| `DB_PASSWORD` | PostgreSQL password (required) |
| `JWT_SECRET` | JWT signing secret — at least 32 random chars |

Generate a strong JWT secret:
```bash
# Linux / macOS
openssl rand -base64 48

# Windows PowerShell
[Convert]::ToBase64String((1..48 | % { [byte](Get-Random -Max 256) }))
```

---

## Roadmap

- [x] Core CRUD — vehicles, maintenance, reminders
- [x] Dashboard with summary stats
- [x] JWT auth with multi-user support
- [x] Reports — monthly cost charts, cost-by-type, CSV export
- [x] Docker Compose full production setup
- [ ] PWA / offline support (Angular Service Worker)
- [ ] Push notifications for overdue reminders
- [ ] VIN decoder (NHTSA free API)
- [x] Dark mode
- [ ] Mobile-optimised garage view

---

## License

MIT — do whatever you like with it.
