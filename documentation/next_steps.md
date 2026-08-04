# SkillMesh — Next Steps: Make It Crazy Good

How to go from today’s **strong offline demo** to a product people obsess over — while staying honest about what’s real vs aspirational.

Related: [`usage_guide.md`](./usage_guide.md) · [`system_architecture.md`](./system_architecture.md) · [`roadmap.md`](./roadmap.md)

---

## 0. What’s true right now

SkillMesh already has end-to-end demo coverage for Phases 1–6:

- Natural-language search, team builder, projects, trust, opportunities (apply **and** decide)
- Profile editing, leave community, graph edge sync
- Analytics, events (register / check-in / impact), admin, gamification
- Public hub + federation UI, emergency open/respond/resolve
- Reasoning, passport, SDG impact, research datasets, scenarios
- Agents, digital twin, OS pulse

**Still demo-grade (by design):** hydrate/persist over SQL (not query-per-request), heuristic NLP, stubbed Calendar/Maps/email/webhooks egress, rule-based “agents.”

---

## 1. North star (what “crazy good” means)

Not more features. A product that feels like **magic that communities trust**:

1. You describe a problem in plain language → the right people appear in seconds, with a clear *why*.
2. Building a team feels like a smart co-pilot, not a form.
3. Emergencies feel fast and serious (with liability clarity).
4. The knowledge graph is *alive* — beautiful, interactive, and useful.
5. Trust grows from real work, not vanity metrics.
6. Orgs (schools, NGOs, apartments) get dashboards they actually open weekly.

---

## 2. Priority roadmap (do in this order)

### Wave 1 — Production foundation (2–3 weeks) · **must**

Without this, nothing else sticks.

| # | Work | Why it matters |
|---|---|---|
| 1 | **Query-per-request SQL** (drop full-table persist) | Concurrency without rewrite races |
| 2 | **Real auth** (Supabase Auth / Auth.js) | Password reset, OAuth, secure sessions |
| 3 | **OpenAPI + Zod validation** | Stable contracts for a Next.js client |
| 4 | **CI smoke tests** (login → search → team → emergency) | Never break the demo path |
| 5 | **Env-based secrets** | Kill default JWT secret |

**Exit:** Concurrent writers don’t lose data; prefer SQL mutations over full-table rewrite.

### Wave 2 — Real intelligence (2–3 weeks) · **the wow**

| # | Work | Why |
|---|---|---|
| 1 | **Gemini/OpenAI** for intent + skill extraction (keep heuristic fallback) | Queries stop feeling brittle |
| 2 | **Embeddings + pgvector** for people/skills/opps | True semantic match |
| 3 | **Explainability panel** on every result (“matched robotics + taught before + trust 72”) | Builds trust in the AI |
| 4 | **Feedback loop** thumbs up/down on recommendations | Ranking improves over time |
| 5 | **Distance** via geocoded locations (Maps) | “Nearby” becomes real |

**Exit:** A vague sentence like *“help my kid’s school STEM club after exams”* returns a ranked, explained shortlist.

### Wave 3 — Product craft (3–4 weeks) · **the feel**

| # | Work | Why |
|---|---|---|
| 1 | **Next.js + Tailwind** rewrite (keep `/api` contracts) | SSR, mobile, shareable URLs |
| 2 | **Interactive force-graph** (react-force-graph / Cytoscape) | Graph becomes the hero visual |
| 3 | **Realtime** (Supabase Realtime / WS) for invites, emergencies, chat | Feels alive |
| 4 | **Email + push** for invites/emergencies/events | People actually show up |
| 5 | **Org-specific workspaces** (school vs NGO vs apartment templates) | Vertical sharpness |
| 6 | **Onboarding wizard** (join community → add 3 skills → try one search) | Activation |

**Exit:** A first-time user reaches “aha” in under 3 minutes on mobile.

### Wave 4 — Trust & civic seriousness (2 weeks)

| # | Work | Why |
|---|---|---|
| 1 | Verified org badges + skill endorsements with evidence | Reputation that matters |
| 2 | Emergency **disclaimer + escalation** to official services | Legal + ethical |
| 3 | Privacy: export/delete, location consent | Pilot-ready |
| 4 | Impact reports NGOs can download (PDF/CSV) | Retention for orgs |
| 5 | Moderation queue for owners (already started — deepen) | Safety |

### Wave 5 — Moat features (later, selective)

Only after Waves 1–3:

- Cross-community federation with real sync (not just partnership rows)
- Portable **skill passport** as verifiable credentials
- Agent runs as **durable jobs** with human approval before mass-notify
- Multilingual NLU for India-first communities
- Offline / low-bandwidth mode

**Explicitly defer:** AR/VR, IoT, “autonomous governance,” city digital twins as infrastructure.

---

## 3. Experience bets (design, not just eng)

1. **Conversation-first home** — one heroic input: “What do you need?” Everything else is secondary.
2. **One community context at a time** — switcher in nav; analytics/search/teams inherit it.
3. **Graph as storytelling** — click a person → see skills, collabs, trust trail animate.
4. **Team builder as a draft** — never auto-spam invites without review (safer + higher quality).
5. **Vertical landing pages** — “For apartments / schools / NGOs” with seeded playbooks.

---

## 4. Suggested 90-day plan

| Days | Focus | Demo you can show |
|---|---|---|
| 1–21 | Wave 1 (Postgres + auth + tests) | Multi-user stable demo |
| 22–42 | Wave 2 (LLM + vectors + explain) | “Magic search” video |
| 43–70 | Wave 3 (Next.js + graph + realtime + email) | Mobile pilot UI |
| 71–90 | Wave 4 + **one live pilot** (1 school or 1 apartment) | Real users, real feedback |

Success metric for day 90: **≥30 weekly active members in one community** who ran ≥1 successful match (person found / team formed / volunteer filled).

---

## 5. Technical migration rules (don’t rewrite blindly)

1. Keep `/api/*` shapes stable; swap internals behind drivers (`DB_DRIVER`, `NLU_DRIVER`).
2. Ship Next.js beside `frontend/` until parity, then cut over.
3. Label every heuristic surface in UI as **demo AI** until LLM is on (already started).
4. Prefer *suggest → human confirm* for anything that notifies many people.
5. Measure: search → click profile → invite/apply conversion.

---

## 6. Open decisions (decide before Wave 3)

1. Single-community product vs multi-tenant SaaS?
2. Free forever for neighborhoods + paid org seats?
3. How hard is identity verification for emergencies?
4. India-first languages (Hindi + English) in Wave 2 or 5?
5. Agents: suggest-only for pilots, or auto-invite with caps?

---

## 7. This week (if you only have 7 days)

1. Re-seed, walk: login → edit profile → search → team → analytics → emergency → OS pulse → admin.
2. Record a 3-minute demo loom with explainability callouts.
3. Pick **one pilot community type** (apartment / school / NGO) and tighten seed + copy for that story.
4. Move hot paths from hydrate/persist to real SQL queries (schema already in `backend/src/db/schema.sql`).
5. Do **not** start AR, plugins marketplace depth, or “global intelligence” branding until Wave 2 lands.

---

## 8. Definition of “crazy good” shipped

You’re there when:

- A non-technical community admin can run SkillMesh without an engineer.
- Search feels smarter than LinkedIn filters for *local* problems.
- At least one org renews usage after a real event or volunteer drive.
- People say: *“I didn’t know she lived two streets away.”*

That’s the product. Everything else is scaffolding.
