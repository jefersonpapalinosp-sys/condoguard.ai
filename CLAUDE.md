# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CondoGuard.AI is a full-stack SaaS platform for condominium building management, featuring real-time monitoring, AI-powered chat assistant, and multi-tenant support. The frontend is React + TypeScript (Vite), the backend is FastAPI (Python), and the primary database is Oracle with a mock/in-memory fallback for development.

## Commands

### Development
```bash
npm install            # Install frontend dependencies
npm run dev            # React dev server (port 3000)
npm run api:dev        # FastAPI with hot reload (port 4000)
npm run api:dev:mock   # FastAPI with mock database (no Oracle needed)
npm run api:dev:oracle # FastAPI with Oracle database
```

### Build & Lint
```bash
npm run lint    # TypeScript type check
npm run check   # lint + build
npm run build   # Production Vite build
npm run clean   # Remove dist/
```

### Testing
```bash
npm run test              # Frontend unit/component tests (Vitest)
npm run test:unit         # Unit tests only
npm run test:component    # Component tests only
npm run test:integration  # Integration tests
npm run test:e2e          # Playwright E2E (starts both servers)
npm run test:e2e:headed   # E2E with visible browser
npm run test:py           # Backend pytest suite
npm run test:api          # API parity tests
npm run test:contract     # Contract endpoint tests
npm run test:coverage     # Coverage report (75% threshold enforced)
npm run test:all          # Full suite (frontend + backend + E2E)
```

### Database Migrations
```bash
npm run db:migrate:flyway  # Run Flyway migrations on Oracle
```

## Architecture

### Frontend (`src/`)
- **Entry**: `src/main.tsx` → `src/App.tsx` → `src/app/AppProviders.tsx`
- **Routing**: `src/app/router/AppRouter.tsx` wraps `BrowserRouter` + `AuthProvider`
- **Feature modules**: `src/features/<domain>/` — each domain (auth, dashboard, alerts, contracts, invoices, chat, management, cadastros, consumption, reports, settings, observability) contains pages, components, hooks, and context
- **Service layer**: `src/services/` — one service file per domain; all call through `src/services/http.ts`
- **HTTP client** (`src/services/http.ts`): Injects JWT automatically, 8s timeout, 2 auto-retries on 5xx, and falls back to mock data via `fallbackPolicy.ts` when the API is unreachable
- **Fallback**: In `dev`, mock fallback is automatic; in `hml`/`prod`, it requires explicit opt-in via `VITE_ENABLE_MOCK_FALLBACK=true`

### Backend (`backend/app/`)
- **Entry**: `backend/app/main.py` — registers middleware stack and mounts routers
- **Middleware order**: Security headers → CORS allowlist → Rate limiting → Observability metrics
- **Routers**: `api/routes.py` (main, ~24 endpoints), `api/contracts_module_routes.py`, `api/enel_integration_routes.py`
- **Repository pattern**: `repositories/` — 18 files, one per domain. Each repository transparently supports `DB_DIALECT=oracle` (connection pool via `db/oracle_client.py`) or `DB_DIALECT=mock` (in-memory JSON data from `backend/data/`)
- **Security**: JWT-based auth (`core/security.py`) with RBAC roles (`admin`, `sindico`, `morador`). OIDC is optional (`AUTH_PROVIDER=oidc`). Audit events logged via `audit/security_audit.py`
- **AI/Chat**: `repositories/chat_repo.py` uses Google Gemini (`@google/genai`). Context is built in `services/chat_context_service.py` with condominium-specific data injection

### Database (`database/`)
- Flyway migrations at `database/flyway/sql/` (V001–V010) target Oracle
- Development uses mock in-memory data from `backend/data/*.json`

### Data Flow
```
React Component → Service (src/services/) → http.ts (JWT, retry, fallback)
  → FastAPI Router → Middleware → Repository
  → [oracle|mock] → Response JSON → Component state
```

## Environment Setup

Copy `.env.example` to `.env.local`. Key variables:

| Variable | Purpose |
|---|---|
| `DB_DIALECT` | `oracle` or `mock` (use `mock` for local dev) |
| `VITE_API_BASE_URL` | Frontend → backend URL (default: `http://localhost:4000`) |
| `VITE_APP_ENV` | `dev`, `hml`, or `prod` — controls fallback policy |
| `JWT_SECRET` | Must be changed for any non-local environment |
| `GEMINI_API_KEY` | Required for AI chat features |
| `AUTH_PROVIDER` | `local_jwt` (default) or `oidc` |

### Default Dev Credentials
- `admin@condoguard.ai` / `password123` — full access
- `sindico@condoguard.ai` / `password123` — facilities manager
- `morador@condoguard.ai` / `password123` — resident

## Key Patterns

- **Repository switching**: Set `DB_DIALECT` env var; no code changes needed. Each repository checks this at import time.
- **Coverage thresholds**: Vitest enforces 65–75% coverage on critical paths. `npm run test:coverage` will fail if thresholds are not met.
- **RBAC decorators**: Use role guards in `backend/app/core/security.py` to protect new endpoints.
- **Observability**: New endpoints are automatically instrumented by the observability middleware in `main.py`. Metrics are exposed at `GET /api/observability/metrics`.
