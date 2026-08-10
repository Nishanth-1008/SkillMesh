# SkillMesh — Action Plan & Next Things To Do

This document outlines the actionable roadmap, technical priorities, architectural upgrades, and feature enhancements for **SkillMesh** to transition from a feature-complete offline demo into a high-performance, production-ready community intelligence platform.

---

## 🚀 0. Immediate Setup & Developer Environment Fixes (Quick Wins)

Before beginning new feature work, ensure the local environment is clean and fully operational:

- [ ] **Fix Port 4000 Conflict**: Terminate any background Node.js processes occupying port 4000.
  ```bash
  taskkill //F //PID 9756
  ```
- [ ] **Configure Environment Variables in `.env`**:
  - For **Local JSON Mode**: Comment out `DATABASE_URL` in `.env` (or set `DATABASE_URL=`).
  - For **Postgres/Neon Mode**: Add a valid connection string:
    ```env
    DATABASE_URL=postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
    ```
- [ ] **Re-seed & Run Test Suite**:
  ```bash
  cd backend
  npm run db:reset
  node src/tests/run_tests.js
  ```
- [ ] **Start Local Development Servers**:
  - Backend API (`http://localhost:4000`): `cd backend && npm start`
  - Frontend SPA (`http://localhost:8080`): `cd frontend && python -m http.server 8080`

---

## 🏛️ Phase 1: Production Database & Auth Foundation

*Goal: Replace full-state JSON persistence with true concurrent SQL queries and production-grade authentication.*

- [ ] **Query-per-Request SQL Architecture**:
  - Replace the current full-table `hydrate()` / `persist()` approach in `backend/src/db.js` with direct SQL parameterized queries (`pg`).
  - Implement connection pooling with health check & automatic reconnection logic.
- [ ] **Production Authentication & Security**:
  - Upgrade scrypt/JWT implementation with secure HTTP-only cookies, refresh tokens, and password reset flows (or integrate Supabase Auth / Auth.js).
  - Enforce role-based access control (RBAC) middleware across all 18 backend route files.
- [ ] **Input Validation & API Contracts**:
  - Introduce `Zod` schema validation middleware for API request bodies and path parameters.
  - Generate OpenAPI 3.0 specs for seamless client consumption.
- [ ] **Automated CI/CD Test Pipeline**:
  - Setup GitHub Actions workflow for syntax checks (`node --check`) and regression testing (`run_tests.js`).

---

## 🧠 Phase 2: Real AI & Semantic Intelligence Engine

*Goal: Upgrade rule-based heuristics into LLM-driven intent extraction and vector similarity matching.*

- [x] **LLM Integration (Gemini / OpenAI API)**:
  - Replaced heuristic NLP parser with LLM calls via `backend/src/services/llm.js` (`understandQuery`), wired into `POST /api/search` and `POST /api/recommendations/ask`.
  - Retains regex heuristics as an offline/instant fallback — set `LLM_API_URL` + `LLM_API_KEY` (+ optional `LLM_MODEL`, `LLM_TIMEOUT_MS`) to activate; responses carry `understanding.source: "llm" | "heuristic"`.
- [x] **Semantic Vector Search (`pgvector`)**:
  - `backend/src/services/embeddings.js` embeds profiles, skills, opportunities, and projects into 384-dim vectors (deterministic local embedding by default; OpenAI-compatible `/v1/embeddings` when `EMBEDDING_API_URL` + key set).
  - Vectors persist in a real `vector(384)` column with an HNSW cosine index (`semantic_vectors` table, guarded migration in `db/migrate`); `POST /api/search/semantic` ranks people/opportunities/skills/projects, and `GET /api/search/semantic/pg` runs a genuine `ORDER BY vector <=> $1` query (falls back to in-memory cosine when the extension is unavailable).
  - Frontend "Semantic (magic search)" toggle on the search view.
- [x] **AI Match Explainability Panel**:
  - Every search, team-builder, and recommendation result carries an `explain: string[]` breakdown (`backend/src/services/explain.js`).
  - Frontend renders a *“Why this match?”* expander on search results, team builder members, and the recommendations page.
- [x] **Recommendation Feedback Loop**:
  - `POST/GET /api/recommendations/feedback` (upsert per user + target + context) stored in the `feedback` table.
  - `feedbackModifier` (`backend/src/services/feedback.js`) shifts recommender + team-builder scores (+8 up / −14 down, capped ±20) per viewer; “Good match / Poor match” buttons on the frontend.

---

## 🎨 Phase 3: Modern Frontend & Realtime User Experience

*Goal: Transform the single-page application into a live, interactive, highly polished interface.*

- [ ] **Framework Upgrade (Next.js / Vite)**:
  - Migrate plain JS frontend (`frontend/js/`) to Next.js or React with TypeScript for server-side rendering, routing, and mobile responsiveness.
- [ ] **Interactive SVG / Cytoscape Knowledge Graph**:
  - Upgrade `frontend/js/graph.js` into an interactive force-directed graph (using D3.js, Cytoscape.js, or React Force Graph) supporting zoom, node filtering, and relationship expansion.
- [ ] **Realtime Event Streaming (WebSockets / Server-Sent Events)**:
  - Push live notifications for team invitations, incoming chat messages, and emergency alerts.
- [ ] **Community Onboarding Wizard**:
  - Create a 3-step onboarding flow: Select community → Declare 3 core skills → Run first AI search.

---

## 🛡️ Phase 4: Trust, Safety & Civic Seriousness

*Goal: Build deep community trust with verifiable credentials, emergency safety protocols, and governance.*

- [ ] **Verified Org Badges & Skill Endorsements**:
  - Support evidence-backed endorsements (linking specific project contributions or peer reviews).
- [ ] **Emergency Escalation & Protocols**:
  - Add legal disclaimers, emergency service numbers (112/911 escalation buttons), and responder safety guidelines to the Emergency Response Center.
- [ ] **Privacy & Compliance Suite**:
  - Provide self-serve data export (JSON/CSV), account deletion, and location privacy toggling.
- [ ] **Impact Report Exporter**:
  - Build automated PDF/CSV impact summaries for NGOs, schools, and apartment associations summarizing volunteer hours, skills exchanged, and SDG metrics.

---

## 🤖 Phase 5: Autonomous Community Agents & Ecosystem Moats

*Goal: Enable background community management and cross-community federation.*

- [ ] **Human-in-the-Loop Agent Scheduler**:
  - Enhance Phase 6 Autonomous Agents (Community Manager, Event Coordinator, Mentor Matcher) to queue proposed actions for admin review before sending mass notifications.
- [ ] **Skill Passport & Verifiable Credentials**:
  - Implement portable W3C Verifiable Credentials or cryptographic badges for user skill history across communities.
- [ ] **India-First Multilingual NLU**:
  - Add language selection (English, Hindi, regional languages) to the natural language search and team builder interface.

---

## 📊 Summary Checklist Timeline (90-Day Roadmap)

| Days | Wave | Primary Goal | Milestone Deliverable |
|---|---|---|---|
| **Days 1–21** | **Wave 1** | SQL query layer, auth hardening, CI tests | Stable multi-user SQL backend |
| **Days 22–42**| **Wave 2** | Gemini LLM integration, vector search, explainability | Semantic "magic" search live |
| **Days 43–70**| **Wave 3** | Next.js/React UI, interactive graph visualizer, WebSockets | Modern responsive web app |
| **Days 71–90**| **Wave 4 & 5**| Verified credentials, emergency safety, pilot launch | Live community pilot deployment |
