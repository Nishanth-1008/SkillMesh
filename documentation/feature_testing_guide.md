# SkillMesh — Master End-to-End Feature & UI Button Testing Guide

This guide provides an exhaustive, element-by-element test protocol covering **every page, feature, modal, and button** across all **Phases 1–6** of SkillMesh.

---

## 1. Global Navigation & Layout Controls

These elements are persistent across all views in the header (`.topnav`) and sidebar (`#sidebar`).

| Component | Element / Target | Test Action | Expected Outcome |
|---|---|---|---|
| **Brand Logo** | `.brand` / `SkillMesh` | Click logo | Navigates to `#home`. |
| **Sidebar Toggle** | `#sidebar-toggle` (Hamburger `☰`) | Click button | Toggles `#sidebar` sliding in/out with dark overlay. |
| **Sidebar Links** | Nav buttons inside `#sidebar` | Click any route link | Navigates to target hash, auto-closes mobile sidebar drawer. |
| **Global Search** | `#global-search-input` | Type query (e.g., `robotics`) | Shows dropdown results dynamically. Pressing `Enter` navigates to `#search?q=robotics`. |
| **Theme Toggle** | `#theme-toggle` (☀️ / 🌙) | Click button | Toggles `data-theme="light"` and `data-theme="dark"` on `<html>`. Persists preference to `localStorage`. |
| **Quick Action Dropdown** | `#quick-action-btn` (`+ Quick Action`) | Click button | Toggles dropdown menu containing 4 action items. |
| **Quick Action** | `#qa-create-community` | Click item | Navigates to `#communities` and focuses community creation form. |
| **Quick Action** | `#qa-assemble-team` | Click item | Navigates directly to `#teams` (AI Team Builder). |
| **Quick Action** | `#qa-invite-members` | Click item | Prompts member invitation modal / navigates to active project. |
| **Quick Action** | `#qa-log-impact` | Click item | Opens **🌱 Log SDG Impact Contribution** global modal. |
| **Notification Bell** | `#notif-bell-btn` (`🔔`) | Click bell | Opens notification inbox dropdown showing unread count badge. |
| **Notification Action** | `#notif-mark-all-fast` | Click `Mark all read` | Clears unread badge count to 0, triggers OS notification clear, displays Toast banner with **Undo** button. |
| **Notification Action** | `#go-inbox-btn` | Click `Go to Inbox & Notifications →` | Navigates to `#messages`. |
| **Account Menu** | `#user-profile-btn` (`Account`) | Click button | Toggles user profile menu. |
| **Account Dropdown** | `#pm-dashboard` | Click `My Profile` | Navigates to `#dashboard`. |
| **Account Dropdown** | `#pm-messages` | Click `Inbox & Alerts` | Navigates to `#messages`. |
| **Account Dropdown** | `#pm-status-toggle` | Click `Status: Available / Busy` | Toggles availability state on server and updates status pill. |
| **Account Dropdown** | `#logout` | Click `Log out` | Clears local JWT token, resets session store, and redirects to `#home`. |

---

## 2. Page-by-Page Feature & Button Test Protocols

---

### Page 1: Home Dashboard (`#home`)
* **URL**: `http://localhost:8080/#home`
* **Purpose**: Landing page introducing SkillMesh capabilities across Phases 1–6.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Hero Banner | `Get Started` / `Explore Communities` | Click button | Navigates to `#communities`. |
| Hero Banner | `AI Search` / `Find Skills` | Click button | Navigates to `#search`. |
| Feature Cards | `Assemble Team` button | Click button | Navigates to `#teams`. |
| Feature Cards | `Global Mesh` button | Click button | Navigates to `#intelligence`. |
| Feature Cards | `Autonomous Agents` button | Click button | Navigates to `#autonomy`. |

---

