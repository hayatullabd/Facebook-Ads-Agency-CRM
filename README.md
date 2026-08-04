# AdFlow Pro

A B2B agency CRM built with React, Tailwind CSS, FastAPI, Beanie, MongoDB Atlas, Celery, and Redis. It manages agency users, clients, ad requests, campaigns, billing, wallet transactions, client updates, and Meta Ads synchronization.

## Requirements

- Python 3.12+
- Node.js 20+
- MongoDB Atlas or a transaction-capable MongoDB replica set
- Redis for Celery workers and scheduled Meta synchronization

## Backend Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
Copy-Item .env.example .env
```

Configure `backend/.env` with deployment-specific values. Production requires:

- `ENVIRONMENT=production`
- `MONGODB_URI`: MongoDB Atlas or replica-set URI
- `MONGODB_DATABASE`: application database name
- `JWT_SECRET`: an explicit cryptographically random secret of at least 32 characters
- `FACEBOOK_TOKEN_ENCRYPTION_KEY`: a separate explicit random secret of at least 32 characters
- `CORS_ORIGINS`: comma-separated frontend origins
- `REDIS_URL`: Redis connection URL for Celery
- `ALLOW_PUBLIC_REGISTRATION=false` unless public tenant signup is intentional

Start the API:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload
```

Start the Celery worker in another terminal:

```powershell
cd backend
.\.venv\Scripts\python.exe -m celery -A app.workers.celery_app:celery_app worker --loglevel=INFO --pool=solo
```

Start Celery Beat for hourly Meta synchronization:

```powershell
cd backend
.\.venv\Scripts\python.exe -m celery -A app.workers.celery_app:celery_app beat --loglevel=INFO
```

The Windows helpers `run-api.bat`, `run-worker.bat`, and `run-beat.bat` provide equivalent commands when Python is already available on `PATH`.

## Frontend Setup

```powershell
cd frontend
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

Development can use:

```env
VITE_API_URL=http://localhost:5001/api
VITE_PUBLIC_BASE=/
```

Production builds require an absolute API URL:

```env
VITE_API_URL=https://api.example.com/api
```

Build the frontend:

```powershell
cd frontend
npm.cmd run build
```

Serve `frontend/dist` from a static host. Unknown browser routes must resolve to `index.html` for React Router.

## Verification

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m compileall -q app

cd ..\frontend
$env:VITE_API_URL="https://api.example.com/api"
npm.cmd run build
```

## Production Processes

Deploy three separate backend processes using the same backend code and environment:

- API: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Worker: `python -m celery -A app.workers.celery_app:celery_app worker --loglevel=INFO`
- Scheduler: `python -m celery -A app.workers.celery_app:celery_app beat --loglevel=INFO`

Use `/health/live` for liveness and `/health/ready` for readiness checks. The API uses `/api` as its route prefix and Bearer JWT authentication.

MongoDB must support transactions because wallet balance and transaction ledger writes are atomic. Redis is required for Meta sync enqueueing, workers, and hourly scheduling. Actual `.env` files, generated frontend builds, Python caches, and virtual environments must not be committed.
