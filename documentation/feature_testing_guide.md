# SkillMesh — Master End-to-End Feature & UI Button Testing Guide

This guide provides an exhaustive, element-by-element test protocol covering **every page, feature, modal, and button** across all **Phases 1–6** of SkillMesh.

> Element IDs below are the **current** ones in `frontend/index.html`, `frontend/js/views.js`, `frontend/js/views-advanced.js`, and `frontend/js/app.js`. Automated backend suites live in `backend/src/tests/run_tests.js` (8 suites).

---

## 1. Global Navigation & Layout Controls

These elements are persistent across all views in the header (`.topnav`) and sidebar (`#sidebar`).

| Component | Element / Target | Test Action | Expected Outcome |
|---|---|---|---|
| **Brand Logo** | `.brand` / `SkillMesh` | Click logo | Navigates to `#home`. |
| **Sidebar Toggle** | `#sidebar-toggle` (Hamburger `☰`) | Click button | Toggles `#sidebar` sliding in/out with `#sidebar-overlay`. |
| **Sidebar Links** | Nav buttons inside `#navlinks` | Click any route link | Navigates to target hash, auto-closes mobile sidebar drawer. |
| **Global Search** | `#global-search-input` | Type query (e.g. `robotics`) | Debounced dropdown `#global-search-results` shows matching communities + platform quick links (AI Team Builder, Full AI Search). Click a result to navigate. Click outside to dismiss. |
| **Theme Toggle** | `#theme-toggle` (☀️ / 🌙) | Click button | Toggles `data-theme="light"` / `data-theme="dark"` on `<html>`. Persists `skillmesh_theme` to `localStorage`, shows toast. |
| **Quick Action Dropdown** | `#quick-action-btn` (`+ Quick Action`) | Click button | Toggles `#quick-action-dropdown` containing 4 action items. |
| **Quick Action** | `#qa-create-community` | Click item | Navigates to `#communities` (create form). |
| **Quick Action** | `#qa-assemble-team` | Click item | Navigates directly to `#teams` (AI Team Builder). |
| **Quick Action** | `#qa-invite-members` | Click item | Navigates to `#projects` (invite controls live in project detail). |
| **Quick Action** | `#qa-log-impact` | Click item | Opens **🌱 Log SDG Impact Contribution** global modal. |
| **Notification Bell** | `#notif-bell-btn` (`🔔`) | Click bell | Opens `#notif-dropdown` with unread count badge `#notif-badge`. |
| **Notification Action** | `#notif-mark-all-fast` | Click `Mark all read` | Clears unread badge to 0, shows toast with **Undo** (markAllNotificationsReadWithUndo). |
| **Notification Action** | `#go-inbox-btn` | Click `Go to Inbox & Notifications →` | Navigates to `#messages`. |
| **Account Menu** | `#user-profile-btn` (`Account`) | Click button | Toggles `#user-profile-dropdown`. |
| **Account Dropdown** | `#pm-dashboard` | Click `My Profile` | Navigates to `#dashboard` (or `#login` when logged out). |
| **Account Dropdown** | `#pm-messages` | Click `Inbox & Alerts` | Navigates to `#messages` (or `#login` when logged out). |
| **Account Dropdown** | `#pm-status-toggle` | Click `Status: Available / Busy` | Toggles availability state in session store, updates `#user-status-text`, shows toast. |
| **Account Dropdown** | `#pm-logout` | Click `Log out` | Clears local JWT token, resets session store, refreshes nav, redirects to `#home`. |
| **Account Dropdown** | `#pm-login` | Click `Log in` (guest mode) | Navigates to `#login`. |

---

## 2. Page-by-Page Feature & Button Test Protocols

---

