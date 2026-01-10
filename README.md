# Tarel – Full-Stack E-commerce Starter

Tarel is a minimal yet complete starter for an Edinburgh-focused seafood store. It bundles a Next.js 14 frontend, FastAPI backend, and PostgreSQL database with Docker-based local development.

## Features

- Next.js App Router UI with Tailwind CSS and brand palette (`#2f4135`, `#708e53`, `#e9e2d5`)
- FastAPI + SQLAlchemy backend with JWT auth and role-based guards (`user`, `admin`)
- PostgreSQL persistence and simple seed script
- Edinburgh postcode check, cart, checkout, and admin order/product management
- Stripe placeholder ready for integration (test key env wiring only)

## Project Structure

```
frontend/    # Next.js 14 app
backend/     # FastAPI service
docker-compose.yml
```

## Getting Started (Docker)

```bash
# 1. Build and start services
docker compose up -d --build

# 2. Seed sample data
docker compose exec backend python -c "from app.seed import *"

# 3. Visit the apps
# Frontend: http://localhost:3000
# API docs: http://localhost:8000/docs
```

Admin login after seeding: `admin@tarel.local` / `admin123`.

## Manual Dev Run

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

Configure environment variables by copying `backend/.env.example` and `frontend/.env.local.example` to their respective `.env` files.
The backend now points to a local Postgres instance (`postgresql://postgres:postgres@localhost:5432/tarel`).
Spin it up with `docker compose up -d db`, apply `docs/postgres-schema.sql`, then run `python -m app.seed` to create the schema and admin user.
When you’re ready for Supabase (or any hosted Postgres), overwrite `DATABASE_URL` with that connection string.

## Production database

For production use, point `DATABASE_URL` at your hosted Postgres instance (for example Amazon RDS/Aurora). The schema in `docs/postgres-schema.sql` matches the local database, so you can run the same DDL remotely and then update the environment variables for the backend and admin tools.

## One-command local dev

After installing dependencies (backend venv, `npm install` in `frontend/` and `admin-dashboard/`), you can start everything together from the repository root:

```bash
./dev.sh
```

The script launches:

- FastAPI backend at http://127.0.0.1:8000
- Next.js storefront at http://localhost:3000
- Vite admin dashboard at http://localhost:5173

Press `Ctrl+C` once to stop all three services.

## Tarel Admin Dashboard (React + FastAPI)

An additional Vite/Tailwind-based admin portal lives in `admin-dashboard/`. It authenticates against the FastAPI backend and uses the admin REST endpoints exclusively (no Supabase required).

### Install & Run

```bash
cd admin-dashboard
npm install
npm run dev
```

Create an `.env` in `admin-dashboard/` with:

```
VITE_API_BASE=http://localhost:8000/api
VITE_ADMIN_EMAIL=admin@tarel.local
VITE_ADMIN_PASSWORD=admin123
```

The admin credentials above match the seed data in `backend/app/seed.py`. Adjust them to your own admin account if you change the seed.

### Dashboard Features

- **Dashboard**: KPIs and monthly sales snapshot computed from `/admin/orders`.
- **Products**: CRUD management via `/admin/products`, toggle availability, CSV export.
	Local uploads land under `backend/app/media/products` and are served from `http://localhost:8000/media/...`.
- **Categories**: Create/toggle categories with `/admin/categories` endpoints, CSV export.
- **Orders**: Update status, CSV export, inline customer details (served from FastAPI models).
- **Customers**: List/CSV of all users.
- **Reports**: Sales trends, order status distribution, top products — all derived client-side from the admin order feed.
- **Support**: Manage customer tickets with status updates and canned responses served by `/admin/support/messages`.

All pages use the brand colours (`#2F4135`, `#708E53`, `#E9E2D5`) and ship with CSV download buttons.

## Next Steps

- Hook up Stripe checkout sessions + webhooks
- Optionally wire a cloud bucket (S3/Cloudinary) in place of the local image store
- SSR product/category listings with filters
- Introduce refresh tokens & HttpOnly cookie auth
- Add tests and database migrations (Alembic)