### Page 2: Authentication — Login (`#login`)
* **URL**: `http://localhost:8080/#login`
* **Purpose**: Authenticate existing user session.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Credentials Form | Email (`#email`) | Type `raj@example.com` | Input updates. |
| Credentials Form | Password (`#password`) | Type `password123` | Input updates masked. |
| Action | `Log in` (`#login-submit`) | Click button | Authenticates with POST `/api/auth/login`, stores JWT token in `localStorage`, refreshes topbar user chip, navigates to `#dashboard`. |
| Validation | `Log in` | Submit with blank fields | Displays red `.error-box` error banner. |
| Footer Link | `Don't have an account? Register` | Click link | Navigates to `#register`. |

---

### Page 3: Authentication — Register (`#register`)
* **URL**: `http://localhost:8080/#register`
* **Purpose**: Create a new community member profile.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Registration Form | Name (`#name`) | Type `Aarav Sharma` | Input updates. |
| Registration Form | Email (`#email`) | Type `aarav@example.com` | Input updates. |
| Registration Form | Password (`#password`) | Type `password123` | Input updates. |
| Registration Form | Location (`#location`) | Type `Greenwood Sector 3` | Input updates. |
| Registration Form | Skills (`#skills`) | Type `python, machine learning, teaching` | Comma-separated skill list parsed. |
| Action | `Create account` | Click button | Calls POST `/api/auth/register`, initializes user & graph nodes, logs in automatically. |

---

### Page 4: User Dashboard / Profile Editor (`#dashboard`)
* **URL**: `http://localhost:8080/#dashboard`
* **Purpose**: Manage personal profile, skills, and active memberships.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Profile Header | Availability Dropdown | Change selection (`available` ↔ `busy`) | Updates availability pill instantly via API. |
| Edit Section | Bio Textarea (`#bio`) | Type `Community robotics enthusiast` | Text input updates. |
| Edit Section | Interests Input | Type `AI, Renewable Energy` | Updates user interests array. |
| Action | `Save changes` | Click button | Sends PUT `/api/profiles/me`, updates profile, displays green `.success-box`. |
| My Skills | `+ Add Skill` | Type `robotics` and select level `expert` | Adds new skill node to graph, updates user skill list. |

---

### Page 5: Public User Profile (`#profile?id=<USER_ID>`)
* **URL**: `http://localhost:8080/#profile?id=a2840062-6a7f-4ab8-804c-63745fbfa23d`
* **Purpose**: View member credentials, trust metrics, and endorse skills.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Profile Header | `Send Message` | Click button | Navigates to `#messages` with recipient auto-selected. |
| Trust Score | Endorsement Rating | Inspect score bar | Displays trust score calculated from endorsements and contributions. |
| Endorse Skill | Skill Dropdown (`#skill-select`) | Select `programming` | Dropdown value selected. |
| Endorse Skill | Note Input (`#endorse-note`) | Type `Great collaborator on hackathon project` | Note input captured. |
| Endorse Action | `Endorse Skill` | Click button | Calls POST `/api/trust/endorse`, increments skill score, adds entry to audit log. |

---

### Page 6: Communities Directory & Creation (`#communities`)
* **URL**: `http://localhost:8080/#communities`
* **Purpose**: List neighborhood communities and create new groups.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Create Section | Name (`#comm-name`) | Type `Greenwood Tech Club` | Name input captured. |
| Create Section | Description (`#comm-desc`) | Type `Local tech makers and hackers` | Description captured. |
| Create Action | `Create community` | Click button | Calls POST `/api/communities`, creates community, owner auto-joined, refreshes community grid. |
| Community Cards | `View community` | Click button on a community card | Navigates to `#community?id=<ID>`. |

---

### Page 7: Community Detail Workspace (`#community?id=<ID>`)
* **URL**: `http://localhost:8080/#community?id=e7597424-4b16-4713-89ad-5caada3810ef`
* **Purpose**: Hub for community graph, members, projects, and knowledge base.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Actions Bar | `Join community` / `Leave` | Click button | Calls POST `/api/communities/:id/join` or `/leave`, updates membership state. |
| Knowledge Graph | Graph SVG (`svg.graph-svg`) | Drag nodes or click node | Interactive graph physics simulation highlights node connections. |
| Members Grid | Member Chips (`[data-profile]`) | Click user badge | Navigates to target user's `#profile?id=<ID>`. |