### Page 1: Home Dashboard (`#home`)
* **URL**: `http://localhost:8080/#home`
* **Purpose**: Landing page introducing SkillMesh capabilities across Phases 1–6.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Hero Banner | `#cta-search` (`✦ Try AI Search`) | Click button | Navigates to `#search`. |
| Hero Banner | `#cta-teams` (`Build a Team`) | Click button | Navigates to `#teams`. |
| Hero Banner | `#cta-communities` (`Browse Communities`) | Click button | Navigates to `#communities`. |
| Feature Cards | 4 cards (AI Search, Team Builder, Trust, Opportunities) | Inspect | Static informational cards. |

---

### Page 2: Authentication — Login (`#login`)
* **URL**: `http://localhost:8080/#login`
* **Purpose**: Authenticate existing user session.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Credentials Form | Email (`#email`) | Type `raj@example.com` | Input updates. |
| Credentials Form | Password (`#password`) | Type `password123` | Input updates masked. |
| Action | `Log in` (`#submit`) | Click button | Authenticates with POST `/api/auth/login`, stores JWT token in `localStorage`, refreshes topbar user chip, navigates to `#dashboard`. |
| Validation | `Log in` | Submit with blank fields | Displays red `.error-box` banner in `#msg`. |
| Footer Link | `Register` (`#go-register`) | Click link | Navigates to `#register`. |

---

### Page 3: Authentication — Register (`#register`)
* **URL**: `http://localhost:8080/#register`
* **Purpose**: Create a new community member profile.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Registration Form | Name (`#name`) | Type `Aarav Sharma` | Input updates. |
| Registration Form | Email (`#email`) | Type `aarav@example.com` | Input updates. |
| Registration Form | Password (`#password`) | Type `password123` | Input updates masked. |
| Registration Form | Location (`#location`) | Type `Greenwood Sector 3` | Input updates. |
| Action | `Register` (`#submit`) | Click button | Calls POST `/api/auth/register`, initializes user & graph nodes, logs in automatically. |
| Footer Link | `Log in` (`#go-login`) | Click link | Navigates to `#login`. |

> Note: skills are not collected at registration — add them later via `#dashboard` (Edit Profile → skill adder).

---

### Page 4: User Dashboard / Profile Editor (`#dashboard`)
* **URL**: `http://localhost:8080/#dashboard`
* **Purpose**: Manage personal profile, skills, and active memberships.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Profile Header | `#open-edit-profile-modal` (`✏️ Edit Profile`) | Click button | Opens the edit-profile modal. |
| Profile Header | `#profile-inbox-btn` (`📥 Inbox & Alerts`) | Click button | Navigates to `#messages`. |
| Profile Header | `#profile-logout-btn` (`🚪 Log out`) | Click button | Clears token, returns to `#home`. |
| Edit Modal | Name (`#edit-name`) | Edit value | Prepares profile payload. |
| Edit Modal | Location (`#edit-location`) | Edit value | Prepares profile payload. |
| Edit Modal | Availability (`#edit-availability`) | Select `busy` | Prepares availability change. |
| Edit Modal | Bio (`#edit-bio`) | Type `Community robotics enthusiast` | Text input updates. |
| Edit Modal | Interests (`#edit-interests`) | Type `AI, Renewable Energy` | Updates user interests array. |
| Edit Modal | Skill adder `#modal-skill-name` + `#modal-skill-level` + `#modal-add-skill-btn` | Type `robotics`, level `expert`, click `+ Add Skill` | Adds new skill node to graph, updates user skill list (`#modal-skill-msg`). |
| Edit Modal | `#save-edit-profile` (`Save Profile`) | Click button | Sends PUT `/api/profiles/me`, updates profile, displays success in `#profile-modal-msg`. |
| Edit Modal | `#cancel-edit-profile` (`Cancel`) | Click button | Closes modal without saving. |
| Skills List | Skill badge `✕` (`[data-remove]`) | Click remove link | Removes the skill from the user profile. |
| Endorse Someone | `#endorse-user`, `#endorse-skill`, `#endorse-note`, `#endorse-btn` | Fill & submit | Calls POST `/api/trust/endorse`, shows result in `#endorse-msg`. |

---

