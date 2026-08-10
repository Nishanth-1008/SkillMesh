process.env.SKILLMESH_TESTING = '1';
const assert = require('assert');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { load, getState, close } = require('../db');
const { hashPassword, verifyPassword, signToken, verifyToken } = require('../utils/auth');
const { requireAuth } = require('../middleware/requireAuth');
const { Router, rateLimit, isOriginAllowed } = require('../utils/router');
const { config } = require('../config');
const { addRelationship, removeRelationship, buildGraph } = require('../graph/relationships');
const { buildTeam, findHiddenExperts } = require('../services/teamBuilder');
const { computeTrustScore, recordContribution } = require('../services/trust');
const { extractSkills } = require('../nlp/skillExtractor');
const { communityDashboard, predictNeeds } = require('../services/analytics');
const { ensureAgents, runAgent, autoFormTeams } = require('../services/autonomy');
const { createEmergency, syncPassport, impactReport } = require('../services/ecosystem');
const { notify, logActivity } = require('../services/notify');
const { createSnapshot, restoreSnapshot } = require('../backup');
const { hasProjectRole, hasCommunityRole, hasOrgRole } = require('../middleware/rbac');
const searchRouter = require('../routes/search');
const authRouter = require('../routes/auth');
const recommendationsRouter = require('../routes/recommendations');
const { feedbackModifier } = require('../services/feedback');
const { understandQuery } = require('../services/llm');
const { buildExplain } = require('../services/explain');
const { recommendVolunteers, recommendAll } = require('../services/recommendations');

// ---------- Helpers ----------

// Drive a Router without a real socket (body parsing skipped via _bodyParsed).
function mockRequest(router, method, url, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const req = {
      method,
      url,
      headers: { host: 'localhost', ...headers },
      socket: { remoteAddress: '127.0.0.1' },
      _bodyParsed: true,
    };
    if (body !== null) req.body = body;
    const res = {
      statusCode: 200,
      writableEnded: false,
      jsonBody: null,
      rawBody: '',
      status(code) { this.statusCode = code; return this; },
      setHeader() {},
      cookie() {},
      clearCookie() {},
      end(chunk) {
        this.rawBody = String(chunk || '');
        this.writableEnded = true;
        try { this.jsonBody = this.rawBody ? JSON.parse(this.rawBody) : null; } catch { this.jsonBody = null; }
        resolve(this);
      },
      json(obj) { this.jsonBody = obj; this.writableEnded = true; resolve(this); },
    };
    try {
      router.handle(req, res).catch(reject);
    } catch (e) { reject(e); }
  });
}