---

### Page 8: AI Natural Language Search (`#search`)
* **URL**: `http://localhost:8080/#search`
* **Purpose**: Heuristic NLP matching for emergency aid, skills, and collaborators.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Search Form | Query Input (`#search-input`) | Type `need someone who knows first aid and plumbing` | Search string entered. |
| Action | `Search` (`#search-btn`) | Click button | Calls GET `/api/search?q=...`, displays ranked results with similarity scores. |
| Filter Tabs | `All` / `People` / `Emergency` | Click filter tab | Filters result rows by entity type. |

---

### Page 9: AI Team Builder (`#teams`)
* **URL**: `http://localhost:8080/#teams`
* **Purpose**: Form optimal cross-functional teams based on goals and skills.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Setup Form | Goal Input (`#team-goal`) | Type `Build civic emergency alerting app` | Goal string entered. |
| Setup Form | Skills Select (`#team-skills`) | Select `programming`, `design`, `first aid` | Selected skill chips rendered. |
| Action | `Assemble Optimal Team` | Click button | Calls POST `/api/teams/build`, displays recommended team, trust score matrix, and skill coverage graph. |
| Team Results | `Create Project from Team` | Click button | Pre-fills new project form with team members and navigates to `#projects`. |

---

### Page 10: Projects List & Workspace (`#projects`, `#project?id=<ID>`)
* **URL**: `http://localhost:8080/#project?id=<ID>`
* **Purpose**: Manage collaborative projects, member invitations, and chat.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Project Creation | Title (`#proj-title`) | Type `Solar Lighting Drive` | Prepares project creation payload. |
| Project Creation | `Create Project` | Click button | Sends POST `/api/projects`, adds project to list. |
| Project Detail | `Accept invite` (`#accept`) | Click button | Calls POST `/api/projects/:id/respond` (approve), re-renders project view, displays team discussion. |
| Project Detail | `Decline` (`#decline`) | Click button | Calls POST `/api/projects/:id/respond` (decline), re-renders view. |
| Project Detail | `Request to join` (`#request`) | Click button | Sends join request to project owner. |
| Owner Tools | `Approve` / `Reject` | Click on member request | Approves or rejects applicant, updates member list. |
| Discussion | Message Input (`#msg-body`) | Type `Meeting scheduled for 5 PM` | Input captured. |
| Discussion | `Post as announcement` | Check checkbox (owners only) | Flags message as announcement. |
| Discussion | `Send` (`#send-msg`) | Click button | Sends POST `/api/projects/:id/messages`, appends message to discussion thread. |

---

### Page 11: Personalized Recommendations (`#recommendations`)
* **URL**: `http://localhost:8080/#recommendations`
* **Purpose**: Algorithmic suggestions for mentors, collaborators, and nearby people.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Category Cards | `Connect` / `View Profile` | Click button | Navigates to recommended user profile. |
| Opportunity Cards | `Apply Now` | Click button | Submits volunteer application. |

---

### Page 12: Opportunities Hub (`#opportunities`, `#opportunity?id=<ID>`)
* **URL**: `http://localhost:8080/#opportunities`
* **Purpose**: Volunteer and mentorship listing directory.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Create Form | Role Title (`#opp-title`) | Type `Community Web Developer` | Form input. |
| Create Action | `Post Opportunity` | Click button | Posts new opportunity via `/api/opportunities`. |
| Opportunity Detail | `Apply for Opportunity` | Click button | Submits user application, shows pending badge. |

---