### Page 5: Public User Profile (`#profile?id=<USER_ID>`)
* **URL**: `http://localhost:8080/#profile?id=<ID>`
* **Purpose**: View member credentials, trust metrics, and endorse skills.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Profile Header | Trust score bar | Inspect `.trust-bar` | Displays trust score calculated from endorsements and contributions. |
| Profile Header | Skills / Communities / Badges / Endorsements | Inspect cards | Renders profile data; community & member names are clickable (navigate to targets). |
| Endorse (other user) | `#endorse-skill` | Select/type `programming` | Input captured. |
| Endorse (other user) | `#endorse-note` | Type `Great collaborator on hackathon project` | Note input captured. |
| Endorse Action | `Endorse` (`#endorse-btn`) | Click button | Calls POST `/api/trust/endorse`, increments skill score, shows confirmation in `#endorse-msg`. |

> Reach other profiles from anywhere via clickable `[data-profile]` badges (search results, community members, project members, leaderboard).

---

### Page 6: Communities Directory & Creation (`#communities`)
* **URL**: `http://localhost:8080/#communities`
* **Purpose**: List neighborhood communities and create new groups.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Search | `#q` + `#search-btn` | Type `Greenwood`, click `Search` | Filters community grid in `#list`. |
| Create Section | Name (`#new-name`) | Type `Greenwood Tech Club` | Name input captured. |
| Create Section | Description (`#new-desc`) | Type `Local tech makers and hackers` | Description captured. |
| Create Action | `Create` (`#create-btn`) | Click button | Calls POST `/api/communities`, creates community, owner auto-joined, refreshes grid (`#create-msg`). |
| Community Cards | Card buttons | Click on a community card | Navigates to `#community?id=<ID>`. |

---

### Page 7: Community Detail Workspace (`#community?id=<ID>`)
* **URL**: `http://localhost:8080/#community?id=<ID>`
* **Purpose**: Hub for community graph, members, projects, and knowledge base.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Actions Bar | `#join` / `#leave` | Click button | Calls POST `/api/communities/:id/join` or `/leave`, updates membership state. |
| Actions Bar | `#search-here` | Click button | Navigates to `#search` scoped to this community. |
| Actions Bar | `#team-here` | Click button | Navigates to `#teams` scoped to this community. |
| Actions Bar | `#analytics-here` | Click button | Navigates to `#analytics` with community pre-selected. |
| Knowledge Graph | Graph SVG in `#graph-container` | Drag nodes or click node | Interactive concentric SVG graph highlights node connections. |
| Members Grid | Member badges (`[data-profile]`) | Click user badge | Navigates to target user's `#profile?id=<ID>`. |

---

### Page 8: AI Natural Language Search (`#search`)
* **URL**: `http://localhost:8080/#search`
* **Purpose**: Heuristic NLP + LLM (when configured) matching for emergency aid, skills, and collaborators, with explainable results and semantic ("magic") search.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Search Form | Query Input (`#query`) | Type `need someone who knows first aid and plumbing` | Search string entered. |
| Search Form | `Semantic (magic search)` (`#magic`) | Check the box | Switches the call to POST `/api/search/semantic` (embedding ranking). |
| Action | `Search` (`#run`) | Click button | Calls POST `/api/search`, displays ranked results in `#results` with match scores, matched skills, and clickable member names. |
| Explainability | `Why this match?` (`details.explain`) | Expand on any result | Shows human-readable reason lines (matched skills, trust score, availability, coverage). |
| Feedback | `Good match` / `Poor match` buttons | Click on a result | POSTs `/api/recommendations/feedback` (upsert) and highlights the chosen thumb. |
| Semantic Results | People / Opportunities / Skills / Projects cards | Run magic search (e.g. `mentor for a school STEM robotics club`) | Ranks by cosine similarity (%), shows `low relevance` tags, engine badge (`memory cosine` or `pgvector`). |
| Results | Person names / profile links | Click a result | Navigates to `#profile?id=<ID>`. |

