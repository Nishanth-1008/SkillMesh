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
  └─ Emergency Response Agent (Incident responder alerting)
```

---

## 🗄️ Database Schema & Data Layer Architecture

SkillMesh features a dual-layer data architecture:
1. **PostgreSQL / Neon Layer**: Activated automatically when `DATABASE_URL` is set in `.env`.
2. **Local Persistence Fallback**: Uses atomic, debounced JSON store (`data/db.json`) when `DATABASE_URL` is omitted.

### Key Relational Tables:
- `users`: User identity, password hash (scrypt), salt, availability, location, bio, interests (JSONB).
- `communities` & `community_members`: Community metadata, ownership, membership roles (`owner`, `member`).
- `skills` & `user_skills`: Canonical skills registry, user-declared skill levels (`beginner`, `intermediate`, `expert`).
- `relationships`: Knowledge graph edge store (`from_type`, `from_id`, `to_type`, `to_id`, `kind`, `weight`).
- `projects` & `project_members`: Project workspaces, member roles (`owner`, `lead`, `member`), join requests.
- `opportunities` & `opportunity_apps`: Volunteer, mentorship, project, and emergency opportunities.
- `events` & `event_attendance`: Event coordination, attendance tracking, and impact reports.
- `agents` & `agent_runs`: Autonomous agent states, configuration, execution memory, and outputs.
- `digital_twins`: Real-time community health snapshots and predictive forecast states.

---

## 🛡️ Security & Authentication

- **Password Cryptography**: Native Node.js `crypto.scryptSync` with 16-byte random salts.
- **Stateless Authentication**: HMAC-SHA256 signed JWT tokens with 7-day expiration.
- **Role-Based Access Control (RBAC)**: Enforced via `requireAuth` and `optionalAuth` middleware on protected endpoints.
- **CORS Protection**: Origin restriction and credential handling customizable via `CORS_ORIGIN`.

---

## 🔄 Data Flow Loop

```text
Community Action -> Activity Logged -> Trust & Reputation Computed -> Graph Updated -> AI Recommendation Optimized
```

> **Designed for offline independence, high performance, and seamless production cloud deployment.**