### Page 13: Inbox & Messaging (`#messages`)
* **URL**: `http://localhost:8080/#messages`
* **Purpose**: Unified inbox for direct messages and system alerts.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Direct Chat | Recipient Dropdown | Select user (e.g. `Sneha Iyer`) | Loads active conversation. |
| Message Box | Body Input (`#chat-input`) | Type `Hello Sneha, welcome to the team!` | Input typed. |
| Action | `Send Message` | Click button | Calls POST `/api/messages`, updates chat log in real time. |

---

### Page 14: Organizations Directory (`#organizations`, `#organization?id=<ID>`)
* **URL**: `http://localhost:8080/#organizations`
* **Purpose**: NGO, school, and club workspace management.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Create Form | Org Name (`#org-name`) | Type `Greenwood Eco Club` | Form input. |
| Create Action | `Register Organization` | Click button | Calls POST `/api/organizations`, creates workspace. |

---

### Page 15: Intel & Community Analytics (`#analytics`)
* **URL**: `http://localhost:8080/#analytics`
* **Purpose**: Health index, skill gaps, and leadership predictions.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Community Selector | Select Box | Choose `Greenwood Residents Community` | Calls GET `/api/analytics/community/:id`, renders charts and health metrics. |
| Analytics Card | `Export Analytics` | Click button | Exports JSON/CSV analytics snapshot. |

---

### Page 16: Events & Impact Management (`#events`, `#event?id=<ID>`)
* **URL**: `http://localhost:8080/#events`
* **Purpose**: Schedule events, track RSVPs, and record post-event impact reports.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Create Event | Event Name (`#event-name`) | Type `First-Aid Certification Workshop` | Prepares event creation. |
| Create Action | `Create Event` | Click button | Sends POST `/api/events`, displays in event list. |
| Event Detail | `RSVP / Register` | Click button | Registers user for event, increments attendee count. |
| Event Detail | `Check-in` | Click button | Marks user attendance status as `checked_in`. |
| Impact Report | Metric & Value (`#impact-val`) | Type `20` (people trained) | Prepares impact record. |
| Impact Action | `Submit Impact Report` | Click button | Saves impact report, updates community resilience metrics. |

---

### Page 17: Rewards & Leaderboard (`#leaderboard`)
* **URL**: `http://localhost:8080/#leaderboard`
* **Purpose**: Track community contribution points, achievements, and badges.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Rankings Table | Filter Tabs (`All` / `Points`) | Click tab | Re-orders user rankings by reward points. |

---

### Page 18: Admin & Moderation Panel (`#admin`)
* **URL**: `http://localhost:8080/#admin`
* **Purpose**: Owner dashboard for user management, moderation, and system logs.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Moderation Log | Audit Trail Table | Inspect rows | Displays system events, endorsements, and status changes. |
| User List | `Ban / Suspend` / `Promote` | Click action button | Updates user role/permissions in database. |

---

### Page 19: Public Community Hub (`#hub`)
* **URL**: `http://localhost:8080/#hub`
* **Purpose**: Public showcase of active communities and shared resources.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Directory | Community Cards | Click card | Navigates to public overview of community. |

---

### Page 20: Emergency Response Center (`#emergency`)
* **URL**: `http://localhost:8080/#emergency`
* **Purpose**: Rapid incident reporting and AI-powered responder ranking.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Report Incident | Incident Title (`#emerg-title`) | Type `Main water line burst in Sector 3` | Input captured. |
| Report Incident | Severity Select (`#emerg-sev`) | Select `critical` | Severity selected. |
| Action | `Broadcast Emergency` | Click button | Sends POST `/api/ecosystem/emergencies`, triggers rapid responder algorithm. |
| Responders List | `Offer Rapid Assistance` | Click button | Enrolls responder, dispatches notification to incident commander. |

---

