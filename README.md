# Caching Research Project

This repository is a practical playground for measuring caching behavior across:

- Backend API + PostgreSQL queries
- Redis response caching
- Next.js SSR/CSR data fetching
- Client-side query caching (React Query)

The app serves paginated product data and exposes timing metrics to compare cache strategies.

## Repository Layout

- `backend/` Express API, PostgreSQL query, optional Redis cache
- `frontend/` Next.js app to test SSR vs client rendering and cache modes
- `benchmark/` Script that runs repeated API calls over multiple page/limit scenarios
- `generated_test_data_dump.sql` Optional SQL dump for pre-generated dataset

## Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL 14+
- Redis 6+ (optional, required only when `REDIS_CACHE=on`)

## 1) Backend Setup

### Install dependencies

```bash
cd backend
npm install
```

### Configure environment

Copy the example file and adjust values if needed.

Bash:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Default backend environment variables:

```env
PORT=5001
DB_USER=postgres
DB_HOST=localhost
DB_NAME=caching_research
DB_PASSWORD=
DB_PORT=5432
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
TTL=3600
REDIS_CACHE=off
```

### Create and seed the database

From the repository root, create the database and schema.

```bash
createdb caching_research
psql -U postgres -d caching_research -f backend/schema.sql
```

Then seed data:

```bash
cd backend
node seed.js
```

Optional: instead of schema + seed, import the pre-generated dump:

```bash
psql -U postgres -d caching_research -f generated_test_data_dump.sql
```

### Run backend

```bash
cd backend
npm run dev
```

API base URL: `http://localhost:5001`

Health check:

- `GET /health`

Products endpoint:

- `GET /api/products?page=1&limit=25`

## 2) Frontend Setup

### Install dependencies

```bash
cd frontend
npm install
```

### Configure environment

Bash:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Frontend variables:

```env
NEXT_PUBLIC_IS_SSR=true
NEXT_PUBLIC_IS_CACHE=true
```

### Run frontend

```bash
cd frontend
npm run dev
```

App URL: `http://localhost:3000`

## 3) Benchmark Setup and Run

The benchmark script calls `http://localhost:5001/api/products` for multiple `(page, limit)` scenarios and repeats each scenario 20 times.

Before running benchmark:

- backend must be running
- Redis should be enabled/disabled according to the experiment you want

Run from `benchmark/`:

```bash
cd benchmark
node --experimental-default-type=module benchmark.js
```

Results are written to:

- `benchmark/results/products_page*_limit*.txt`
- `benchmark/results/summary_report.txt`

## Experiment Modes

Use these toggles to compare behavior:

- Backend Redis cache:
  - `backend/.env` -> `REDIS_CACHE=on|off`
- Frontend rendering mode:
  - `frontend/.env` -> `NEXT_PUBLIC_IS_SSR=true|false`
- Frontend fetch/query cache:
  - `frontend/.env` -> `NEXT_PUBLIC_IS_CACHE=true|false`

Suggested matrix:

1. SSR + frontend cache on + Redis on
2. SSR + frontend cache off + Redis on
3. CSR + React Query cache on + Redis on
4. CSR + React Query cache off + Redis on
5. Repeat all with `REDIS_CACHE=off`

## Returned Metrics (API)

`GET /api/products` returns:

- `metrics.backendProcessingTime` total backend request time (ms)
- `metrics.dbTime` PostgreSQL query time (ms, null on Redis hit)
- `metrics.redisHit` whether Redis served the response
- `metrics.cacheStrategy` backend strategy label (`Redis Only` or `None`)
- `metrics.timestamp` server timestamp

## Frontend Performance Notes

The table view tracks browser-side metrics in `localStorage` under `perf_metrics`:

- `NDVT_LOAD` initial load timing
- `NDVT_NAV` same-route navigation timing
- `RTLT` route-to-route navigation timing (`/test` -> `/`)

Use the `Clear` button in the UI to reset collected browser metrics.

## Troubleshooting

- Frontend cannot fetch data:
  - Ensure backend is running on port `5001`
  - Ensure CORS/network access to `http://localhost:5001`
- Redis errors:
  - Set `REDIS_CACHE=off` to run without Redis
  - Confirm Redis host/port matches backend `.env`
- Build command on Windows:
  - `frontend/package.json` uses `rm -rf .next` in `npm run build`
  - Run in Git Bash/WSL, or replace with a cross-platform cleaner (for example `rimraf`)
