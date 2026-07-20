# SkillMesh — Next Steps & Future Planning

How to take the current **Phases 1–6 demo** to a production-ready platform aligned with `system_architecture.md`.

---

## 1. Where we are today

SkillMesh is a **complete product prototype**: every roadmap phase has working APIs and UI flows. It is **not** yet the stack described in the architecture whitepaper.

| Layer | Demo (now) | Target (architecture doc) |
|---|---|---|
| Frontend | Static HTML/CSS/vanilla JS SPA | Next.js + React + Tailwind |
| Backend | Node `http` + custom router | Node.js + Express (or Nest) |
| Database | `backend/data/db.json` | PostgreSQL / Supabase |
| Auth | Homegrown scrypt + HMAC JWT | Supabase Auth / Auth.js / Clerk |
| AI / NLU | Dictionary + heuristics | Gemini / OpenAI + embeddings |
| Graph viz | Hand-rolled SVG | react-force-graph / Cytoscape / deck.gl |
| Search | In-memory string match | Vector store (pgvector / Pinecone) |
| Integrations | Config stubs only | Live Google Calendar, Maps, email, etc. |
| Hosting | Local processes | Vercel + Railway/Fly/Supabase |
| Tests | Manual curl smoke checks | Automated unit/integration/e2e |

**Design intent:** route contracts and data shapes were written so most of the above can be swapped **module-by-module** without rewriting product logic.

Swap points already isolated:

- `backend/src/db.js` → Postgres client
- `backend/src/nlp/skillExtractor.js` → LLM + embeddings
- `backend/src/utils/auth.js` → real auth provider
- `backend/src/utils/router.js` → Express
- `frontend/` → Next.js app consuming the same `/api/*` paths

---

## 2. Recommended finish-off order

Do these in sequence. Each step leaves the product runnable.

### Step A — Make it real data (1–2 weeks)

1. Provision **Supabase** (or plain Postgres).
2. Translate `emptyState()` collections in `db.js` into SQL migrations (tables + indexes).
3. Implement `db.js` with `pg` / Supabase JS while keeping the same function names (`getState` patterns → repository methods).
4. Add connection pooling, migrations (`prisma` or `drizzle` or raw SQL), and seed scripts against the DB.
5. Add basic **concurrency** safety (transactions for join/invite/endorse).

**Exit criteria:** seed + all existing curl flows work against Postgres; `db.json` deleted from the critical path.

### Step B — Real AI (1–2 weeks)

1. Replace `extractSkills()` body with an LLM call (Gemini preferred per architecture doc) that returns the same `{ intent, skills, urgent, locationHint }` shape.
2. Add an **embedding** pipeline for people/skills/opportunities; store vectors in `pgvector`.
3. Upgrade ranking in `search.js` / `teamBuilder.js` / `recommendations.js` to blend:
   - semantic similarity
   - trust score
   - availability
   - distance (Maps)
   - collaboration history
4. Keep the heuristic extractor as a **fallback** when the LLM is down (already a good pattern).
5. Add prompt logging + cost caps for hackathon/demo budgets.

**Exit criteria:** `"I need someone who can help kids with STEM robotics after school"` returns strong matches without relying only on keyword synonyms.

### Step C — Production frontend (2–3 weeks)

1. Scaffold **Next.js App Router** + Tailwind; port views from `frontend/js/views*.js` into components.
2. Use the existing API client shapes in `frontend/js/api.js` as the TypeScript API layer.
3. Replace SVG graph with a proper force-graph library; keep `{ nodes, edges }` payload.
4. Add loading/error/empty states, mobile nav, and accessibility (keyboard, contrast, labels).
5. Optional: PWA / offline-first shell for rural low-bandwidth (called out in `project_story.md`).

**Exit criteria:** same user journeys as the SPA, nicer UX, deployable to Vercel.

### Step D — Wire integrations that are currently stubs (2 weeks)

