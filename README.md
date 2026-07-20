# SkillMesh — Build Progress

**Last updated:** Monday, July 20, 2026 (Phase 2 — Intelligent Collaboration implemented)

## What was built

### Phase 1 — Foundation ✅

- Core infra: project setup, auth, role-based access, DB schema, API foundation
- Communities: create, join/leave, discovery/search, owner-only management
- User profiles: basic info, skills, availability, location
- Knowledge graph: person / skill / community nodes + relationship engine
- AI search: natural-language → intent → skill extraction → ranked recommendations
- Visualization: interactive knowledge graph
- Security: auth, input validation, CORS

### Phase 2 — Intelligent Collaboration ✅

- **AI Team Builder** — goal-based teams with skill balancing, availability, compatibility, success prediction; optional auto-create project + invites
- **Collaboration Engine** — projects, invitations, roles, join requests, timelines, collaboration history
- **Smart Recommendations** — mentors, volunteers, experts, similar people, related skills, nearby contributors
- **Trust & Reputation** — trust score, endorsements, contribution tracking, verification badges
- **Opportunity Matching** — volunteer / mentorship / events / initiatives / org requests
- **Communication** — DMs, team discussions, announcements, notifications, activity feed
- **AI Enhancements** — hidden expert discovery, trust-aware ranking, collaboration prediction
- **Organization Support** — NGO / school / college / club / small-business workspaces + recruit

All Phase 2 MVP completion criteria from `documentation/roadmap.md` are functional in this offline build.

**How to use it:** see [`documentation/usage_guide.md`](documentation/usage_guide.md).

## Important deviation from the architecture doc — and why

`documentation/system_architecture.md` specifies Next.js/React, Node/Express,
Supabase/PostgreSQL, and an LLM (Gemini/OpenAI). This environment has limited
network access for package installs, so Phase 1–2 keep the same architecture
*shape* using Node.js builtins only:

| Layer | Documented | Built |
|---|---|---|
| Frontend | Next.js + React + Tailwind | Static HTML/CSS/vanilla JS SPA (hash router) |
| Backend | Node.js + Express | Node.js `http` + Express-like router |
| Database | PostgreSQL / Supabase | JSON-file store (`backend/data/db.json`) |
| Auth | (unspecified) | scrypt + HMAC JWT via Node `crypto` |
| AI / NLU | Gemini / OpenAI LLM | Deterministic dictionary + heuristic extractor |

Swap points: `db.js`, `utils/auth.js`, `nlp/skillExtractor.js`.

## How to run it

```bash
cd backend && node src/seed.js && node src/server.js
# other terminal:
cd frontend && python3 -m http.server 8080
```

- API: http://localhost:4000
- UI: http://localhost:8080
- Demo login: `raj@example.com` / `password123`

Full API reference, curl examples, and UI walkthrough: **`documentation/usage_guide.md`**.

## Repo layout

```
SkillMesh/
├── documentation/
│   ├── roadmap.md
│   ├── system_architecture.md
│   ├── project_story.md
│   └── usage_guide.md
├── backend/src/
│   ├── server.js, db.js, seed.js
│   ├── nlp/, graph/, middleware/, utils/
│   ├── services/{trust,teamBuilder,recommendations,notify}.js
│   └── routes/{auth,communities,profiles,search,graph,
│               projects,teams,recommendations,trust,
│               opportunities,messages,organizations}.js
└── frontend/{index.html,css/,js/}
```

## Known limitations / next steps

- JSON-file DB has no concurrency control — Postgres is the first real upgrade
- Skill extraction is dictionary/heuristic, not an LLM
- No automated test suite yet (manual curl smoke tests pass)
- Phase 3+ from the roadmap (analytics, federation, autonomous agents, …) not started