### Page 21: Developer APIs & Integrations (`#developers`)
* **URL**: `http://localhost:8080/#developers`
* **Purpose**: Manage API keys, webhooks, and third-party plugin integrations.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| API Keys | Key Name (`#key-name`) | Type `Analytics Service Key` | Input captured. |
| API Keys | `Generate New Key` | Click button | Generates key prefixed with `sm_demo_`, renders in key table. |
| Webhook Setup | Webhook URL (`#webhook-url`) | Type `https://example.com/webhook` | Input captured. |
| Webhook Setup | `Register Webhook` | Click button | Saves webhook subscription, shows delivery log stubs. |

---

### Page 22: Global & SDG Intelligence (`#intelligence`)
* **URL**: `http://localhost:8080/#intelligence`
* **Purpose**: Multi-step explainable AI reasoning, global mesh network, and SDG tracking.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| AI Reasoning | Query Box (`#reason-query`) | Type `Form an emergency response team for power outage` | Query captured. |
| AI Reasoning | `Execute AI Reasoning` | Click button | Calls POST `/api/intelligence/reason`, outputs multi-step explainable plan steps. |
| SDG Tracking | `Log Impact Contribution` | Click button | Opens global SDG impact modal. |

---

### Page 23: Autonomous AI Agents & Twin (`#autonomy`)
* **URL**: `http://localhost:8080/#autonomy`
* **Purpose**: Digital twin monitoring, community memory, and autonomous agent tasks.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| OS Pulse | `Trigger OS Pulse` | Click button | Calls POST `/api/autonomy/os/:communityId/pulse`, executes full agent autonomous cycle. |
| Collective Memory | Memory Content Input | Type `Monsoon drainage procedures` | Form input. |
| Collective Memory | `Add Memory Entry` | Click button | Saves memory note to collective store. |
| Collective Memory | `AI Brainstorm / Synthesize` | Click button | Synthesizes memory items into AI recommendations. |

---

## 3. Global Modal Systems

### 🌱 Log SDG Impact Contribution Modal
* **Trigger**: Click `+ Quick Action` → `Log Impact`, or click `Log Impact Contribution` on `#intelligence`.

| Form Element | Input / Value | Action / Button | Expected Result |
|---|---|---|---|
| **SDG Category** | Select `SDG 13: Climate Action` | Dropdown select | Sets target SDG tag. |
| **Metric Name** | Type `trees_planted` | Text input | Sets impact metric. |
| **Contribution Value** | Type `10` | Number input | Sets numeric contribution. |
| **Notes / Description** | Type `Greenwood Park Tree Plantation` | Text input | Sets tag description. |
| **Submit Button** | Click `Log Impact` | Click button | Disables button, shows loading spinner, calls POST `/api/intelligence/impact`, closes modal, shows Toast notification `Impact logged successfully!`, and fires `impactRecorded` event to update metrics on active page. |
| **Cancel Button** | Click `Cancel` or `✕` | Click button | Closes modal immediately without saving. |

---

## 4. REST API Command Verification (cURL Script)

Execute this script in your terminal to verify API functionality for all phases:

```bash
# 1. Server Health
curl -s http://localhost:4000/health

# 2. Login & Token Extraction
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"raj@example.com","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# 3. Community Directory
curl -s http://localhost:4000/api/communities

# 4. Extract First Community ID
CID=$(curl -s http://localhost:4000/api/communities | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")

# 5. Phase 3 Community Analytics
curl -s http://localhost:4000/api/analytics/community/$CID

# 6. Phase 4 Emergency Response Broadcast
curl -s -X POST http://localhost:4000/api/ecosystem/emergencies \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"communityId\":\"$CID\",\"title\":\"Water main leak\",\"severity\":\"critical\"}"

# 7. Phase 5 AI Reasoning Execution
curl -s -X POST http://localhost:4000/api/intelligence/reason \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"query\":\"Build emergency response team\",\"communityId\":\"$CID\"}"

# 8. Phase 6 Autonomous OS Pulse Trigger
curl -s -X POST http://localhost:4000/api/autonomy/os/$CID/pulse \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"goal":"Strengthen community readiness"}'
```
