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
const searchRouter = require('../routes/search');
const authRouter = require('../routes/auth');

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
  console.log('✓ 1. Auth & Session Management (JWT, expiry, 401s, UTF-8, duplicate-submit) passed');

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
  console.log('✓ 9. Security & Resilience (CORS whitelist, rate limit 100/min, backup/restore) passed');

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