---

### Page 9: AI Team Builder (`#teams`)
* **URL**: `http://localhost:8080/#teams`
* **Purpose**: Form optimal cross-functional teams based on goals and skills.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Setup Form | Goal Input (`#goal`) | Type `Build civic emergency alerting app` | Goal string entered. |
| Setup Form | `#create-project` checkbox | Check (logged in) | Also creates a project & invites the built team. |
| Action | `Build team` (`#run`) | Click button | Calls POST `/api/teams/build`, displays recommended team with skill coverage and success prediction in `#results`. |
| Explainability | `Why this match?` on each member | Expand | Shows each member's coverage, open-need contribution, trust score, and collaboration reasons. |
| Feedback | `Good match` / `Poor match` on members | Click | Records feedback; future team builders shift scores per viewer. |
| Team Results | Member names | Click a member | Navigates to member profile. |

---

### Page 10: Projects List & Workspace (`#projects`, `#project?id=<ID>`)
* **URL**: `http://localhost:8080/#projects`
* **Purpose**: Manage collaborative projects, member invitations, and chat.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Project Creation | Title (`#title`) | Type `Solar Lighting Drive` | Prepares project creation payload. |
| Project Creation | Description (`#desc`) | Type goal | Prepares payload. |
| Project Creation | Timeline (`#timeline`) | Type `2026-08-15 to 2026-08-17` | Optional, prepends timeline. |
| Project Creation | `Create` (`#create`) | Click button | Sends POST `/api/projects`, adds project to `#list`. |
| Project Detail | `#accept` | Click button | Calls POST `/api/projects/:id/respond` (approve), re-renders project view, displays team discussion. |
| Project Detail | `#decline` | Click button | Calls POST `/api/projects/:id/respond` (decline), re-renders view. |
| Project Detail | `#request` | Click button | Sends join request to project owner. |
| Owner Tools | Invite `#invite-id` + `#invite-btn` | Enter user ID, click `Send invite` | Sends project invite (`#invite-msg`). |
| Owner Tools | Member requests | Click approve/reject controls | Approves or rejects applicant, updates member list. |
| Discussion | Message Input (`#msg-body`) | Type `Meeting scheduled for 5 PM` | Input captured. |
| Discussion | `#announce` checkbox | Check (owners only) | Flags message as announcement. |
| Discussion | `Send` (`#send-msg`) | Click button | Sends POST `/api/projects/:id/messages`, appends message to `#discussion`. |

---

### Page 11: Personalized Recommendations (`#recommendations`)
* **URL**: `http://localhost:8080/#recommendations`
* **Purpose**: Algorithmic suggestions for mentors, collaborators, and nearby people, with explainable reasons and a feedback loop that tunes rankings.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Category Cards | Recommendation rows in `#recs` | Inspect | Mentors, volunteers, similar people, and nearby contributors with match reasons. |
| Explainability | `Why this match?` on each recommendation | Expand | Shows matched/teachable skills, trust score, endorsements, availability, volunteer history. |
| Feedback | `Good match` / `Poor match` buttons | Click | POSTs `/api/recommendations/feedback`; up +8 / down −14 (capped ±20) shifts future ranking for this viewer. |
| Person Rows | Clickable member names | Click | Navigates to recommended user profile. |

---

### Page 12: Opportunities Hub (`#opportunities`, `#opportunity?id=<ID>`)
* **URL**: `http://localhost:8080/#opportunities`
* **Purpose**: Volunteer and mentorship listing directory.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Filter | Type (`#type-filter`) + `#refresh` | Select type, click `Filter` | Filters the `#list` grid. |
| Create Form | Type (`#new-type`) | Select `volunteer` | Form input. |
| Create Form | Title (`#new-title`) | Type `Community Web Developer` | Form input. |
| Create Form | Description (`#new-desc`) | Type details | Skills auto-extracted. |
| Create Action | `Post` (`#create`) | Click button | Posts new opportunity via `/api/opportunities` (`#create-msg`). |
| Opportunity Detail | `#apply` | Click button | Submits user application, shows pending badge. |

