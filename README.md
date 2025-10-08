# picco-crm

## PICCO Mini App CRM

Full-stack Telegram Mini App CRM for PICCO agents and admins, including Telegram bot onboarding, an Express backend powered by Supabase, and responsive WebApp dashboards for both roles.

## Monorepo Structure

- `backend/` - Express.js API (Supabase/PostgreSQL, JWT auth, admin/agent endpoints)
- `bot/` - `node-telegram-bot-api` bot handling onboarding and Mini App deep links
- `frontend/` - Static Telegram WebApp (Tailwind CDN, vanilla JS modules)
- `backend/database/` - SQL schema and seed scripts

## Prerequisites

- Node.js 18+
- Supabase project (PostgreSQL)
- Telegram Bot token
- Vercel account (or any static hosting) for the frontend

## Environment Variables

Duplicate the provided `.env.example` files and fill in your secrets.

### Backend (`backend/.env`)
```
PORT=4000
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
ALLOWED_ORIGINS=https://<frontend-domain>
```

### Telegram Bot (`bot/.env`)
```
TELEGRAM_BOT_TOKEN=...
BACKEND_BASE_URL=https://<backend-host>/api
WEBAPP_URL=https://<frontend-host>
AGENT_WEBAPP_PATH=/pages/agent/dashboard.html
ADMIN_WEBAPP_PATH=/pages/admin/login.html
TELEGRAM_WEBHOOK_URL=https://<bot-service-domain>/webhook
TELEGRAM_WEBHOOK_PATH=/webhook
```

### Frontend config (`frontend/config.js`)

The frontend reads `window.__PICCO_CONFIG` from `config.js`. During local development the file defaults to `http://localhost:4000/api`. For deployments, the `frontend/scripts/generate-config.mjs` script overwrites it based on environment variables (see **Deployment Notes**).

## Database Setup

Use the Supabase SQL editor (or `psql`) to run the schema and seed scripts:

1. `backend/database/schema.sql`
2. `backend/database/seed.sql`

The backend automatically ensures the default super-admin (`Admin / Picco0000`) on startup via `ensureSuperAdmin()`.

## Installing Dependencies

```bash
cd backend
npm install

cd ../bot
npm install
```

Frontend is static (Tailwind CDN). Update `frontend/config.js` (or run `npm run build` inside `frontend/`) before serving so the API base URL points to your backend. If you prefer local dev server, serve `frontend/` with any static server (for example `npx http-server frontend`).

## Running Locally

**Backend**
```bash
cd backend
npm run dev
```

**Telegram Bot**
```bash
cd bot
npm run dev
```

Set `USE_POLLING=true` in `bot/.env` during local development to run with long polling instead of the webhook.

**Frontend**
Serve the `frontend/` directory on HTTPS to leverage Telegram WebApp features. During development you can run:
```bash
cd frontend
npx http-server -S -C path/to/cert.pem -K path/to/key.pem
```
Or deploy to Vercel/Netlify.

## Telegram Bot Flow

1. `/start` > ask for full name.
2. Request contact > register agent via backend (`/api/auth/register`).
3. Success message + inline WebApp buttons (Agent/Admin panels).
4. If the agent already exists, backend returns 200 and the bot still opens the panel buttons.

### WebApp Deep Link Parameters

The bot appends useful query parameters when it opens the Mini App:

- `api` – points to the Render backend (the frontend falls back to this value if `config.js` was built without `API_BASE_URL`).
- `tg_id` – Telegram user ID, used as a fallback when the Mini App link is opened outside the Telegram client.

This allows the Vercel build to work even without additional environment variables, and you can paste the link into a desktop browser for quick checks.

## Backend API Highlights

- `POST /api/auth/register` - Agent registration (Telegram ID + contact)
- `POST /api/auth/login` - Admin login > JWT
- `GET /api/auth/agent/:telegramId` - WebApp fetch agent profile
- Agent endpoints: orders, stores, stats, product catalog
- Admin endpoints: products CRUD, stores CRUD, agents list, stats, exports, admin management, reset

All admin endpoints require `Authorization: Bearer <token>`.

## Frontend Pages

### Agent Mini App
- Dashboard (`pages/agent/dashboard.html`)
- Orders form + table (`pages/agent/orders.html`)
- Store manager (`pages/agent/stores.html`)
- Stats with Chart.js (`pages/agent/stats.html`)

### Admin Mini App
- Login (`pages/admin/login.html`)
- Dashboard overview (`pages/admin/dashboard.html`)
- Products CRUD (`pages/admin/products.html`)
- Stores CRUD (`pages/admin/stores.html`)
- Agents table (`pages/admin/agents.html`)
- Stats & exports (`pages/admin/stats.html`)
- Settings (admin management & reset) (`pages/admin/settings.html`)

## Deployment Notes

### Render (Backend & Bot)

- Use the supplied `render.yaml` blueprint or create two services manually:
  - **Web Service (`backend/`)** – Build command `npm install`, start command `npm run start`. Set `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, and `ALLOWED_ORIGINS` (comma-separated list that includes your Vercel domain).
  - **Web Service (`bot/`)** – Render's free tier does not expose background workers, so the bot runs as a web service with a webhook endpoint. Build command `npm install`, start command `npm run start`. Set `TELEGRAM_BOT_TOKEN`, `BACKEND_BASE_URL` (`https://<render-backend>/api`), `WEBAPP_URL` (Vercel domain), `AGENT_WEBAPP_PATH`, `ADMIN_WEBAPP_PATH`, plus webhook variables: either `TELEGRAM_WEBHOOK_URL=https://<bot-service-domain>/webhook` (recommended) or `WEBHOOK_BASE_URL` + `TELEGRAM_WEBHOOK_PATH`.
- Both services are configured for Render's free plan (`plan: free`) so no payment method is required. If you imported the blueprint before this change, edit the services in Render to downgrade the plan to "Free".
- After deploy, the bot service automatically calls Telegram's `setWebhook`. For local development you can opt into polling by setting `USE_POLLING=true` in your local `.env` and omitting the webhook variables.
- On Supabase create the tables via `schema.sql`, seed via `seed.sql`, and copy your project URL + service-role key into Render.

### Vercel (Frontend)

- Set the project root to `frontend/`.
- Environment variables (Project Settings > Environment Variables):
  - `API_BASE_URL=https://<render-backend>/api` (optional if you rely on the `api` deep-link parameter).
  - Optional overrides: `AGENT_PANEL_URL`, `ADMIN_PANEL_URL`.
- Build command: `npm run build` (writes `config.js`).
- Output directory: `.` (the static HTML/CSS/JS lives directly inside `frontend/`).
- Ensure HTTPS is enforced so Telegram WebApp can load it inside the bot.

### Supabase

- Run `backend/database/schema.sql` then `backend/database/seed.sql` in the SQL editor.
- Enable the `pgcrypto` extension if not already enabled (required for `gen_random_uuid()`).
- Create a service-role key with insert/update/delete rights for the tables.

## Next Steps / TODO

- Add proper PDF export (current prototype returns JSON placeholder).
- Harden validation & error handling (rate limits, retries).
- Replace polling with webhook for production.
- Add automated tests (Jest/Supertest) and linting CI.

## Support

- Telegram bot issues > check logs for the webhook service in Render.
- API debugging > enable Supabase logs, inspect console output from the Express server.
- Frontend enhancements > update `frontend/js/*.js` modules and Tailwind classes.
