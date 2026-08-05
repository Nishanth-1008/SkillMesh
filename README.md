# SkillMesh — Every Community Already Has the People It Needs

**SkillMesh** is a Postgres-backed community intelligence platform, knowledge graph engine, and autonomous collaboration framework spanning Phases 1–6.

---

## 🌟 Overview & Architecture

SkillMesh operates as an offline-first or Neon-backed micro-service backend paired with a dynamic single-page web app (SPA).

| Phase | Domain | Core Features & Functionality |
|---|---|---|
| **Phase 1** | **Foundation** | User Authentication (scrypt + HMAC-SHA256 JWTs), Community Creation, User Profiles, Skill Taxonomy, Knowledge Graph Visualizer (`GraphView`). |
| **Phase 2** | **Collaboration** | AI Team Builder, Project Workspaces, Opportunity Marketplace, Trust Scores & Endorsements, Inbox & Discussion Threads, Organization Workspaces. |
| **Phase 3** | **Intelligence** | Community Analytics Dashboard, Skill Gap & Demand Predictor, Events & Check-ins, Gamification (Leaderboards, Badges, Milestones), Admin Moderation Console. |
| **Phase 4** | **Ecosystem** | Public Community Hub, Cross-Community Federation & Partnerships, Emergency Response Center, Integrations, API Key Management, Webhooks & Plugins. |
| **Phase 5** | **Global Intelligence** | Global Knowledge Network, Multi-step AI Reasoning Engine, Skill Passport Sync, SDG Impact Tracker, Scenario Simulation Engine, Research Datasets. |
| **Phase 6** | **Autonomy** | Autonomous Community Agents (Manager, Team Builder, Mentor, Volunteer, Event, Emergency), Digital Twin Snapshots, Community Memory, Community OS Pulse. |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js >= 18
- Postgres (Local instance or [Neon Postgres](https://neon.tech)) — *Optional; falls back to local JSON persistence if `DATABASE_URL` is omitted.*

### 1. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Key Environment Variables:
- `PORT`: Backend server port (Default: `4000`)
- `HOST`: Bind address (Default: `127.0.0.1`)
- `JWT_SECRET`: Secret key for token signing
- `DATABASE_URL`: Postgres connection string (e.g., `postgres://user:pass@ep-xyz.neon.tech/neondb?sslmode=require`)
- `CORS_ORIGIN`: Allowed frontend origin (Default: `*`)

### 2. Database Migration & Seeding
```bash
cd backend
npm run db:migrate
npm run seed          # Auto-populates demo users, communities, projects, and events
```

### 3. Start Backend & Frontend
Start backend server:
```bash
cd backend
npm start             # http://127.0.0.1:4000
```

Serve the frontend SPA:
```bash
cd frontend
python -m http.server 8080   # http://127.0.0.1:8080
```

Demo Credentials:
- **Email**: `raj@example.com`
- **Password**: `password123`

---

## 🧪 Running the Test Suite

Execute the comprehensive automated test suite to verify database hydration, auth cryptography, knowledge graph edge management, NLP extraction, team building, analytics, and autonomous agents:

```bash
node backend/src/tests/run_tests.js
```

Syntax validation across all JavaScript files:
```bash
Get-ChildItem -Path backend/src, frontend/js -Filter *.js -Recurse | ForEach-Object { node --check $_.FullName }
```

---

## 📁 Repository Structure

```
SkillMesh/
├── backend/
│   ├── src/
│   │   ├── db/              # Schema definition & migration script
│   │   ├── graph/           # Knowledge graph relationship engine
│   │   ├── middleware/      # Authentication & authorization guards
│   │   ├── nlp/             # Skill extraction & intent recognition
│   │   ├── routes/          # 18 Modular API route controllers
│   │   ├── services/        # Analytics, Autonomy, Ecosystem, Gamification, Trust
│   │   ├── tests/           # Integration & regression test suite
│   │   ├── utils/           # Express-lite Router & JWT/Crypto helpers
│   │   ├── config.js        # Environment configuration
│   │   ├── db.js            # Dual Postgres/JSON data access layer
│   │   ├── seed.js          # Demo dataset generator
│   │   └── server.js        # HTTP server entrypoint
│   └── package.json
├── frontend/
│   ├── css/
│   │   └── style.css        # Modern design system (tokens, glassmorphism, responsive)
│   ├── js/
│   │   ├── api.js           # Fetch API client wrapper
│   │   ├── app.js           # Router, Breadcrumbs, Notifications, Toast & Modals
│   │   ├── config.js        # API base configuration
│   │   ├── graph.js         # Concentric SVG Knowledge Graph Visualizer
│   │   ├── state.js         # Token & session store
│   │   ├── views.js         # Core views (Home, Login, Profile, Projects, Opps, Messages)
│   │   └── views-advanced.js# Advanced views (Analytics, Events, Hub, Intelligence, Agents)
│   └── index.html
└── documentation/           # Comprehensive system architecture & usage guides
```

---

## 📄 License

SkillMesh is licensed under the MIT License.