---

### Page 13: Inbox & Messaging (`#messages`)
* **URL**: `http://localhost:8080/#messages`
* **Purpose**: Unified inbox for notifications/activity and direct messages.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Inbox | `#mark-all-read-cta` | Click button | Marks all notifications read. |
| Inbox | `#inbox-search` | Type keyword | Filters inbox entries. |
| Inbox | `#bulk-mark-read` / `#bulk-clear` | Select rows, click | Marks or clears selected entries. |
| Inbox | `#inbox-stream` rows | Inspect | Renders notifications + activity feed with timestamps. |
| Direct Chat | Recipient (`#dm-to`) | Enter user ID (e.g. from a profile URL) | Loads active conversation. |
| Message Box | Body (`#dm-body`) | Type `Hello Sneha, welcome to the team!` | Input typed. |
| Action | `Send Direct Message` (`#dm-send`) | Click button | Calls POST `/api/messages`, appends to chat log (`#dm-msg`). |

---

### Page 14: Organizations Directory (`#organizations`, `#organization?id=<ID>`)
* **URL**: `http://localhost:8080/#organizations`
* **Purpose**: NGO, school, and club workspace management.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Create Form | Name (`#name`) | Type `Greenwood Eco Club` | Form input. |
| Create Form | Type (`#type`) | Select `ngo` / `school` / `club` | Form input. |
| Create Form | Description (`#desc`) | Type mission | Form input. |
| Create Action | `Create` (`#create`) | Click button | Calls POST `/api/organizations`, creates workspace in `#list`. |

---

### Page 15: Intel & Community Analytics (`#analytics`)
* **URL**: `http://localhost:8080/#analytics`
* **Purpose**: Health index, skill gaps, forecasts, and leadership predictions.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Community Selector | `#cid` select box | Choose `Greenwood Residents Community` | Sets community for analysis. |
| Action | `#load` (`Load dashboard`) | Click button | Calls GET `/api/analytics/community/:id`, renders `#dash`: health index, member metrics, milestones, skill gaps, forecast + crisis risks, emerging leaders. |
| Personalized Insights | Insights card | Inspect (logged in) | Shows trust score, insight messages, and learning recommendations. |

---

### Page 16: Events & Impact Management (`#events`, `#event?id=<ID>`)
* **URL**: `http://localhost:8080/#events`
* **Purpose**: Schedule events, track RSVPs, and record post-event impact reports.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Create Event | Title (`#title`) | Type `First-Aid Certification Workshop` | Prepares event creation. |
| Create Event | Description (`#desc`) + Community (`#cid`) | Fill fields | Prepares payload. |
| Create Action | `Save Event` (`#create`) | Click button | Sends POST `/api/events`, displays in `#list`. |
| Event Bar | Tabs `[data-filter]` (All / Upcoming / Completed) | Click tab | Filters the events grid. |
| Event Detail | `#reg` (`Register`) | Click button | Registers user for event, increments attendee count. |
| Impact Report | Summary (`#impact-summary`), People (`#impact-people`), Hours (`#impact-hours`) | Fill fields | Prepares impact record. |
| Impact Action | `#impact-btn` (`Submit & complete event`) | Click button | Saves impact report, completes event, updates community resilience metrics (`#impact-msg`). |

---

### Page 17: Rewards & Leaderboard (`#leaderboard`)
* **URL**: `http://localhost:8080/#leaderboard`
* **Purpose**: Track community contribution points, achievements, and badges.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Your Rewards (logged in) | Points + achievement badges | Inspect | Shows `points.balance` and unlocked achievement badges. |
| Rankings Table | Leaderboard rows | Inspect | Rows show rank, member name, achievement count, contribution points, and total score. |
| Rankings Table | Member names | Click | Navigates to member profile. |

---

