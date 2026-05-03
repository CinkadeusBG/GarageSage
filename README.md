# GarageSage 🔧

> Self-hosted car maintenance tracker with AI — built for your home server, NAS, or any Docker host.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Stack](https://img.shields.io/badge/stack-Angular%2018%20%2B%20NestJS%20%2B%20PostgreSQL%20%2B%20Ollama-informational)

---

## What is GarageSage?

GarageSage is a private, fully self-hosted alternative to cloud-based vehicle maintenance apps (like LubeLogger or FIXD). It runs entirely on your own hardware — no subscriptions, no telemetry, no third-party cloud.

**Key features:**
- Track multiple vehicles (make, model, year, VIN, mileage, photo)
- Log maintenance services with cost, shop, attachments
- Log fuel fill-ups with automatic MPG / L/100km calculation
- Time- and mileage-based service reminders
- Cost reports with charts + CSV export
- AI assistant (Ollama RAG) — ask natural-language questions about your own data

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Angular 18, PrimeNG (Aura theme), PrimeFlex |
| Backend | NestJS (TypeScript), Prisma ORM |
| Database | PostgreSQL 16 + pgvector extension |
| AI / LLM | Ollama (phi4-mini / llama3.2:3b), nomic-embed-text embeddings |
| Infrastructure | Docker Compose, single-command startup |
| Monorepo | Nx workspace |

---

## Quick start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker + Compose on Linux)
- [Node.js 20+](https://nodejs.org/) (for local development)
- 4 GB RAM minimum (8 GB recommended for LLM inference)

### Production (single command)

```bash
git clone https://github.com/Cinkadeus/GarageSage
cd GarageSage
cp .env.example .env        # edit .env — set DB_PASSWORD and JWT_SECRET
docker compose up -d
```

On first run, pull the AI model (one-time, ~2 GB):
```bash
docker compose exec ollama ollama pull phi4-mini
docker compose exec ollama ollama pull nomic-embed-text
```

Open **http://localhost:3000** and register your first account.

---

### Development

```bash
# 1. Install dependencies
npm install

# 2. Start only the infrastructure (DB + Ollama)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db ollama

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
| `OLLAMA_MODEL` | LLM model name (default: `phi4-mini`) |
| `OLLAMA_EMBED_MODEL` | Embedding model (default: `nomic-embed-text`) |

Generate a strong JWT secret:
```bash
# Linux / macOS
openssl rand -base64 48

# Windows PowerShell
[Convert]::ToBase64String((1..48 | % { [byte](Get-Random -Max 256) }))
```

---

## AI assistant

GarageSage uses Retrieval-Augmented Generation (RAG):

1. Every maintenance log is embedded via `nomic-embed-text` and stored in PostgreSQL using the `pgvector` extension.
2. When you ask a question, the query is embedded and the most relevant log entries are retrieved by cosine similarity.
3. Those records are injected as context into the local LLM (phi4-mini) — no data ever leaves your machine.

**Supported models** (swap via `OLLAMA_MODEL` env var):
- `phi4-mini` — recommended, 3.8B, fast on CPU
- `llama3.2:3b` — good alternative
- `gemma3:4b` — slightly larger, more capable

---

## Roadmap

- [x] Core CRUD — vehicles, maintenance, fuel, reminders
- [x] Dashboard with summary stats and AI suggestions
- [x] JWT auth with multi-user support
- [x] Reports — monthly cost charts, cost-by-type, fuel trend, CSV export
- [x] AI chat (Ollama RAG) with natural-language queries
- [x] Docker Compose full production setup
- [ ] PWA / offline support (Angular Service Worker)
- [ ] Push notifications for overdue reminders
- [ ] VIN decoder (NHTSA free API)
- [ ] Dark mode toggle
- [ ] Mobile-optimised garage view

---

## License

MIT — do whatever you like with it.
