# SkillMesh — Production Deployment Guide

This guide provides step-by-step instructions to deploy **SkillMesh** live on the web.

SkillMesh is designed for flexible deployment:
- **All-in-One Deployment (Simplest / Recommended)**: Deploy the Node.js backend on Render or Railway, which serves both the API endpoints (`/api/*`) and the static frontend SPA (`index.html`, `css/`, `js/`), backed by a **Neon PostgreSQL** database.
- **Separated Deployment**: Deploy the Frontend SPA to **Vercel** / **Netlify** and the Backend API to **Render** / **Railway** / **Fly.io**.

---

## 🗄️ Step 1: Set Up Cloud PostgreSQL Database (Neon)

SkillMesh is optimized for **Neon Postgres**, a serverless cloud PostgreSQL platform with instant provisioning.

1. Go to [Neon.tech](https://neon.tech) and sign up for a free account.
2. Click **Create Project**, name it `skillmesh-db`, and select your nearest region.
3. In the project dashboard, copy your **Postgres Connection String**:
   ```
   postgresql://neondb_owner:YOUR_PASSWORD@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Save this URL for environment variable setup in Step 2.

---

## 🚀 Step 2: Option A — All-in-One Deployment on Render (Recommended)

Render offers free hosting for web services and natively supports Node.js.

### 1. Push Code to GitHub
Ensure your latest code is pushed to your GitHub repository:
```bash
git add .
git commit -m "Deploy SkillMesh to production"
git push origin master
```

### 2. Create a New Web Service on Render
1. Log in to [Render.com](https://render.com) dashboard.
2. Click **New +** → **Web Service**.
3. Connect your GitHub account and select the `SkillMesh` repository.

### 3. Configure Service Settings
- **Name**: `skillmesh-app` (or your preferred app name)
- **Region**: Choose the region closest to your Neon database.
- **Branch**: `master` (or `main`)
- **Root Directory**: `backend`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm run db:migrate && npm run seed && npm start`

> Note: `npm run seed` is **non-destructive** — it auto-detects existing data and
> skips (the server also auto-seeds on first boot when the database is empty).
> Use `npm run db:reset` only to deliberately rebuild demo data.

### 4. Add Environment Variables on Render
Scroll down to **Environment Variables** and add the following keys:

| Key | Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://neondb_owner:YOUR_PASSWORD@ep-xyz.aws.neon.tech/neondb?sslmode=require` | Your Neon connection string |
| `NODE_ENV` | `production` | Set environment to production |
| `PORT` | leave default (Render injects it automatically) | Server listening port |
| `HOST` | `0.0.0.0` | Bind host |
| `JWT_SECRET` | Generate random hex: `openssl rand -hex 64` | **Required** — the server refuses to start in production without it |
| `CORS_ORIGIN` | `*` (or your exact domain) | Allowed origin header |
| `DATABASE_SSL` | `true` | Enable TLS connection to Neon |
| `LLM_API_URL` *(optional)* | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` | Gemini/OpenAI-compatible chat endpoint for AI intent understanding |
| `LLM_API_KEY` *(optional)* | your Gemini key | Secret for the chat endpoint |
| `LLM_MODEL` *(optional)* | `gemini-2.5-flash` | Chat model |
| `EMBEDDING_API_URL` *(optional)* | `https://generativelanguage.googleapis.com/v1beta/openai/embeddings` | Embedding endpoint for semantic search |
| `EMBEDDING_API_KEY` *(optional)* | your Gemini key | Secret for the embedding endpoint |
| `EMBEDDING_MODEL` *(optional)* | `gemini-embedding-001` | Embedding model |

> The frontend defaults to a **same-origin relative** `API_BASE: '/api'`, so the
> all-in-one deployment needs **no** `SKILLMESH_API_BASE` frontend override.
> Set `SKILLMESH_API_BASE` only for the separated deployment (Option C).

### 5. Deploy & Verify
Click **Create Web Service**. Render will automatically pull the repo, run migrations and seeds, and launch the server.

Once live, visit `https://skillmesh-app.onrender.com` in your browser!

---

## ⚡ Step 3: Option B — Deploying on Railway.app

Railway is an alternative zero-config platform for Node.js microservices.

1. Go to [Railway.app](https://railway.app) and click **New Project** → **Deploy from GitHub repo**.
2. Select your `SkillMesh` repository.
3. Click **Add Variables** and configure:
   - `DATABASE_URL`: *(Your Neon Connection String)*
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: *(Generated secret)*
   - `CORS_ORIGIN`: `*`
   - `PORT`: `4000`
4. Under **Settings**:
   - **Root Directory**: `backend`
   - **Custom Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Generate Domain** under Networking. Railway will assign a public SSL domain (e.g., `skillmesh-production.up.railway.app`).

---

## 🌐 Step 4: Option C — Separate Frontend (Vercel) + Backend (Render)

If you prefer serving the frontend SPA on a global CDN via Vercel:

### 1. Deploy Backend API to Render or Railway
Follow Option A or B above to deploy the `backend/` directory to Render or Railway. Copy the backend API URL (e.g., `https://skillmesh-api.onrender.com`).

### 2. Configure Frontend API base
The default `frontend/js/config.js` uses a same-origin relative `API_BASE: '/api'`,
so the separated deployment needs an override. Create `frontend/js/config.local.js`
(gitignored) on the deployed machine **before** `config.js` runs:
```javascript
window.SKILLMESH_API_BASE = 'https://skillmesh-api.onrender.com/api';
```
`frontend/js/api.js` checks `window.SKILLMESH_API_BASE` first, then
`window.SKILLMESH_CONFIG.API_BASE`, then the localhost fallback.

### 3. Deploy Frontend on Vercel
1. Install Vercel CLI or use [Vercel.com](https://vercel.com).
2. Run in terminal:
   ```bash
   cd frontend
   vercel --prod
   ```
3. Set **Framework Preset** to `Other` / `Static HTML`.
4. Output directory: `.` (current root).

---

## 🔒 Step 5: Post-Deployment Production Checklist

Before sharing your public URL for live evaluation or hackathon submission:

- [ ] **Run Database Migrations & Seed**: Verify all tables exist and initial demo data is populated. (On Render this runs automatically as part of the Start Command; `npm run db:reset` rebuilds demo data only if you need a fresh start.)
- [ ] **Test Production Auth**: Create a new test user account and log in.
- [ ] **Verify SSL/HTTPS**: Ensure HTTPS is enforced on both API endpoints and frontend.
- [ ] **CORS Configuration**: Update `CORS_ORIGIN` in your hosting dashboard to match your exact domain name for strict production security.
- [ ] **Check Health Endpoint**: Ping `https://<your-domain>/health` — should return `{"status":"ok","database":"postgres",...}`. (Note: the liveness route is `/health`, not `/api/health`.)

---

## 📊 Quick Deployment Reference Table

| Service Layer | Platform | Command / Config | Free Tier Available? |
|---|---|---|---|
| **Database** | Neon.tech | PostgreSQL 16 serverless | Yes (0.5 GiB storage free) |
| **Backend + SPA** | Render.com | `npm start` (Root: `backend`) | Yes (Free Web Service) |
| **Backend API** | Railway.app | `npm start` (Root: `backend`) | Yes ($5 monthly credit) |
| **Static Frontend** | Vercel / Netlify | Static HTML/CSS/JS export | Yes (Unlimited static free) |