### Page 18: Admin & Moderation Panel (`#admin`)
* **URL**: `http://localhost:8080/#admin`
* **Purpose**: Owner dashboard for user management, moderation, and system logs.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Members | Member badges (`[data-p]`) | Click badge | Navigates to member profile. |
| Moderate | Action (`#mod-action`) | Select `close_opportunity` / `archive_project` | Sets moderation action. |
| Moderate | Target (`#mod-target`) + Reason (`#mod-reason`) | Enter target ID & reason | Prepares moderation payload. |
| Moderate | `Apply` (`#mod-btn`) | Click button | Applies moderation via `/api/gamification/admin/*`, refreshes page (`#mod-msg`). |
| Audit Log | Audit entries card | Inspect | Displays recent system events with timestamps. |
| Open Reports | Reports card | Inspect | Lists reported opportunities/projects with status. |

---

### Page 19: Public Community Hub (`#hub`)
* **URL**: `http://localhost:8080/#hub`
* **Purpose**: Public showcase of active communities, federations, and shared opportunities.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Directory | Community cards (`[data-c]`) | Click `Open community` | Navigates to public community overview. |
| Federation | Federation badges + partnership rows | Inspect | Shows federation links and partnership status. |
| Partnerships | `Accept` (`[data-accept-p]`) | Click (pending partnership) | Accepts partnership, refreshes hub. |
| Propose (logged in) | `#from-c` + `#to-c` | Auto-filled with your communities | Form input. |
| Propose | `Propose` (`#propose`) | Click button | Creates partnership proposal (`#part-msg`). |
| Open Opportunities | Rows (`[data-o]`) | Click `View` | Navigates to opportunity detail. |

---

### Page 20: Emergency Response Center (`#emergency`)
* **URL**: `http://localhost:8080/#emergency`
* **Purpose**: Rapid incident reporting and AI-powered responder ranking.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| Report Incident | Title (`#title`) | Type `Main water line burst in Sector 3` | Input captured. |
| Report Incident | Community (`#cid`) | Auto-filled with first community | Input captured. |
| Report Incident | Severity (`#sev`) | Select `critical` | Severity selected. |
| Action | `Alert responders` (`#open`) | Click button | Sends POST `/api/ecosystem/emergencies`, renders ranked responders (matched skills, ETA, trust, score) in `#detail`. |
| Incidents List | `I can help` (`[data-resp]`) | Click button | Responds to incident with 15-min ETA, refreshes list. |
| Incidents List | `Resolve` (`[data-resolve]`) | Click button (creator) | Resolves incident, updates status. |

> UI shows a `not a substitute for 112/911` badge — the demo must stay clearly advisory.

---

### Page 21: Developer APIs & Integrations (`#developers`)
* **URL**: `http://localhost:8080/#developers`
* **Purpose**: Manage API keys, webhooks, plugins, and third-party integration stubs.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| API Keys | `Generate API key` (`#key`) | Click button | Generates key prefixed with `sm_demo_`, renders in `#key-out` + existing keys list. |
| Webhook Setup | URL (`#wh-url`) | Type `https://example.com/webhook` | Input captured. |
| Webhook Setup | `Create webhook` (`#wh-create`) | Click button | Saves webhook subscription with secret (`#wh-msg`). |
| Webhook Setup | `Test deliver (stub)` (`#wh-test`) | Click button | Records stub deliveries locally, shows count in `#wh-out`. |
| Integrations | `Connect stub` (`[data-p]`) | Click button | Connects integration stub (`connected_stub`), refreshes page. |
| Plugin Marketplace | `Install` (`[data-install]`) | Click button | Installs plugin (e.g. `csv-export`), refreshes page. |

---

