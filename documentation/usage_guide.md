# SkillMesh Usage Guide

How to run, use, and extend the Phase 2 build of SkillMesh.

---

## What this build covers

| Phase | Status | Scope |
|---|---|---|
| **Phase 1 — Foundation** | Done | Auth, communities, profiles, knowledge graph, AI search, visualization |
| **Phase 2 — Intelligent Collaboration** | Done (this guide) | AI team builder, projects, trust/reputation, recommendations, opportunities, messaging, organizations |
| Phase 3–6 | Planned | See `roadmap.md` — not implemented yet |

Architecture choices (JSON-file DB, zero npm deps, heuristic NLP) are documented in the root `README.md`. This guide focuses on **how to use** what is implemented.

---

## Quick start

You need **Node.js ≥ 18** and **Python 3** (only to serve the static frontend). No `npm install`.

```bash
# Terminal 1 — seed demo data, then start API
cd backend
node src/seed.js
node src/server.js
# → http://localhost:4000

# Terminal 2 — serve the UI
cd frontend
python3 -m http.server 8080
# → http://localhost:8080
```

Open [http://localhost:8080](http://localhost:8080). Log in with any seeded account:

| Email | Password |
|---|---|
| `raj@example.com` | `password123` |
| `sneha@example.com` | `password123` |
| `arjun@example.com` | `password123` |
| `priya@example.com` | `password123` |
| `kabir@example.com` | `password123` |

Health check:

```bash
curl http://localhost:4000/health
```

---

## Using the product (UI)

### 1. AI Search (`#search`)

Type a problem in plain language. Examples:

- `I need someone to teach robotics` → ranks people by skills + trust + availability
- `emergency electrician needed now` → urgency boosts available electricians
- `build me a hackathon team` → switches into **team builder mode** and returns a balanced squad with a success prediction

Results show intent, detected skills, ranked matches, trust scores, and (when relevant) hidden experts inferred from the collaboration graph.

### 2. AI Team Builder (`#teams`)

Describe a goal, optionally check **Also create project & invite the team**. SkillMesh:

1. Extracts required skills from the goal
2. Fills seats to maximize skill coverage, availability, trust, and prior collaborations
3. Reports coverage %, success prediction, and skill gaps
4. (Optional) Creates a project and sends invites to suggested members

### 3. Communities (`#communities`)

Create or join communities. Opening a community shows members and an interactive knowledge graph (people, skills, projects, organizations).

### 4. Projects (`#projects`)

- Create a project with title, goal, and timeline
- Invite members by user ID (from a profile URL or search result)
- Accept / decline invites; request to join open projects; owners approve requests
- Joined members get a team discussion thread with optional announcements

Seeded demo project: **Neighborhood Hackathon 2026** (Raj owner, Sneha member).

### 5. Opportunities (`#opportunities`)

Post or browse volunteer / mentorship / event / initiative openings. Skills in the description are auto-extracted. Logged-in users see openings ranked by how well their skills match. Apply in one click.

### 6. For You — recommendations (`#recommendations`)

Personalized lists of mentors, volunteers, experts, similar people, and nearby contributors (same neighborhood token, e.g. “Greenwood”).

### 7. Trust & profile (`#dashboard`)

Your profile shows:

- Trust score (0–100) from endorsements, collaborations, contributions, projects, badges
- Skill endorsements from others
- Badges (`endorsed`, `collaborator`, `trusted`, …)

Endorse someone from their profile or from **My Profile → Endorse someone** (paste their user ID).

### 8. Inbox (`#messages`)

Notifications (invites, applications, endorsements), direct messages, project discussion history, and a community activity feed.

### 9. Organizations (`#organizations`)

Create NGO / school / college / club / small-business workspaces, join them, and (as owner) recruit volunteers — which posts an `organization_request` opportunity.

Seeded demo org: **Greenwood Care Foundation** (Priya).

---

## API reference

Base URL: `http://localhost:4000/api`  
Auth: `Authorization: Bearer <token>` on protected routes.

### Auth

| Method | Path | Auth | Body / notes |
|---|---|---|---|
| POST | `/auth/register` | — | `{ name, email, password, location? }` |
| POST | `/auth/login` | — | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | ✓ | Current user |

### Communities & profiles

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/communities?q=` | optional | Discovery |
| POST | `/communities` | ✓ | `{ name, description }` |
| GET | `/communities/:id` | — | Community + members |
| POST | `/communities/:id/join` | ✓ | |
| POST | `/communities/:id/leave` | ✓ | Owner cannot leave |
| PUT | `/communities/:id` | ✓ owner | Update |
| GET | `/profiles/:id` | — | Includes trust, badges, endorsements |
| PUT | `/profiles/me` | ✓ | `{ name, location, availability, bio, interests }` |
| POST | `/profiles/me/skills` | ✓ | `{ skill, level }` |
| DELETE | `/profiles/me/skills/:id` | ✓ | |

### AI search & graph

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/search` | optional | `{ query, communityId? }` — people, emergency, or team mode |
| GET | `/graph?communityId=` | — | `{ nodes, edges }` for visualization |

### Team builder

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/teams/build` | optional* | `{ goal, skills?, communityId?, size?, createProject? }` |
| POST | `/teams/hidden-experts` | optional | `{ query?, skills?, communityId? }` |

\* `createProject: true` requires auth.

### Projects

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/projects` | optional | Filters: `communityId`, `status`, `mine=1` |
| POST | `/projects` | ✓ | `{ title, description, goal, communityId?, timeline? }` |
| GET | `/projects/:id` | — | |
| PUT | `/projects/:id` | ✓ owner | |
| POST | `/projects/:id/invite` | ✓ | `{ userId, role? }` |
| POST | `/projects/:id/respond` | ✓ | `{ accept: true\|false }` |
| POST | `/projects/:id/request` | ✓ | Request to join |
| POST | `/projects/:id/approve` | ✓ owner | `{ userId, approve: true\|false }` |

### Recommendations

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/recommendations` | optional | All buckets; query: `skills`, `communityId`, `skill`, `limit` |
| GET | `/recommendations/mentors` | optional | |
| GET | `/recommendations/volunteers` | optional | |
| GET | `/recommendations/experts` | optional | |
| GET | `/recommendations/similar` | ✓ | |
| GET | `/recommendations/nearby` | ✓ | |
| GET | `/recommendations/related-skills?skill=` | — | |
| POST | `/recommendations/ask` | optional | `{ query, communityId? }` |

### Trust

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/trust/:userId?communityId=` | optional | Score + endorsements + badges |
| POST | `/trust/endorse` | ✓ | `{ toUserId, skill, note? }` |

### Opportunities

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/opportunities` | optional | Filters: `type`, `communityId`, `q` |
| POST | `/opportunities` | ✓ | `{ type, title, description, skillsNeeded?, communityId?, location? }` |
| GET | `/opportunities/:id` | — | + applications |
| POST | `/opportunities/:id/apply` | ✓ | `{ message? }` |
| POST | `/opportunities/:id/decide` | ✓ creator | `{ applicationId, accept }` |
| PATCH | `/opportunities/:id` | ✓ creator | Update / close |

Valid `type` values: `volunteer`, `mentorship`, `project`, `event`, `initiative`, `organization_request`.

### Messaging & activity

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/messages/inbox` | ✓ | DMs + project threads you belong to |
| POST | `/messages` | ✓ | `{ toUserId? }` or `{ projectId?, body, announcement? }` |
| GET | `/messages/project/:projectId` | ✓ | Must be joined member |
| GET | `/messages/notifications` | ✓ | |
| POST | `/messages/notifications/read` | ✓ | `{ all: true }` or `{ ids: [] }` |
| GET | `/messages/activity?communityId=` | ✓ | Activity feed |

### Organizations

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/organizations` | optional | Filters: `type`, `communityId`, `q` |
| POST | `/organizations` | ✓ | `{ name, type, description, communityId? }` |
| GET | `/organizations/:id` | — | Members + open recruitments |
| POST | `/organizations/:id/join` | ✓ | |
| PUT | `/organizations/:id` | ✓ owner | |
| POST | `/organizations/:id/recruit` | ✓ owner/admin | Creates an opportunity |

Valid org `type` values: `ngo`, `school`, `college`, `club`, `small_business`.

---

## Example curl flows

### Login + AI search

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"raj@example.com","password":"password123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -s -X POST http://localhost:4000/api/search \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"query":"I need someone to teach robotics"}' | python3 -m json.tool
```

### Build a team and create a project

```bash
curl -s -X POST http://localhost:4000/api/teams/build \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"goal":"Build me a hackathon team for civic tech","size":4,"createProject":true}' | python3 -m json.tool
```

### Endorse someone

```bash
# Get Sneha's id from /api/auth/login as sneha, or from search results
curl -s -X POST http://localhost:4000/api/trust/endorse \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"toUserId":"<SNEHA_USER_ID>","skill":"design","note":"Great product sense"}'
```

---

## Seeded demo data

Running `node src/seed.js` resets `backend/data/db.json` and creates:

- **Greenwood Residents Community** with 5 members
- Skills across robotics, design, electrical, first aid, plumbing, etc.
- Prior `collaborated` edges (Raj↔Sneha, Raj↔Priya)
- Endorsements and starting trust/badges
- Project **Neighborhood Hackathon 2026**
- Opportunities: blood donation volunteers + robotics mentors
- NGO **Greenwood Care Foundation**
- One project announcement and activity feed entries

---

## How ranking works (short)

**People search** scores each candidate on:

1. Skill match (primary)
2. Trust score (endorsements, collabs, contributions, badges)
3. Availability (boosted further for emergency intent)
4. Community membership (when scoped)
5. Prior collaborations + endorsement count

**Team builder** greedily fills seats, preferring people who cover still-unmet skills, then blends coverage, average trust, availability ratio, and pairwise collaboration history into a **success prediction** (0–100).

**Hidden experts** are people who did not list a skill directly but collaborated with people who have it.

---

## Project layout (Phase 2)

```
SkillMesh/
├── documentation/
│   ├── roadmap.md
│   ├── system_architecture.md
│   ├── project_story.md
│   └── usage_guide.md          ← this file
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── db.js               # JSON store (Phase 1+2 collections)
│   │   ├── seed.js
│   │   ├── nlp/skillExtractor.js
│   │   ├── graph/relationships.js
│   │   ├── services/
│   │   │   ├── trust.js
│   │   │   ├── teamBuilder.js
│   │   │   ├── recommendations.js
│   │   │   └── notify.js
│   │   └── routes/             # auth, communities, profiles, search, graph,
│   │                           # projects, teams, recommendations, trust,
│   │                           # opportunities, messages, organizations
│   └── data/db.json
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/{api,state,views,graph,app}.js
```

---

## What’s next (not built yet)

From `roadmap.md`:

- **Phase 3** — Community analytics, skill-gap detection, health scores, gamification, admin tools
- **Phase 4** — Cross-community federation, integrations, emergency civic response, public API
- **Phase 5–6** — Global network, multi-agent AI, digital twins, autonomous agents

When leaving the sandbox, the first upgrades called out in the root README still apply: swap `db.js` for Postgres, `skillExtractor.js` for an LLM, and the static frontend for Next.js — without rewriting route contracts.
