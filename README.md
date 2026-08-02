# Facebook Ads Agency CRM

A MERN CRM for managing clients, ad requests, campaigns, billing, updates, and agency settings.

## Requirements

- Node.js 18+
- MongoDB

## Install

```bash
cd frontend
npm install
cd ../backend
npm install
```

## Environment

Copy `backend/.env.example` to `backend/.env` and provide deployment-specific values. Production requires:

- `NODE_ENV=production`
- `MONGODB_URI`: the MongoDB connection URI
- `JWT_SECRET`: a cryptographically random, non-placeholder secret of at least 32 characters
- `CLIENT_URL`: the exact allowed frontend origin; comma-separated origins are supported
- `PORT`: API listening port
- `TRUST_PROXY=true` only when deployed behind a trusted reverse proxy
- `FACEBOOK_REQUEST_TIMEOUT_MS`: optional timeout for Facebook API requests
- `SHUTDOWN_TIMEOUT_MS`: optional graceful shutdown timeout

Frontend build settings can be configured in `frontend/.env`:

```env
VITE_API_URL=/api
VITE_PUBLIC_BASE=/
```

For production, prefer same-origin deployment with `VITE_API_URL=/api` and configure the reverse proxy to forward `/api` requests to the backend. Set `VITE_PUBLIC_BASE` to the public subpath when deploying the frontend below the domain root (for example, `/crm/`).

## Development

```bash
# backend
cd backend
npm run dev

# frontend (separate terminal)
cd frontend
npm run dev
```

## Production build and start

```bash
cd frontend
npm run build

cd ../backend
NODE_ENV=production npm start
```

Serve `frontend/dist` with a production static host or reverse proxy. The static host must rewrite unknown, non-file browser routes to `frontend/dist/index.html` so `BrowserRouter` routes continue to work after refreshes.

The backend exposes `/health/live` for liveness and `/health/ready` for readiness checks. `/health` remains available for backward compatibility.

Authentication and global rate-limit stores are process-local. Multi-instance production deployments must use shared external stores and a load-balancer strategy that preserves correct authentication and rate-limiting behavior.

Local `.env` files and generated `dist` directories are ignored and must not be committed.

## Optional seed data

The seed command deletes existing application data before recreating sample records. Do not run it against a production database. It requires four explicit, unique passwords through `SEED_ADMIN_PASSWORD`, `SEED_TEAM_PASSWORD`, `SEED_MODERATOR_PASSWORD`, and `SEED_CLIENT_PASSWORD`. Each must contain at least 12 characters, uppercase, lowercase, a number, and a special character.

```bash
cd backend
npm run seed
```

Passwords are not stored in source or printed by the seed script.

## Commands

Frontend: `npm run dev`, `npm run build`, `npm run preview`  
Backend: `npm run check`, `npm run dev`, `npm start`, `npm run seed`

API routes are grouped under `/api`; authenticated calls use `Authorization: Bearer <token>`.

If MongoDB credentials were ever exposed, provider-side credential rotation remains required; update `MONGODB_URI` afterward. Rotation cannot be performed by this repository alone.