### Page 22: Global & SDG Intelligence (`#intelligence`)
* **URL**: `http://localhost:8080/#intelligence`
* **Purpose**: Multi-step explainable AI reasoning, global mesh network, and SDG tracking.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| AI Reasoning | Query (`#q`) | Type `Form an emergency response team for power outage` | Query captured. |
| AI Reasoning | `Reason` (`#reason`) | Click button | Calls POST `/api/intelligence/reason`, outputs multi-step explainable plan steps in `#reason-out`. |
| SDG Impact | Metric (`#metric`) + Value (`#value`) | Type `trees_planted`, `10` | Prepares impact record. |
| SDG Impact | `Log Impact` (`#log-impact`) | Click button | Logs impact; updates `#resilience-score` and `#total-impact-records`. |
| SDG Impact | `Full Impact Logger` (`#open-impact-modal`) | Click button | Opens the global SDG impact modal. |
| Research | `Publish skill snapshot` (`#pub-ds`) | Click button (logged in) | Publishes open dataset snapshot. |
| Passport | `Sync my portable passport` (`#passport`) | Click button (logged in) | Syncs passport credentials, shows result in `#pass-out`. |
| Scenarios | `#scen-cid`, `#scen-members`, `#scen-skill` | Fill fields | Prepares what-if simulation. |
| Scenarios | `Run scenario` (`#scen`) | Click button | Runs simulation, shows predicted health outcomes in `#scen-out`. |

---

### Page 23: Autonomous AI Agents & Twin (`#autonomy`)
* **URL**: `http://localhost:8080/#autonomy`
* **Purpose**: Digital twin monitoring, community memory, and autonomous agent tasks.

| Section | Button / Element | Test Input / Action | Expected Result |
|---|---|---|---|
| OS Pulse | `#pulse` (`Run OS pulse (all agents)`) | Click button | Calls POST `/api/autonomy/os/:communityId/pulse`, executes full agent cycle, renders twin + agent outputs in `#out`. |
| OS Pulse | `#auto-teams` (`Auto-form teams`) | Click button | Auto-forms teams from open opportunities. |
| OS Pulse | `#refresh-twin` (`Refresh digital twin`) | Click button | Refreshes digital twin snapshot. |
| Collective Memory | Prompt (`#prompt`) | Type `How might we improve emergency readiness?` | Input captured. |
| Collective Memory | `Brainstorm` (`#brain`) | Click button | Synthesizes memory items into AI recommendations in `#brain-out`. |

---

## 3. Global Modal Systems

### 🌱 Log SDG Impact Contribution Modal
* **Trigger**: Click `+ Quick Action` → `#qa-log-impact`, or click `#open-impact-modal` on `#intelligence`.

| Form Element | Input / Value | Action / Button | Expected Result |
|---|---|---|---|
| **SDG Category** | `#modal-sdg-select` | Select `SDG 13 - Climate Action` | Sets target SDG tag. |
| **Metric Name** | `#modal-metric` | Type `trees_planted` | Sets impact metric (default `people_helped`). |
| **Contribution Value** | `#modal-val` | Type `10` | Sets numeric contribution (default `5`, min `1`). |
| **Tags / Description** | `#modal-tags` | Type `Greenwood Park Tree Plantation` | Sets tag description. |
| **Submit Button** | `#modal-submit-impact` | Click `Log Impact` | Disables button, shows loading spinner, calls POST `/api/intelligence/impact`, closes modal, shows toast `Impact logged successfully!`, and fires `impactRecorded` event to update metrics on the active page. |
| **Error Surface** | `#impact-modal-msg` | (on failure) | Displays error banner without closing the modal. |
| **Cancel Button** | `#modal-cancel-btn` or `#modal-close` (✕) | Click button | Closes modal immediately without saving. |

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

---

## 5. Automated Backend Test Suite

The 8 integration suites in `backend/src/tests/run_tests.js` cover the same ground at the API/service layer (run from the repo root):

```bash
node backend/src/tests/run_tests.js
```

Suites: DB hydration & seed, crypto auth & JWT, knowledge graph & community dissolution, NLP skill extraction, AI team builder, community analytics & health metrics, autonomous agents engine, and emergency response & SDG impact reporting. See `usage_guide.md` and `system_architecture.md` for context.
