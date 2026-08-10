# SkillMesh — Every Community Already Has the People It Needs

> **Describe your problem in plain language. SkillMesh discovers the right people to solve it.**

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-Postgres%20%2F%20Neon%20%2F%20JSON-blue.svg)](https://neon.tech)
[![Frontend](https://img.shields.io/badge/Frontend-Vanilla%20JS%20SPA-orange.svg)](frontend/index.html)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Hackathon](https://img.shields.io/badge/Hackathon-Submission-ff69b4.svg)](#-project-story--inspiration)

SkillMesh is an **AI-powered Community Intelligence Platform, Knowledge Graph Engine, and Autonomous Collaboration Framework** spanning Phases 1–6. Instead of filtering static profiles or searching through keywords, SkillMesh allows users to describe real-world community problems in plain language, automatically matching skills, trust, availability, proximity, and past collaboration history.

---

## 💡 Project Story & Inspiration

### The Problem: Communities Suffer from a Shortage of Visibility, Not Talent
Every community—whether a university, neighborhood, apartment complex, school, or NGO—is filled with talented individuals. However, skills remain invisible:
- A student seeking a robotics mentor doesn't know a national competition winner lives two streets away.
- An NGO spends days searching for event volunteers while skilled volunteers nearby are never asked.
- An apartment association struggles during a storm to find a resident trained in first aid or electrical repair.

Existing platforms (like LinkedIn or traditional directories) require users to already know **who** they are looking for before they can find them.

### The Solution: "What if people never had to search for people?"
SkillMesh flips traditional search upside down:
1. **Natural Language Search**: Type *"I need someone to teach robotics after exams"* or *"Assemble a hackathon team for AI healthcare"*.
2. **Living Knowledge Graph Engine**: Every member, skill, organization, and project is connected in a living graph.
3. **Multi-Factor Candidate Scoring**: Matches based on skill match, trust score, availability, location proximity, and past team synergy.
4. **Emergency Response Mode**: One-click dispatch to find nearby certified first-aiders, electricians, or emergency responders.

---

## 🌟 Core Features Across All 6 Phases

SkillMesh is fully implemented across six comprehensive functional phases:

| Phase | Category | Key Features & Functionality |
| :--- | :--- | :--- |
| **Phase 1** | **Foundation** | User Authentication (`scrypt` + HMAC-SHA256 JWTs), Skill Taxonomy, Community Workspaces, Profile Editing, Interactive Concentric SVG Knowledge Graph Visualizer (`GraphView`). |
| **Phase 2** | **Collaboration** | AI Team Builder (multi-role candidate ranking), Project Workspaces, Opportunity Marketplace (posting, application, approval flow), Trust Scores & Peer Endorsements, Discussion Inbox & Threads. |
| **Phase 3** | **Intelligence** | Community Analytics Dashboard, Skill Gap & Demand Predictor, Event Check-in System (RSVP, QR check-in, impact reporting), Leaderboards & Badges, Admin Moderation Console. |
| **Phase 4** | **Ecosystem** | Public Community Discovery Hub, Cross-Community Federation & Partnerships, Emergency Response Center (ranked nearby responders), Developer API Key & Webhook Management, Plugin Marketplace. |
| **Phase 5** | **Global Intelligence**| Multi-Step Explainable Reasoning Engine, Portable Skill Passports, SDG Impact Tracker (linking community work to UN Sustainable Development Goals), Scenario Simulation Engine, Open Research Datasets. |
| **Phase 6** | **Autonomy** | 6 Autonomous Community Agents (Manager, Team Builder, Mentor, Volunteer, Event, Emergency), Digital Twin Community Snapshots, Collective Memory & Brainstorming, Community OS Pulse. |

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: Vanilla JavaScript Single-Page Application (SPA) with hash routing, modern CSS design tokens, glassmorphism UI, light/dark themes, and pure SVG interactive graph visualizer.
- **Backend**: Node.js microservice architecture powered by a lightweight custom zero-dependency HTTP API router with 18 modular route controllers.
- **Data & Storage**: Dual-mode data layer supporting **PostgreSQL / Neon Cloud Postgres** (with a 44-table relational schema) and an automatic zero-config **local JSON database fallback** (`backend/data/db.json`).
- **Security & Cryptography**: Native Node.js `crypto.scryptSync` password hashing, constant-time salt comparison, HMAC-SHA256 JWT token generation, and rate-limiting middleware.
- **AI & NLP Engine**: Heuristic intent detection engine (`backend/src/nlp/`) parsing intent, skill tokens, urgency, and location constraints; modularly designed to plug into Gemini / OpenAI APIs.

---

## 🚀 Step-by-Step Quick Start & Setup Guide

Follow this guide to get SkillMesh running locally in under 3 minutes.

### 📋 Prerequisites
- **Node.js**: `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
- **Python** (for running frontend HTTP server): Python 3.x *or any static web server*

---

### Step 1: Environment Setup

1. Open your terminal and navigate to the project directory:
   ```bash
   cd SkillMesh
   ```

2. Configure your environment variables:
   - Copy `.env.example` to `.env` in the root folder:
     ```bash
     cp .env.example .env
     ```
   
3. **Database Selection (Postgres vs JSON Mode)**:
   - **Mode A: Local Zero-Config JSON Mode (Default / Recommended for quick testing)**:
     Open `.env` and **comment out** or leave `DATABASE_URL` blank:
     ```env
     # DATABASE_URL=
     PORT=4000
     HOST=0.0.0.0
     JWT_SECRET=skillmesh-dev-secret-change-me
     ```
   - **Mode B: Neon Cloud Postgres Mode**:
     If you have a Neon / PostgreSQL connection string, paste it into `.env`:
     ```env
     DATABASE_URL=postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```

---

### Step 2: Database Migration & Data Seeding

Run the seed script to auto-populate demo users, communities, projects, skills, events, and relationships:

```bash
cd backend
npm run db:reset
```
*Output: `[db] JSON store folder verified` -> `[seed] Database reset & re-seeded successfully!`*

---

### Step 3: Launch the Backend Server

Start the backend server on port `4000`:

```bash
# In the backend directory
npm start
```
*Server will listen at `http://localhost:4000` (API endpoint: `http://localhost:4000/api`).*

---

### Step 4: Launch the Frontend Web Application

Open a **new terminal window**, navigate to `frontend/`, and launch a local web server:

```bash
cd SkillMesh/frontend
python -m http.server 8080
```
*Or using Node static server:*
```bash
npx serve -l 8080 frontend
```

Now open your browser and go to: **`http://localhost:8080`** 🎉

---

## 🔑 Demo Login Credentials

You can test the application using the following pre-seeded demo accounts:

| User Role | Email | Password | Primary Skills / Description |
| :--- | :--- | :--- | :--- |
| **Community Admin & Developer** | `raj@example.com` | `password123` | Python, AI, Robotics, Community Lead |
| **Robotics & IoT Specialist** | `ananya@example.com` | `password123` | Arduino, Robotics, C++, Mentorship |
| **UI/UX Designer & Community Lead** | `priya@example.com` | `password123` | Figma, UI Design, Workshop Facilitation |
| **First Aid & Emergency Responder** | `vikram@example.com` | `password123` | Emergency Response, First Aid, Disaster Prep |

---

## ⚡ Troubleshooting & FAQ

### Issue 1: `Error: listen EADDRINUSE: address already in use 0.0.0.0:4000`
**Cause**: Port 4000 is already being used by a previously running process.  
**Fix**:
- **Windows (Command Prompt / Git Bash)**:
  ```bash
  taskkill //F //IM node.exe
  ```
- **Windows (PowerShell)**:
  ```powershell
  Stop-Process -Name "node" -Force
  ```
- **Linux / macOS**:
  ```bash
  killall node
  ```

### Issue 2: `failed to start: getaddrinfo ENOTFOUND ep-xxx.region.aws.neon.tech`
**Cause**: The `.env` file contains a placeholder Postgres connection URL.  
**Fix**: Open `.env` and comment out line 9 (`# DATABASE_URL=...`). SkillMesh will automatically fallback to the high-performance local JSON store!

---

## 🧪 Automated Testing & Code Verification

SkillMesh includes an automated integration test suite that tests authentication, graph edges, AI search, team building, analytics, and autonomous agent executions:

Run the integration test suite:
```bash
node backend/src/tests/run_tests.js
```

Validate syntax across all JavaScript files:
```bash
# In PowerShell / Bash
Get-ChildItem -Path backend/src, frontend/js -Filter *.js -Recurse | ForEach-Object { node --check $_.FullName }
```

---

## 📁 Repository Structure

```
SkillMesh/
├── .env.example              # Template environment file
├── README.md                 # Complete project documentation & guide
├── backend/
│   ├── data/                 # Local JSON database & backups
│   ├── src/
│   │   ├── db/               # PostgreSQL schema definition (schema.sql) & migrations
│   │   ├── graph/            # Knowledge graph relationship engine & scoring
│   │   ├── middleware/       # Auth guards, CORS, & rate-limiting middleware
│   │   ├── nlp/              # Natural language intent & skill extraction
│   │   ├── routes/           # 18 Modular API route controllers
│   │   ├── services/         # Analytics, Autonomy, Ecosystem, Gamification, Trust
│   │   ├── tests/            # Automated test suite (run_tests.js)
│   │   ├── utils/            # Express-lite router & crypto/JWT helpers
│   │   ├── config.js         # Environment config parser
│   │   ├── db.js             # Dual Postgres / JSON data abstraction layer
│   │   ├── seed.js           # Demo dataset generator
│   │   └── server.js         # Backend HTTP server entrypoint
│   └── package.json
├── frontend/
│   ├── css/
│   │   └── style.css         # Modern design tokens, responsive glassmorphism styles
│   ├── js/
│   │   ├── api.js            # API fetch client wrapper
│   │   ├── app.js            # SPA Router, Breadcrumbs, Notifications, Modals
│   │   ├── config.js         # API base URL config
│   │   ├── graph.js          # SVG Knowledge Graph Visualizer
│   │   ├── state.js          # Client session & state management
│   │   ├── views.js          # Core views (Home, Login, Profile, Projects, Opps, Inbox)
│   │   └── views-advanced.js # Advanced views (Analytics, Events, Hub, Intelligence, Agents)
│   └── index.html            # Main SPA HTML structure
└── documentation/            # In-depth architectural & testing guides
```

---

## 📜 License

SkillMesh is open-source software licensed under the [MIT License](LICENSE).