| Stub today | Finish by |
|---|---|
| Google Calendar | Create/update events from `/api/events`; sync availability |
| Google Maps | Geocode profiles; distance factor in ranking; emergency ETA |
| Email / notifications | Sendgrid/Resend for invites, emergencies, digests |
| Social login | Google/GitHub via Supabase Auth |
| File storage | Supabase Storage for org docs / event assets |
| Webhooks | Real outbound HTTP with retries + signatures |
| Plugins | Load enabled plugins as sandboxed functions or WASM |

**Exit criteria:** connecting an integration in `#developers` actually affects calendar/email/maps behavior.

### Step E — Harden for production (ongoing, start in parallel after A)

See [§4 Production readiness checklist](#4-production-readiness-checklist).

---

## 3. What is left to integrate (checklist)

### Core platform

- [ ] PostgreSQL / Supabase schema + migrations
- [ ] Express (or keep custom router behind a proper HTTP framework)
- [ ] Typed API contract (OpenAPI / Zod)
- [ ] Next.js frontend rewrite
- [ ] Real JWT/session auth + refresh + password reset
- [ ] Role model beyond owner/member (moderator, org admin, city admin)
- [ ] File uploads
- [ ] Rate limiting + abuse protection (partially sketched via API keys)

### AI & knowledge

- [ ] Gemini/OpenAI for intent + skill extraction
- [ ] Embeddings + vector retrieval
- [ ] Explainable ranking UI (“why this person”) backed by real model traces
- [ ] Feedback loop (accepted/rejected recommendations retrain weights)
- [ ] Multilingual NLU (roadmap Phase 4–5)
- [ ] Hidden-expert inference via graph ML (not just collaborator skill proxy)

### Collaboration & trust

- [ ] Rich project timelines / kanban
- [ ] Real-time messaging (WebSockets / Supabase Realtime)
- [ ] Push notifications (web push / FCM)
- [ ] Verified identity (KYC-lite or community vouching ceremonies)
- [ ] Portable credentials as W3C Verifiable Credentials (passport is a demo today)

### Ecosystem & ops

- [ ] Live Google Calendar / Maps / email
- [ ] Outbound webhooks with delivery workers (BullMQ / Inngest)
- [ ] Public developer portal + SDK
- [ ] Multi-tenant / regional federation with real cross-instance sync
- [ ] Observability (OpenTelemetry, Sentry, structured logs)
- [ ] CI/CD (GitHub Actions: test → migrate → deploy)
- [ ] Automated backups & disaster recovery
- [ ] Privacy / GDPR deletion workflows
- [ ] Accessibility audit (WCAG) + i18n

### Phase 6 “vision” still demo-grade

These run as heuristics inside the JSON world; finishing them means real agents + infra:

- [ ] Agent orchestration with durable jobs and human-in-the-loop approvals
- [ ] Digital twin fed by live activity streams (not snapshot-on-request only)
- [ ] Scenario simulation with calibrated models (not rule-of-thumb projections)
- [ ] AR/VR, voice, IoT — explicitly future; do not block MVP launch on these

---

## 4. Production readiness checklist

Minimum bar before real communities use SkillMesh:

**Security**

- [ ] Secrets in env / vault (no default JWT secret)
- [ ] HTTPS everywhere
- [ ] Input validation on every write (Zod)
- [ ] CSRF where cookie sessions are used
- [ ] Rate limits on auth, search, emergency, webhooks
- [ ] Audit log retention policy

**Reliability**

- [ ] Health checks + uptime monitoring
- [ ] DB backups + restore drill
- [ ] Queue for emails, webhooks, agent runs
- [ ] Graceful LLM fallback (already partially designed)

**Quality**

- [ ] Unit tests for trust, team builder, analytics
- [ ] API integration tests
- [ ] Frontend e2e (Playwright) for login → search → team → emergency
- [ ] Load test recommendation + graph endpoints

**Compliance / trust**

- [ ] Privacy policy + consent for location/skills
- [ ] Data export / delete for users
- [ ] Clear emergency disclaimer (not a substitute for 112/911)

---

## 5. Suggested milestone plan

| Milestone | Goal | Rough effort |
|---|---|---|
| **M0 — Demo polish** | Stable seed, README, judge walkthrough script | 2–3 days |
| **M1 — Data + Auth** | Postgres + Supabase Auth; API unchanged | 1–2 weeks |
| **M2 — AI upgrade** | LLM NLU + embeddings in search/teams | 1–2 weeks |
| **M3 — Next.js UI** | Parity with current SPA + better graph | 2–3 weeks |
| **M4 — Integrations** | Calendar, email, Maps distance, live webhooks | 2 weeks |
| **M5 — Pilot** | 1 school / 1 apartment / 1 NGO live for 4 weeks | 4 weeks |
| **M6 — Public beta** | Multi-community, admin tools, monitoring | 4–6 weeks |

Hackathon / demo path: stop at **M0–M2**.  
Real community pilot: complete through **M5**.

---

## 6. How to migrate without a rewrite

Keep this rule: **product routes stay stable; internals get replaced.**

```text
Client  →  /api/search  →  search.js  →  extractSkills()  →  rank()
                                      ↘ replace only these two
```

Practical sequence inside the repo:

1. Add `backend/src/db/postgres.js` beside `db.js`; feature-flag with `DB_DRIVER=json|postgres`.
2. Add `backend/src/nlp/llmExtractor.js`; feature-flag with `NLU_DRIVER=heuristic|llm`.
3. Introduce TypeScript gradually (`allowJs`) starting with services.
4. Stand up `apps/web` (Next.js) while `frontend/` remains the fallback demo.
5. Delete JSON driver only after M1 is proven in staging.

---

## 7. Open product decisions (decide before M3)

1. **Single-tenant community vs multi-tenant SaaS** — affects auth, billing, federation.
2. **Emergency liability** — what SkillMesh promises vs redirects to official services.
3. **Trust model** — endorsements only vs verified orgs vs government IDs.
4. **Monetization** — free communities + paid org seats, or grants/NGO licensing.
5. **Graph ownership** — can users export/port their skill passport off-platform? (Recommended: yes.)
6. **Agent autonomy level** — auto-invite vs suggest-only for pilots (suggest-only is safer).

---

## 8. Near-term “finish the demo” tasks (this weekend)

If the goal is a polished judge/demo experience rather than production:

1. Restart with fresh seed; walk the script: login → AI search → team builder → analytics → emergency → OS pulse.
2. Record a 2–3 minute loom covering those flows.
3. Pin `documentation/usage_guide.md` + this file in the README.
4. Add 2–3 more seeded users/skills if a vertical story is needed (school / NGO / apartment).
5. Fix any UI clutter in the nav (group Phase 3–6 under a “More” menu) — optional polish.
6. Do **not** start Next.js mid-demo week unless the stack is already installing cleanly.

---

## 9. Success definition (when SkillMesh is “finished”)

Ship is “done” for a first public pilot when:

1. A real community can sign up without engineers seeding JSON.
2. Natural-language search uses an LLM and remains useful when the model is wrong (fallback).
3. Invites, emergencies, and event reminders actually reach people by email/push.
4. Trust and endorsements survive a Postgres restart and concurrent edits.
5. Admins can moderate and export a simple impact/SDG report.
6. Agents **suggest** actions; humans confirm anything that messages many people.
7. Privacy/deletion and basic monitoring exist.

Everything beyond that (global federation, digital twins as city infrastructure, AR/VR, autonomous governance) stays in `roadmap.md` as vision — valuable, but not required to finish the first version.

---

## Related docs

- [`roadmap.md`](./roadmap.md) — original phase vision
- [`system_architecture.md`](./system_architecture.md) — target technical design
- [`usage_guide.md`](./usage_guide.md) — how to run the current demo
- [`project_story.md`](./project_story.md) — problem, narrative, impact
- Root [`README.md`](../README.md) — build status snapshot
