# SkillMesh Usage Guide

How to run and use SkillMesh across **Phases 1–6**.

---

## Status overview

| Phase | Name | Status |
|---|---|---|
| 1 | Foundation | Done |
| 2 | Intelligent Collaboration | Done |
| 3 | Community Intelligence | Done |
| 4 | Community Ecosystem | Done |
| 5 | Global Intelligence | Done |
| 6 | Autonomous Community Intelligence | Done |

This is an offline demo build (JSON DB, zero npm deps, heuristic NLP). External integrations (Google Calendar, Maps, outbound webhooks) are **stubbed** — config is stored, HTTP egress is not performed.

---

## Quick start

```bash
cd backend
node src/seed.js
node src/server.js          # http://localhost:4000

cd frontend
python3 -m http.server 8080 # http://localhost:8080
```

Demo accounts (password `password123`):

`raj@example.com`, `sneha@example.com`, `arjun@example.com`, `priya@example.com`, `kabir@example.com`

```bash
curl http://localhost:4000/health
```

---

## UI map

| Hash route | What it does |
|---|---|
| `#search` | Natural-language people / emergency / team search |
| `#teams` | AI Team Builder |
| `#communities` | Create/join communities + knowledge graph |
| `#projects` | Collaboration projects, invites, discussion |
| `#opportunities` | Volunteer / mentorship matching |
| `#organizations` | NGO/school/club workspaces |
| `#recommendations` | Mentors, volunteers, nearby people |
| `#messages` | Inbox, notifications, activity feed |
| `#analytics` | Community health, skill gaps, predictions |
| `#events` | Events, registration, impact reports |
| `#leaderboard` | Rewards, achievements, rankings |
| `#hub` | Public community directory |
| `#emergency` | Emergency incident + rapid responder ranking |
| `#developers` | API keys, integration stubs, plugins |
| `#intelligence` | Global network, reasoning, passport, SDG, scenarios |
| `#autonomy` | Agents, digital twin, memory, OS pulse |

---

## Phase-by-phase capabilities

### Phase 1 — Foundation
Auth, profiles, communities, knowledge graph, AI search, graph visualization.

### Phase 2 — Intelligent Collaboration
Team builder, projects, trust/endorsements, recommendations, opportunities, messaging, organizations.

### Phase 3 — Community Intelligence
- **Analytics** `GET /api/analytics/community/:id` — dashboard, health index, skill gaps, underutilized talent, emerging leaders, risk detection
- **Events** `/api/events` — create, register, check-in, impact report
- **Gamification** `/api/gamification` — points, achievements, leaderboard, milestones
- **Admin** `/api/gamification/admin/*` — user list (owners), moderation, reports, audit logs

### Phase 4 — Community Ecosystem
- **Public hub** `GET /api/ecosystem/hub`
- **Federation** partnerships, shared talent discovery
- **Emergency** open incident → ranked responders → respond / resolve
- **Integrations** connect stubs (calendar, maps, email, …)
- **Open platform** API keys, webhooks (recorded locally), plugin marketplace

### Phase 5 — Global Intelligence
- **Network** `GET /api/intelligence/network`
- **Reasoning** `POST /api/intelligence/reason` — multi-step explainable agent plan
- **Forecast** `GET /api/intelligence/forecast/:communityId`
- **Skill passport** portable verified credentials
- **Impact / SDG** record + report resilience metrics
- **Scenarios** what-if simulation
- **Research** open dataset snapshots

### Phase 6 — Autonomy
- **Agents** community_manager, team_builder, mentor, volunteer, event_coordinator, emergency_response
- **Digital twin** live community snapshot
- **Collective memory** + AI brainstorm
- **Auto-form teams** from open opportunities
- **OS pulse** `POST /api/autonomy/os/:communityId/pulse` — twin + all agents + auto-teams in one shot

---

## Example curl flows

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"raj@example.com","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# List communities (grab an id)
curl -s http://localhost:4000/api/communities | python3 -m json.tool | head

CID=<community-id-from-above>

# Phase 3 analytics
curl -s http://localhost:4000/api/analytics/community/$CID | python3 -m json.tool | head -40

# Phase 4 emergency
curl -s -X POST http://localhost:4000/api/ecosystem/emergencies \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"communityId\":\"$CID\",\"title\":\"Power outage need electrician\",\"severity\":\"critical\"}" \
  | python3 -m json.tool | head -50

# Phase 5 reasoning
curl -s -X POST http://localhost:4000/api/intelligence/reason \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"query\":\"build me a hackathon team\",\"communityId\":\"$CID\"}" \
  | python3 -m json.tool | head -60

# Phase 6 OS pulse
curl -s -X POST http://localhost:4000/api/autonomy/os/$CID/pulse \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"goal":"Strengthen emergency readiness"}' | python3 -m json.tool
```

---

## Seeded demo world

`node src/seed.js` creates:

- **Greenwood Residents Community** (5 members) + **Riverside Makers Collective** (federation partner)
- Project, NGO, opportunities, endorsements, event (First-Aid Workshop)
- Active partnership / federation link
- Impact records, skill passports, agents, digital twin, community memory
- Sample plugin install (`csv-export`)

---

## API prefix map

| Prefix | Phase |
|---|---|
| `/api/auth`, `/communities`, `/profiles`, `/search`, `/graph` | 1 |
| `/api/projects`, `/teams`, `/recommendations`, `/trust`, `/opportunities`, `/messages`, `/organizations` | 2 |
| `/api/analytics`, `/events`, `/gamification` | 3 |
| `/api/ecosystem` | 4 |
| `/api/intelligence` | 5 |
| `/api/autonomy` | 6 |

---

## Architecture note

Same swap points as earlier phases: `db.js` → Postgres, `nlp/skillExtractor.js` → LLM, static frontend → Next.js. Route contracts are stable.

See also: `roadmap.md`, `system_architecture.md`, `project_story.md`, `next_steps.md`, root `README.md`.
