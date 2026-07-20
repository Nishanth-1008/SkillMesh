# SkillMesh — Build Progress

**Last updated:** Monday, July 20, 2026, 10:34 UTC

## What was built

Phase 1 ("Foundation") from `documentation/roadmap.md`, implemented end-to-end and
tested via curl. Scope covered:

- ✅ Core infra: project setup, auth, role-based access, "DB schema", API foundation
- ✅ Communities: create, join/leave, discovery/search, owner-only management
- ✅ User profiles: basic info, skills, availability, location
- ✅ Knowledge graph: person / skill / community nodes + relationship engine
  (`has_skill`, `member_of`, `collaborated` edges)
- ✅ AI search: natural-language input → intent detection → skill extraction →
  candidate retrieval → ranked recommendations
- ✅ Search & discovery: skill/people/community search, basic semantic-ish matching
- ✅ Visualization: interactive knowledge graph, profile view, community overview
- ✅ Security: auth, input validation, CORS-protected API

All 8 items in the roadmap's **Phase 1 MVP Completion Criteria** are functional.

## Important deviation from the architecture doc — and why

`documentation/system_architecture.md` specifies Next.js/React, Node/Express,
Supabase/PostgreSQL, and an LLM (Gemini/OpenAI) for NLU. **This sandbox has no
outbound network access**, so `npm install` and any external API call fail
immediately (verified — `npm install` returned `403 Forbidden` from the
registry). Rather than produce a non-runnable scaffold, Phase 1 was built to
the same architecture *shape* using only what ships with Node.js:

| Layer | Documented | Built (Phase 1, offline) |
|---|---|---|
| Frontend | Next.js + React + Tailwind | Static HTML/CSS/vanilla JS SPA (hash router) |
| Backend | Node.js + Express | Node.js `http` + a ~100-line Express-like router |
| Database | PostgreSQL / Supabase | JSON-file store (`backend/data/db.json`) behind a `db.js` module |
| Auth | (unspecified) | scrypt password hashing + hand-rolled HMAC JWT, both via Node's `crypto` |
| AI / NLU | Gemini / OpenAI LLM | Deterministic dictionary + heuristic intent/skill extractor |

Every one of these is isolated behind a single module (`db.js`,
`utils/auth.js`, `nlp/skillExtractor.js`) with comments explaining the swap.
Moving to real Postgres, Express, Next.js, and an LLM call later should only
require rewriting the inside of those files — no route or view code should
need to change, since the data shapes already match what a real DB/LLM would
return.

## Repo layout

```
SkillMesh/
├── documentation/            (original docs, untouched)
├── backend/
│   ├── src/
│   │   ├── server.js         entrypoint, mounts routers by URL prefix
│   │   ├── db.js             JSON-file "database"
│   │   ├── seed.js           demo data generator
│   │   ├── nlp/skillExtractor.js   intent detection + skill extraction
│   │   ├── graph/relationships.js  knowledge graph edge engine + graph builder
│   │   ├── middleware/requireAuth.js
│   │   ├── utils/{auth,router}.js
│   │   └── routes/{auth,communities,profiles,search,graph}.js
│   └── data/db.json          generated at runtime (seed or first request)
└── frontend/
    ├── index.html
    ├── css/style.css         dark/glassmorphism theme per the architecture doc
    └── js/{api,state,views,graph,app}.js
```

## How to run it

```bash
# 1. Seed demo data (5 users in one community, all pw: password123)
cd backend && node src/seed.js

# 2. Start the API (http://localhost:4000)
node src/server.js

# 3. In another terminal, serve the frontend (http://localhost:8080)
cd ../frontend && python3 -m http.server 8080
```

No `npm install` needed — zero dependencies by design (see deviation note above).

## What I verified this session

- Register / login / `me` (JWT round-trips correctly)
- Community create / list / search / get / join / leave / owner-only update
- Profile view/update, add/remove skill (writes a graph edge each time)
- AI search: `"I need someone to teach robotics"` → correctly detected
  `intent: find_person`, skills `[robotics, teaching]`, and ranked Raj Malhotra
  top with a full score breakdown
- AI search: `"emergency electrician needed now"` → correctly detected
  `intent: emergency`, `urgent: true`, and surfaced the electrician despite
  "busy" availability
- `/api/graph` returns a well-formed node/edge payload; the frontend's SVG
  renderer draws it as three concentric rings (communities → people → skills)
- Frontend served statically and confirmed it can reach the backend
  cross-origin (CORS preflight + GET both return correctly)

## Known limitations / next steps

- JSON-file DB is fine for a demo but has no concurrency control — a real
  Postgres migration is the first Phase 2 task if this leaves the sandbox
- Skill extraction is a fixed dictionary, not a real LLM — good enough to
  demo the UX, not the actual semantic reasoning the architecture doc wants
- No automated tests yet, only manual curl-based verification
- Frontend is intentionally minimal (no Next.js SSR, no component framework)
  since it was built without registry access
