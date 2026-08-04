# SkillMesh — Build Progress

**Last updated:** Tuesday, Aug 4, 2026

## Honest status

Phases 1–6 exist as a **runnable demo** (APIs + SPA) backed by **Postgres** (Neon-ready). That is **not** the same as the production stack in `system_architecture.md` (Next.js, Supabase, Gemini, live integrations).

| Phase | Demo maturity |
|---|---|
| 1 Foundation | Strong — auth, communities, profiles, graph, heuristic AI search |
| 2 Collaboration | Strong — teams, projects, trust, opps, messaging, orgs (+ apply/decide UI) |
| 3 Intelligence | Solid demo — analytics, events (check-in/impact), gamification, admin |
| 4 Ecosystem | Demo + stubs — hub, federation UI, emergency; integrations/webhooks recorded locally |
| 5 Global | Demo heuristics — network, reasoning, passport, SDG, research, scenarios |
| 6 Autonomy | Demo rule-agents — twin, memory, OS pulse (not true autonomous agents) |

**Use it:** [`documentation/usage_guide.md`](documentation/usage_guide.md)  
**Make it crazy good:** [`documentation/next_steps.md`](documentation/next_steps.md)

## How to run

1. Create a free [Neon](https://console.neon.tech) Postgres project (or any Postgres).
2. Copy env and set your connection string:

```bash
cp .env.example .env
# Edit DATABASE_URL + JWT_SECRET
```

3. Install, migrate, seed, start:

```bash
cd backend
npm install
npm run db:migrate
npm run seed          # or: npm run db:reset
npm start             # http://localhost:4000
```

4. Serve the UI:

```bash
cd frontend
python3 -m http.server 8080   # http://localhost:8080
```

- Login `raj@example.com` / `password123`
- API base is `SKILLMESH_API_BASE` from `.env` (default `http://localhost:4000/api`); override in the browser via `frontend/js/config.local.js` if needed.

## Stack (intentional demo choices)

Postgres (Neon) · Node `http` router · heuristic NLP · static SPA.  
Env vars: see [`.env.example`](.env.example). Swap points: `backend/src/db.js`, `nlp/skillExtractor.js`, `utils/auth.js`.
