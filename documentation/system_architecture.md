# System Architecture — SkillMesh Platform

### *SkillMesh — AI-Powered Autonomous Community Intelligence Engine*

---

## 🏛️ High-Level System Architecture

```text
                                SkillMesh User
                                      │
                                      ▼
             Vanilla CSS / JS Modern Single-Page App (SPA)
                                      │
 ───────────────────────────────────────────────────────────────────────────
                                API Gateway
                             (Node.js / Router)
 ───────────────────────────────────────────────────────────────────────────
        │                   │                   │                   │
        ▼                   ▼                   ▼                   ▼
   Auth & User        Community &         AI Search &          Autonomous
    Profiles          Collaborations       Reasoning             Agents
        │                   │                   │                   │
        └───────────────────┼───────────────────┼───────────────────┘
                            ▼                   ▼
                  Knowledge Graph Engine  (Relationships)
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
      PostgreSQL / Neon          Local DB Engine (.json)
```

---

## 🧠 AI & Intelligence Workflow

```text
User Query ("Need a React developer for an urgent health project")
  │
  ▼
Natural Language Processing Engine (nlp/skillExtractor.js)
  ├─ Intent Detection: ['build_team', 'emergency', 'volunteer', 'find_person']
  ├─ Skill Token Extraction: ['programming', 'react', 'healthcare', ...]
  ├─ Urgency Signal Extraction: boolean
  └─ Location Context Extraction: boolean
  │
  ▼
Knowledge Graph Engine (graph/relationships.js)
  ├─ Node Filtering: Person, Skill, Community, Project, Organization
  └─ Edge Match: has_skill, member_of, collaborated, works_at, owns
  │
  ▼
Candidate Scoring & Trust Blending (services/trust.js & teamBuilder.js)
  ├─ Skill Match (10-15 pts per covered skill slot)
  ├─ Trust Score Blend (0.15–0.25 weight, max 100)
  ├─ Availability Weight (Available: +8, Busy: -4)
  └─ Prior Collaboration Multiplier (Weight × 4)
  │
  ▼
Autonomous Agents & Digital Twin (services/autonomy.js)
  ├─ Community Manager Agent (Health monitoring & risk mitigation)
  ├─ Team Builder Agent (Autonomous team assembly)
  ├─ Mentor & Volunteer Agents (Talent matching)
  ├─ Event Coordinator Agent (Event lifecycle orchestration)
  └─ Emergency Response Agent (Incident responder alerting)
```

> Service modules: `analytics.js`, `autonomy.js`, `ecosystem.js`, `gamification.js`, `notify.js` (inbox/notification feed), `recommendations.js`, `teamBuilder.js`, `trust.js`. All HTTP handling is a zero-dependency Express-lite router (`utils/router.js`).

---

## 🗄️ Database Schema & Data Layer Architecture

SkillMesh features a dual-layer data architecture:
1. **PostgreSQL / Neon Layer**: Activated automatically when `DATABASE_URL` is set in `.env`.
2. **Local Persistence Fallback**: Uses atomic, debounced JSON store (`data/db.json`) when `DATABASE_URL` is omitted.

### Key Relational Tables (44 tables in `db/schema.sql`)

**Identity & Foundation (Phases 1–2)**
- `users`: User identity, password hash (scrypt), salt, availability, location, bio, interests (JSONB).
- `communities` & `community_members`: Community metadata, ownership, membership roles (`owner`, `member`).
- `skills` & `user_skills`: Canonical skills registry, user-declared skill levels (`beginner`, `intermediate`, `expert`).
- `relationships`: Knowledge graph edge store (`from_type`, `from_id`, `to_type`, `to_id`, `kind`, `weight`).
- `projects` & `project_members`: Project workspaces, member roles (`owner`, `lead`, `member`), join requests.
- `opportunities` & `opportunity_apps`: Volunteer, mentorship, project, and emergency opportunities.
- `organizations` & `organization_members`: NGO/school/club workspaces and staff roles.
- `messages` & `notifications`: Direct messages, team discussion threads, and the notification inbox.
- `endorsements`, `contributions`, `badges`: Trust & reputation data feeding every recommendation.

**Community Intelligence (Phase 3)**
- `events` & `event_attendance`: Event coordination, attendance tracking, and impact reports.
- `achievements` & `reward_points`: Gamification ledger (points, history).
- `moderation_logs`, `audit_logs`, `reports`: Owner/admin moderation trail.

**Community Ecosystem (Phase 4)**
- `partnerships` & `federation_links`: Cross-community federation and partnership rows.
- `emergencies` & `emergency_responses`: Incident lifecycle and responder enrollments.
- `webhooks` & `webhook_deliveries`: Outbound webhook subscriptions + recorded (stubbed) deliveries.
- `api_keys`: Developer API key registry (`sm_demo_*`).
- `integrations` & `plugins`: External service stubs (`connected_stub`) and installed plugins (e.g. `csv-export`).

**Global Intelligence (Phase 5)**
- `skill_passports` & `credentials`: Portable verified skill credentials.
- `impact_records`: SDG impact ledger with resilience scoring.
- `research_datasets`: Open dataset snapshots.
- `scenarios`: What-if simulation configs and results.

**Autonomy (Phase 6)**
- `agents` & `agent_runs`: Autonomous agent states, configuration, execution memory, and outputs.
- `digital_twins`: Real-time community health snapshots and predictive forecast states.
- `community_memory` & `autonomous_tasks`: Collective memory store and self-formed task queue.

---

## 🛡️ Security & Authentication

- **Password Cryptography**: Native Node.js `crypto.scryptSync` with 16-byte random salts.
- **Stateless Authentication**: HMAC-SHA256 signed JWT tokens with 7-day default expiration (`JWT_TTL_SECONDS`).
- **Role-Based Access Control (RBAC)**: Enforced via `requireAuth` and `optionalAuth` middleware (`middleware/requireAuth.js`) on protected endpoints.
- **CORS Protection**: Origin restriction and credential handling customizable via `CORS_ORIGIN`.
- **Env-based secrets**: `JWT_SECRET` required when `NODE_ENV=production` (fails fast otherwise).

---

## 🧪 Test Suite

`node backend/src/tests/run_tests.js` runs **8 integration suites** against the live data layer: DB hydration, crypto auth & JWT, knowledge graph & community dissolution, NLP skill extraction, AI team builder, community analytics & health, autonomous agents, and emergency response & SDG impact reporting. See `feature_testing_guide.md` for the UI-level protocol.

---

## 🔄 Data Flow Loop

```text
Community Action -> Activity Logged -> Trust & Reputation Computed -> Graph Updated -> AI Recommendation Optimized
```

> **Designed for offline independence, high performance, and seamless production cloud deployment.**