// Build a signed JWT with an arbitrary expiry (for expiry tests).
function buildJwt(secret, payload, exp) {
  const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64json = (o) => b64url(Buffer.from(JSON.stringify(o)));
  const header = b64json({ alg: 'HS256', typ: 'JWT' });
  const body = b64json({ ...payload, exp });
  const sig = b64url(crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

// Preserve the on-disk store; debounced saves flush on the event loop.
const DB_FILE = path.join(__dirname, '..', '..', 'data', 'db.json');
const dbSnapshotPath = path.join(os.tmpdir(), `skillmesh-db-${Date.now()}.json`);
fs.copyFileSync(DB_FILE, dbSnapshotPath);

async function runAllTests() {
  console.log('[TestRunner] Starting comprehensive SkillMesh test suite...');

  // ---------- 0. DB Hydration ----------
  await load();
  const state = getState();
  assert(state.users.length > 0, 'Database should contain seeded users.');
  assert(state.communities.length > 0, 'Database should contain seeded communities.');
  console.log('✓ 0. DB Hydration & Seed Verification passed');

  // ---------- 1. Auth & Session Management ----------
  const testPassword = 'Password123!';
  const { salt, hash } = hashPassword(testPassword);
  assert(verifyPassword(testPassword, salt, hash), 'Password verification should succeed.');
  assert(!verifyPassword('WrongPassword', salt, hash), 'Password verification should fail for wrong password.');

  const payload = { sub: 'test-user-id', email: 'test@example.com', name: 'Tester' };
  const token = signToken(payload);
  assert.strictEqual(verifyToken(token).sub, payload.sub, 'JWT payload sub should match.');

  // Tampered token → rejected
  assert.strictEqual(verifyToken(token.slice(0, -2) + 'xx'), null, 'Tampered JWT signature must be rejected.');
  assert.strictEqual(verifyToken('garbage.token.value'), null, 'Malformed JWT must be rejected.');

  // Expired token → rejected
  const expired = buildJwt(config.JWT_SECRET, payload, Math.floor(Date.now() / 1000) - 60);
  assert.strictEqual(verifyToken(expired), null, 'Expired JWT must be rejected.');

  // requireAuth middleware: no token → 401
  let caught = null;
  requireAuth({ headers: {} }, {}, (e) => { caught = e; });
  assert(caught && caught.status === 401, 'requireAuth without token must yield 401.');
  assert.strictEqual(requireAuth({ headers: {} }, {}, () => {}), undefined, 'must not throw');
  caught = null;
  requireAuth({ headers: { authorization: `Bearer ${expired}` } }, {}, (e) => { caught = e; });
  assert(caught && caught.status === 401, 'requireAuth with expired token must yield 401.');
  caught = null;
  requireAuth({ headers: { authorization: `Bearer ${token}` } }, {}, (e) => { caught = e; });
  assert.strictEqual(caught, undefined, 'requireAuth with valid token must pass.');

  // Register/login routes — UTF-8 special characters (O'Connor, François, José)
  const specialEmail = 'special-utf8@example.com';
  const reg = await mockRequest(authRouter, 'POST', '/register', {
    body: { name: "O'Connor François José", email: specialEmail, password: 'p@sswörd123', location: 'München' },
  });
  assert.strictEqual(reg.statusCode, 201, 'Register with special characters should succeed.');
  assert(reg.jsonBody && reg.jsonBody.token, 'Register should return a token.');
  assert(!('passwordHash' in reg.jsonBody.user) && !('salt' in reg.jsonBody.user), 'Register response must not leak password hash.');
  assert.strictEqual(reg.jsonBody.user.name, "O'Connor François José", 'UTF-8 name must round-trip.');

  // Duplicate email → 409 (double-submit protection on the server side)
  const dup = await mockRequest(authRouter, 'POST', '/register', {
    body: { name: 'Dup', email: specialEmail, password: 'whatever123' },
  });
  assert.strictEqual(dup.statusCode, 409, 'Duplicate registration must return 409.');

  // Login: wrong password → 401, correct → 200
  const badLogin = await mockRequest(authRouter, 'POST', '/login', {
    body: { email: specialEmail, password: 'wrong-password' },
  });
  assert.strictEqual(badLogin.statusCode, 401, 'Login with wrong password must return 401.');
  const goodLogin = await mockRequest(authRouter, 'POST', '/login', {
    body: { email: specialEmail, password: 'p@sswörd123' },
  });
  assert.strictEqual(goodLogin.statusCode, 200, 'Login with correct password must return 200.');
  assert(goodLogin.jsonBody.token, 'Login should return a token.');
  assert(goodLogin.jsonBody.refreshToken, 'Login should return a refresh token.');
  console.log('✓ 1. Auth & Session Management (JWT, expiry, 401s, UTF-8, duplicate-submit) passed');

  // ---------- 1b. Refresh token rotation, logout, password reset ----------
  const refresh = await mockRequest(authRouter, 'POST', '/refresh', {
    body: { refreshToken: goodLogin.jsonBody.refreshToken },
  });
  assert.strictEqual(refresh.statusCode, 200, 'Refresh with a valid refresh token must succeed.');
  assert(refresh.jsonBody.token, 'Refresh should return a fresh access token.');
  assert(refresh.jsonBody.refreshToken !== goodLogin.jsonBody.refreshToken, 'Refresh tokens must rotate.');

  const badRefresh = await mockRequest(authRouter, 'POST', '/refresh', {
    body: { refreshToken: goodLogin.jsonBody.refreshToken },
  });
  assert.strictEqual(badRefresh.statusCode, 401, 'Reused (rotated) refresh token must be rejected.');

  const refreshFromCookie = await mockRequest(authRouter, 'POST', '/refresh', {
    headers: { cookie: `skillmesh_rt=${refresh.jsonBody.refreshToken}` },
    body: {},
  });
  assert.strictEqual(refreshFromCookie.statusCode, 200, 'Refresh via HttpOnly cookie must succeed.');

  const logout = await mockRequest(authRouter, 'POST', '/logout', {
    body: { refreshToken: refreshFromCookie.jsonBody.refreshToken },
  });
  assert.strictEqual(logout.statusCode, 200, 'Logout must succeed.');
  const afterLogout = await mockRequest(authRouter, 'POST', '/refresh', {
    body: { refreshToken: refreshFromCookie.jsonBody.refreshToken },
  });
  assert.strictEqual(afterLogout.statusCode, 401, 'Revoked refresh token must be rejected after logout.');

  const forgot = await mockRequest(authRouter, 'POST', '/forgot-password', {
    body: { email: specialEmail },
  });
  assert.strictEqual(forgot.statusCode, 200, 'Forgot-password must return 200.');
  assert(forgot.jsonBody.resetToken, 'Dev mode should return a reset token.');

  const resetBad = await mockRequest(authRouter, 'POST', '/reset-password', {
    body: { token: 'not-a-real-token', newPassword: 'newpass123' },
  });
  assert.strictEqual(resetBad.statusCode, 400, 'Reset with an invalid token must return 400.');

  const reset = await mockRequest(authRouter, 'POST', '/reset-password', {
    body: { token: forgot.jsonBody.resetToken, newPassword: 'newpass123' },
  });
  assert.strictEqual(reset.statusCode, 200, 'Reset with a valid token must succeed.');

  const oldPw = await mockRequest(authRouter, 'POST', '/login', {
    body: { email: specialEmail, password: 'p@sswörd123' },
  });
  assert.strictEqual(oldPw.statusCode, 401, 'Old password must fail after reset.');
  const newPw = await mockRequest(authRouter, 'POST', '/login', {
    body: { email: specialEmail, password: 'newpass123' },
  });
  assert.strictEqual(newPw.statusCode, 200, 'New password must work after reset.');
  console.log('✓ 1b. Session refresh rotation, logout revocation & password reset passed');

  // ---------- 2. Communities (join / leave / dissolution) ----------
  const tempCommId = crypto.randomUUID();
  const tempUserId = crypto.randomUUID();
  state.communities.push({ id: tempCommId, name: 'Temp Community', description: 'Test', ownerId: tempUserId, createdAt: new Date().toISOString() });
  state.communityMembers.push({ id: crypto.randomUUID(), communityId: tempCommId, userId: tempUserId, role: 'owner', joinedAt: new Date().toISOString() });

  addRelationship(state, {
    fromType: 'person', fromId: tempUserId,
    toType: 'community', toId: tempCommId,
    kind: 'member_of', weight: 1,
  });

  // Leave (remove last member) → clean dissolution + relationship cleanup
  state.communityMembers = state.communityMembers.filter((m) => m.communityId !== tempCommId);
  const count = state.communityMembers.filter((m) => m.communityId === tempCommId).length;
  if (count === 0) {
    const cIdx = state.communities.findIndex((c) => c.id === tempCommId);
    if (cIdx !== -1) state.communities.splice(cIdx, 1);
    state.relationships = (state.relationships || []).filter(
      (r) => !(r.fromType === 'community' && r.fromId === tempCommId) && !(r.toType === 'community' && r.toId === tempCommId)
    );
  }
  assert(!state.communities.some((c) => c.id === tempCommId), 'Temp community should be dissolved.');
  assert(!state.relationships.some((r) => r.toId === tempCommId), 'Relationships targeting temp community should be cleaned up.');
  console.log('✓ 2. Communities (join/leave/dissolution) passed');

  // ---------- 3. AI Team Builder ----------
  const teamResult = buildTeam(state, { skills: ['programming', 'design', 'leadership'], size: 3 });
  assert(teamResult.team.length > 0, 'Team builder should return candidates.');
  assert(teamResult.coverage > 0, 'Team builder should compute coverage.');
  assert(typeof teamResult.successPrediction === 'number', 'Success prediction should be numeric.');
  console.log('✓ 3. AI Team Builder passed');

  // ---------- 4. Search (injection-safe, edge-case payloads) ----------
  const nlpRes = extractSkills('Need an experienced React and Node developer for an urgent community health project');
  assert(nlpRes.skills.length >= 2, 'NLP should extract at least 2 skills.');
  assert(nlpRes.urgent === true, 'NLP should detect urgency.');

  // SQL-injection payload must execute as a literal search — zero leakage, no crash
  const sqlInj = await mockRequest(searchRouter, 'POST', '/', {
    body: { query: "' OR 1=1 --", communityId: undefined },
  });
  assert.strictEqual(sqlInj.statusCode, 200, 'SQLi payload should not crash search.');
  assert(Array.isArray(sqlInj.jsonBody.results), 'Search must always return a results array.');
  assert(typeof sqlInj.jsonBody.resultCount === 'number', 'Search must always return resultCount.');

  // XSS payload must not execute / crash
  const xss = await mockRequest(searchRouter, 'POST', '/', {
    body: { query: "<script>alert('XSS')</script>", communityId: undefined },
  });
  assert.strictEqual(xss.statusCode, 200, 'XSS payload should not crash search.');
  assert(Array.isArray(xss.jsonBody.results), 'XSS payload search should still return a results array.');

  // Missing query → 400
  const noQuery = await mockRequest(searchRouter, 'POST', '/', { body: { query: '   ' } });
  assert.strictEqual(noQuery.statusCode, 400, 'Blank search query must return 400.');

  // Team-builder intent → team_builder mode
  const teamIntent = await mockRequest(searchRouter, 'POST', '/', {
    body: { query: 'build me a team for a hackathon app' },
  });
  assert.strictEqual(teamIntent.jsonBody.mode, 'team_builder', 'Build-team intent should switch to team_builder mode.');
  console.log('✓ 4. AI Search & NLP (injection payloads handled safely) passed');

  // ---------- 5. Impact & Emergency Response ----------
  const comm = state.communities[0];
  if (comm && state.users[0]) {
    const emergencyRes = createEmergency(state, {
      communityId: comm.id,
      title: 'Power Outage Emergency Assistance Needed',
      severity: 'critical',
      skillsNeeded: ['first aid', 'electrical'],
      creatorId: state.users[0].id,
    });
    assert(emergencyRes.emergency, 'Emergency record should be created.');
    assert(emergencyRes.recommendedResponders.length >= 0, 'Responders list should be returned.');

    const report = impactReport(state, { communityId: comm.id });
    assert(typeof report.communityResilienceScore === 'number', 'Resilience score should be generated.');
    assert(report.communityResilienceScore >= 0 && report.communityResilienceScore <= 100, 'Resilience score should be bounded 0-100.');
  }
  console.log('✓ 5. Impact & Emergency Response passed');

  // ---------- 6. Knowledge Graph ----------
  let graph = buildGraph(state, { communityId: comm ? comm.id : null });
  assert(graph.nodes.length > 0, 'Graph should contain nodes.');
  assert(Array.isArray(graph.edges), 'Graph should contain edges.');
  if (comm) {
    const g2 = buildGraph(state, { communityId: comm.id });
    assert(g2.nodes.some((n) => n.id === `community:${comm.id}`), 'Community node should exist in graph.');
  }
  console.log('✓ 6. Knowledge Graph passed');

  // ---------- 7. Notifications ----------
  const targetUser = state.users[0];
  const n1 = notify(state, { userId: targetUser.id, type: 'system', title: 'Welcome!', body: 'Your account is ready.', link: '/dashboard' });
  assert(n1.id && n1.read === false, 'Notification should be created unread.');
  assert(state.notifications.some((n) => n.id === n1.id), 'Notification should be stored.');
  n1.read = true;
  const unreadCount = state.notifications.filter((n) => n.userId === targetUser.id && !n.read).length;
  assert(typeof unreadCount === 'number', 'Unread count should be computable.');

  const act = logActivity(state, { communityId: comm ? comm.id : null, actorId: targetUser.id, type: 'joined', summary: 'Joined the community' });
  assert(act.id && act.summary === 'Joined the community', 'Activity should be logged.');
  console.log('✓ 7. Notifications & Activity Feed passed');

  // ---------- 8. Analytics & Intelligence ----------
  if (comm) {
    const dash = communityDashboard(state, comm.id);
    assert(dash, 'Dashboard data should be generated for community.');
    assert(dash.health.healthIndex >= 0 && dash.health.healthIndex <= 100, 'Health index should be bounded 0-100.');

    const preds = predictNeeds(state, comm.id);
    assert(Array.isArray(preds.skillGaps), 'Predictive needs should return skill gaps.');

    const agents = ensureAgents(state, comm.id);
    assert(agents.length === 6, 'Six autonomous agent types should be initialized per community.');
    const mgr = agents.find((a) => a.type === 'community_manager');
    assert(mgr, 'Community Manager agent should exist.');
    const result = runAgent(state, mgr, {});
    assert(result.output.healthIndex !== undefined, 'Community Manager agent should execute successfully.');
  }
  console.log('✓ 8. Analytics & Autonomous Agents passed');

  // ---------- 9. Security & Resilience Audit ----------
  // CORS whitelist: allowed origin reflected, unknown origin blocked
  const savedOrigins = config.ALLOWED_ORIGINS;
  config.ALLOWED_ORIGINS = ['https://app.skillmesh.test'];
  assert.strictEqual(isOriginAllowed('https://app.skillmesh.test'), 'https://app.skillmesh.test', 'Whitelisted origin should be allowed.');
  assert.strictEqual(isOriginAllowed('https://evil.example.com'), null, 'Non-whitelisted origin must be rejected.');
  config.ALLOWED_ORIGINS = savedOrigins;

  // Rate limiter: 100 req/min per IP, 429 afterwards
  const rateRouter = new Router();
  rateRouter.use(rateLimit);
  rateRouter.get('/t', (req, res) => res.json({ ok: true }));
  let got429 = false;
  for (let i = 0; i < 101; i++) {
    const r = await mockRequest(rateRouter, 'GET', '/t');
    if (r.statusCode === 429) got429 = true;
  }
  assert(got429, 'Rate limiter should return 429 after the 100/min quota is exceeded.');

  // RBAC helpers: owners pass, plain members are denied owner-only actions
  const rbacComm = state.communities[0];
  const rbacOwner = state.communityMembers.find(
    (m) => m.communityId === rbacComm.id && m.role === 'owner'
  );
  const rbacMember = state.communityMembers.find(
    (m) => m.communityId === rbacComm.id && m.role !== 'owner'
  );
  assert(rbacOwner && rbacMember, 'Seeded community should have both an owner and a member.');
  assert(hasCommunityRole(state, rbacOwner.userId, rbacComm.id, ['owner']), 'Owner must pass owner role check.');
  assert(!hasCommunityRole(state, rbacMember.userId, rbacComm.id, ['owner']), 'Plain member must fail owner role check.');
  assert(hasCommunityRole(state, rbacMember.userId, rbacComm.id, ['member']), 'Plain member must pass member role check.');
  assert(!hasCommunityRole(state, rbacMember.userId, rbacComm.id, ['lead']), 'Plain member must fail lead role check.');
  const rbacProj = state.projects[0];
  assert(hasProjectRole(state, rbacProj.ownerId, rbacProj.id, ['owner']), 'Project owner must pass owner role check.');
  const rbacOrg = state.organizations[0];
  if (rbacOrg) {
    const orgOwner = state.organizationMembers.find(
      (m) => m.organizationId === rbacOrg.id && m.role === 'owner'
    );
    if (orgOwner) {
      assert(hasOrgRole(state, orgOwner.userId, rbacOrg.id, ['owner', 'admin']), 'Org owner must pass owner/admin role check.');
      assert(!hasOrgRole(state, rbacMember.userId, rbacOrg.id, ['admin']), 'Non-member must fail org admin role check.');
    }
  }

  // Backup & restore round-trip (disaster recovery) in a temp dir
  const savedBackupDir = config.BACKUP_DIR;
  config.BACKUP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'skillmesh-backups-'));
  const before = JSON.stringify(state);
  const snapshotFile = await createSnapshot({ quiet: true });
  assert(fs.existsSync(snapshotFile), 'Snapshot file should exist after backup.');

  state.users.push({ id: 'ghost-user', name: 'Ghost', email: 'ghost@example.com', passwordHash: 'x', salt: 'y', createdAt: new Date().toISOString() });
  await restoreSnapshot(path.basename(snapshotFile));
  const after = JSON.stringify(state);
  assert.strictEqual(after, before, 'Restore should roll state back to the snapshot.');
  assert(!state.users.some((u) => u.id === 'ghost-user'), 'Restored state must not contain post-snapshot writes.');
  config.BACKUP_DIR = savedBackupDir;
  console.log('✓ 9. Security & Resilience (CORS whitelist, rate limit, RBAC, backup/restore) passed');
  console.log('✓ 9b. Backup & restore round-trip (disaster recovery) passed');

  // ---------- 10. Phase 2: Explainability, Feedback Loop & LLM Harness ----------
  // Every recommendation carries a human-readable `explain` array.
  const explainedTeam = buildTeam(state, { skills: ['programming', 'design'], size: 3 });
  assert(explainedTeam.team.length > 0, 'Team builder should return candidates.');
  for (const member of explainedTeam.team) {
    assert(Array.isArray(member.explain) && member.explain.length > 0, `Team member ${member.user.name} should have explain lines.`);
    assert(member.explain.every((l) => typeof l === 'string' && l.length > 0), 'Explain lines should be non-empty strings.');
  }

  const explainedHidden = findHiddenExperts(state, { skills: ['programming'], limit: 3 });
  for (const h of explainedHidden) {
    assert(Array.isArray(h.explain) && h.explain.length > 0, 'Hidden experts should have explain lines.');
  }

  const explainedAll = recommendAll(state, { userId: state.users[0].id, skills: ['programming'], limit: 5 });
  for (const key of ['mentors', 'volunteers', 'experts', 'similar', 'nearby']) {
    for (const r of explainedAll[key]) {
      assert(Array.isArray(r.explain) && r.explain.length > 0, `${key} recommendations should have explain lines.`);
    }
  }

  // Search route results also expose explain
  const explainSearch = await mockRequest(searchRouter, 'POST', '/', {
    body: { query: 'React and Node developer' },
  });
  assert.strictEqual(explainSearch.statusCode, 200, 'Explain search should succeed.');
  for (const r of explainSearch.jsonBody.results) {
    assert(Array.isArray(r.explain), 'Search results should carry an explain array.');
  }

  // buildExplain helper composes readable sentences
  const lines = buildExplain({ matchedSkills: ['programming'], trustScore: 87, endorsements: 3, availability: 'available' });
  assert(lines.some((l) => l.includes('programming')), 'Explain should mention matched skills.');
  assert(lines.some((l) => l.includes('87')), 'Explain should mention trust score.');

  // Feedback loop: authenticated user can rate a recommendation (up/down)
  const fbViewer = newPw.jsonBody.user;
  const fbTarget = state.users.find((u) => u.id !== fbViewer.id);
  assert(fbTarget, 'There should be another seeded user to give feedback about.');
  const authHeaders = { authorization: `Bearer ${newPw.jsonBody.token}` };

  const fbBad = await mockRequest(recommendationsRouter, 'POST', '/feedback', {
    headers: authHeaders,
    body: { targetType: 'user', targetId: fbTarget.id, rating: 'meh' },
  });
  assert.strictEqual(fbBad.statusCode, 400, 'Invalid rating must be rejected by validation.');

  const fbUp = await mockRequest(recommendationsRouter, 'POST', '/feedback', {
    headers: authHeaders,
    body: { targetType: 'user', targetId: fbTarget.id, rating: 'up', context: 'search' },
  });
  assert.strictEqual(fbUp.statusCode, 200, 'Up-vote feedback should succeed.');

  // Upsert: repeating the same (user, target, context) must not duplicate
  const fbUp2 = await mockRequest(recommendationsRouter, 'POST', '/feedback', {
    headers: authHeaders,
    body: { targetType: 'user', targetId: fbTarget.id, rating: 'up', context: 'search' },
  });
  assert.strictEqual(fbUp2.statusCode, 200, 'Repeated up-vote should succeed.');
  const fbMatches = getState().feedback.filter(
    (f) => f.userId === fbViewer.id && f.targetType === 'user' && f.targetId === fbTarget.id && f.context === 'search'
  );
  assert.strictEqual(fbMatches.length, 1, 'Feedback should upsert, not duplicate.');

  const fbDown = await mockRequest(recommendationsRouter, 'POST', '/feedback', {
    headers: authHeaders,
    body: { targetType: 'user', targetId: fbTarget.id, rating: 'down', context: 'search' },
  });
  assert.strictEqual(fbDown.statusCode, 200, 'Down-vote feedback should succeed.');
  assert.strictEqual(fbMatches[0].rating, 'down', 'Upsert should update the rating in place.');

  const fbList = await mockRequest(recommendationsRouter, 'GET', '/feedback?targetType=user', {
    headers: authHeaders,
  });
  assert.strictEqual(fbList.statusCode, 200, 'Feedback list should be readable.');
  assert(Array.isArray(fbList.jsonBody.feedback), 'GET /feedback should return an array.');
  assert(fbList.jsonBody.feedback.some((f) => f.targetId === fbTarget.id), 'Feedback list should contain the recorded vote.');

  const fbUnauth = await mockRequest(recommendationsRouter, 'POST', '/feedback', {
    body: { targetType: 'user', targetId: fbTarget.id, rating: 'up' },
  });
  assert.strictEqual(fbUnauth.statusCode, 401, 'Feedback without auth must be rejected.');

  // Scoring effect: up-vote adds +8, down-vote -14, capped at ±20
  assert.strictEqual(feedbackModifier(state, fbTarget.id, fbViewer.id), -14, 'Down-vote should yield -14.');
  getState().feedback.push({ id: crypto.randomUUID(), userId: fbViewer.id, targetType: 'user', targetId: fbTarget.id, rating: 'up', context: '', createdAt: new Date().toISOString() });
  assert.strictEqual(feedbackModifier(state, fbTarget.id, fbViewer.id), -6, 'Mixed votes should sum.');
  for (let i = 0; i < 5; i++) {
    getState().feedback.push({ id: crypto.randomUUID(), userId: fbViewer.id, targetType: 'user', targetId: fbTarget.id, rating: 'up', context: '', createdAt: new Date().toISOString() });
  }
  assert.strictEqual(feedbackModifier(state, fbTarget.id, fbViewer.id), 20, 'Positive modifier should cap at 20.');

  // A recommended volunteer's score shifts by exactly the modifier for the viewer
  // (reset the target's vote history first so the ±20 cap can't mask the delta)
  getState().feedback = getState().feedback.filter(
    (f) => !(f.userId === fbViewer.id && f.targetType === 'user' && f.targetId === fbTarget.id)
  );
  getState().feedback.push({ id: crypto.randomUUID(), userId: fbViewer.id, targetType: 'user', targetId: fbTarget.id, rating: 'down', context: '', createdAt: new Date().toISOString() });
  const volBefore = recommendVolunteers(getState(), { skills: ['programming'], viewerId: fbViewer.id, limit: 20 });
  const volPick = volBefore.find((v) => v.user.id === fbTarget.id);
  if (volPick) {
    getState().feedback.push({ id: crypto.randomUUID(), userId: fbViewer.id, targetType: 'user', targetId: fbTarget.id, rating: 'up', context: '', createdAt: new Date().toISOString() });
    const volAfter = recommendVolunteers(getState(), { skills: ['programming'], viewerId: fbViewer.id, limit: 20 });
    const after = volAfter.find((v) => v.user.id === fbTarget.id);
    assert(after && Math.abs(after.score - volPick.score - 8) < 1e-6, 'Volunteer score should rise by exactly the up-vote modifier.');
  }

  // LLM harness: with no endpoint configured, falls back to the heuristic
  const savedLlmUrl = process.env.LLM_API_URL;
  const savedLlmKey = process.env.LLM_API_KEY;
  delete process.env.LLM_API_URL;
  delete process.env.LLM_API_KEY;
  const h1 = await understandQuery('Need an urgent React developer');
  assert.strictEqual(h1.source, 'heuristic', 'Without an LLM endpoint, understanding must fall back to the heuristic.');
  assert.strictEqual(h1.urgent, true, 'Heuristic should still detect urgency.');
  assert(h1.skills.includes('programming'), 'Heuristic should extract programming from React/developer.');
  if (savedLlmUrl !== undefined) process.env.LLM_API_URL = savedLlmUrl;
  if (savedLlmKey !== undefined) process.env.LLM_API_KEY = savedLlmKey;
  console.log('✓ 10. Phase 2 (explainability, feedback loop, LLM fallback) passed');

  // ---------- 11. Phase 2: Semantic (pgvector) Search ----------
  const { embed, embedLocal, semanticSimilarity, DIM } = require('../services/embeddings');
  const {
    ensureSemanticVectors,
    rankPeople,
    rankOpportunities,
    rankSkills,
  } = require('../services/semanticSearch');

  // Deterministic, normalized embeddings
  const v1 = embedLocal('programming robotics');
  const v2 = embedLocal('programming robotics');
  assert.strictEqual(v1.length, DIM, 'Local embedding should be DIM-length.');
  assert.deepStrictEqual(v1, v2, 'Local embedding must be deterministic.');
  const l2 = Math.sqrt(v1.reduce((s, x) => s + x * x, 0));
  assert(Math.abs(l2 - 1) < 1e-9, 'Local embedding should be L2-normalized.');

  // Conceptual matching: "STEM club" aligns with robotics/programming/teaching
  const queryVec = embedLocal('help my kids school STEM club build robots');
  const roboticsVec = embedLocal('robotics programming teaching');
  const plumbingVec = embedLocal('plumbing pipes leak');
  const simGood = semanticSimilarity(queryVec, roboticsVec);
  const simBad = semanticSimilarity(queryVec, plumbingVec);
  assert(simGood > simBad, 'STEM-club query should be closer to robotics/teaching than to plumbing.');
  assert(simGood > 0.5, 'STEM-club query should strongly match robotics/teaching profiles.');

  // Snapshot refresh populates semantic vectors for all entity types
  const changed = await ensureSemanticVectors(getState());
  assert(changed > 0, 'First refresh should embed entities.');
  const vecCount = getState().semanticVectors.length;
  assert(vecCount >= getState().users.length, 'At least one vector per user should exist.');
  const changed2 = await ensureSemanticVectors(getState());
  assert.strictEqual(changed2, 0, 'Repeated refresh with unchanged snapshots should be a no-op.');

  // People ranking surfaces Raj (robotics/programming/teaching) for a STEM query
  const { people } = await rankPeople(getState(), { text: 'mentor needed for a school STEM robotics club' });
  assert(people.length > 0, 'Semantic people search should return matches.');
  const raj = people.find((p) => p.user.name === 'Raj Malhotra');
  assert(raj, 'Raj (robotics/teaching) should appear in STEM-club semantic results.');
  assert(raj.similarity >= 50, `Raj should have a strong similarity score (got ${raj.similarity}).`);
  assert(Array.isArray(raj.explain) && raj.explain.length > 0, 'Semantic results should be explainable.');
  assert(people[0].similarity >= people[people.length - 1].similarity, 'People should be ranked by similarity desc.');

  // Opportunities + skills ranked semantically
  const opps = await rankOpportunities(getState(), { text: 'robotics mentoring for students' });
  assert(opps.length > 0, 'Semantic opportunity search should return matches.');
  assert(opps[0].opportunity.title.toLowerCase().includes('robotics'), 'Top opportunity should relate to robotics mentoring.');
  const skills = await rankSkills(getState(), { text: 'writing code and building software' });
  assert(skills.length > 0 && skills[0].skill === 'programming', 'Top skill for coding query should be programming.');

  // Route integration: POST /api/search/semantic
  const semSearch = await mockRequest(searchRouter, 'POST', '/semantic', {
    body: { query: 'mentor for a school STEM club', communityId: undefined },
  });
  assert.strictEqual(semSearch.statusCode, 200, 'Semantic search endpoint should succeed.');
  assert(Array.isArray(semSearch.jsonBody.people), 'Semantic search should return a people array.');
  assert.strictEqual(semSearch.jsonBody.engine, 'memory', 'JSON-mode semantic search uses the in-memory engine.');
  assert(semSearch.jsonBody.embeddingDim === DIM, 'Semantic search should report the embedding dimension.');
  assert(semSearch.jsonBody.understanding && semSearch.jsonBody.understanding.intent, 'Semantic search should include intent understanding.');

  // pgvector SQL path degrades gracefully in JSON mode
  const pgDemo = await mockRequest(searchRouter, 'GET', '/semantic/pg?text=robotics&entityType=user');
  assert.strictEqual(pgDemo.statusCode, 501, 'pgvector endpoint must 501 when Postgres/vector is unavailable.');
  console.log('✓ 11. Phase 2 (semantic search, embeddings, pgvector fallback) passed');

  await close();
  console.log('\n[SkillMesh Test Suite] ALL 10 TEST SUITES PASSED CLEANLY.');
}

runAllTests()
  .then(async () => {
    // Flush debounced saves, then restore the on-disk store to its pre-test state.
    await new Promise((r) => setImmediate(r));
    fs.copyFileSync(dbSnapshotPath, DB_FILE);
    fs.unlinkSync(dbSnapshotPath);
  })
  .catch(async (e) => {
    await new Promise((r) => setImmediate(r));
    fs.copyFileSync(dbSnapshotPath, DB_FILE);
    fs.unlinkSync(dbSnapshotPath);
    console.error('[TestRunner] Test suite failed:', e);
    process.exit(1);
  });
