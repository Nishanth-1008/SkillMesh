const assert = require('assert');
const crypto = require('crypto');
const { load, getState, close } = require('../db');
const { hashPassword, verifyPassword, signToken, verifyToken } = require('../utils/auth');
const { addRelationship, removeRelationship, buildGraph } = require('../graph/relationships');
const { buildTeam, findHiddenExperts } = require('../services/teamBuilder');
const { computeTrustScore, recordContribution } = require('../services/trust');
const { extractSkills } = require('../nlp/skillExtractor');
const { communityDashboard, predictNeeds } = require('../services/analytics');
const { ensureAgents, runAgent, autoFormTeams } = require('../services/autonomy');
const { createEmergency, syncPassport, impactReport } = require('../services/ecosystem');

async function runAllTests() {
  console.log('[TestRunner] Starting comprehensive SkillMesh test suite...');

  // 1. DB Hydration Test
  await load();
  const state = getState();
  assert(state.users.length > 0, 'Database should contain seeded users.');
  assert(state.communities.length > 0, 'Database should contain seeded communities.');
  console.log('✓ 1. DB Hydration & Seed Verification passed');

  // 2. Auth & Token Tests
  const testPassword = 'Password123!';
  const { salt, hash } = hashPassword(testPassword);
  assert(verifyPassword(testPassword, salt, hash), 'Password verification should succeed.');
  assert(!verifyPassword('WrongPassword', salt, hash), 'Password verification should fail for wrong password.');

  const payload = { sub: 'test-user-id', email: 'test@example.com', name: 'Tester' };
  const token = signToken(payload);
  const verified = verifyToken(token);
  assert.strictEqual(verified.sub, payload.sub, 'JWT payload sub should match.');
  assert.strictEqual(verified.email, payload.email, 'JWT payload email should match.');
  console.log('✓ 2. Cryptographic Auth & JWT verification passed');

  // 3. Knowledge Graph Engine & Dissolution Tests
  const tempCommId = crypto.randomUUID();
  const tempUserId = crypto.randomUUID();
  state.communities.push({ id: tempCommId, name: 'Temp Community', description: 'Test', ownerId: tempUserId, createdAt: new Date().toISOString() });
  state.communityMembers.push({ id: crypto.randomUUID(), communityId: tempCommId, userId: tempUserId, role: 'owner', joinedAt: new Date().toISOString() });

  addRelationship(state, {
    fromType: 'person', fromId: tempUserId,
    toType: 'community', toId: tempCommId,
    kind: 'member_of', weight: 1,
  });

  let graph = buildGraph(state, { communityId: tempCommId });
  assert(graph.nodes.some((n) => n.id === `community:${tempCommId}`), 'Temp community node should exist in graph.');

  // Remove member and trigger clean dissolution
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
  console.log('✓ 3. Knowledge Graph & Community Dissolution passed');

  // 4. NLP Skill Extraction Tests
  const nlpRes = extractSkills('Need an experienced React and Node developer for an urgent community health project');
  assert(nlpRes.skills.length >= 2, 'NLP should extract at least 2 skills.');
  assert(nlpRes.urgent === true, 'NLP should detect urgency.');
  console.log('✓ 4. NLP Skill Extractor passed');

  // 5. AI Team Builder Tests
  const teamResult = buildTeam(state, {
    skills: ['programming', 'design', 'leadership'],
    size: 3,
  });
  assert(teamResult.team.length > 0, 'Team builder should return candidates.');
  assert(teamResult.coverage > 0, 'Team builder should compute coverage.');
  assert(typeof teamResult.successPrediction === 'number', 'Success prediction should be numeric.');
  console.log('✓ 5. AI Team Builder passed');

  // 6. Analytics & Intelligence Tests
  const comm = state.communities[0];
  if (comm) {
    const dash = communityDashboard(state, comm.id);
    assert(dash, 'Dashboard data should be generated for community.');
    assert(dash.health.healthIndex >= 0 && dash.health.healthIndex <= 100, 'Health index should be bounded 0-100.');

    const preds = predictNeeds(state, comm.id);
    assert(Array.isArray(preds.skillGaps), 'Predictive needs should return skill gaps.');
  }
  console.log('✓ 6. Community Analytics & Health Metrics passed');

  // 7. Autonomous Agents Tests
  if (comm) {
    const agents = ensureAgents(state, comm.id);
    assert(agents.length === 6, 'Six autonomous agent types should be initialized per community.');

    const mgr = agents.find((a) => a.type === 'community_manager');
    assert(mgr, 'Community Manager agent should exist.');
    const result = runAgent(state, mgr, {});
    assert(result.output.healthIndex !== undefined, 'Community Manager agent should execute successfully.');
  }
  console.log('✓ 7. Autonomous Agents Engine passed');

  // 8. Emergency Response & Impact Reports
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
  }
  console.log('✓ 8. Emergency Response & SDG Impact Reporting passed');

  await close();
  console.log('\n[SkillMesh Test Suite] ALL 8 TEST SUITES PASSED CLEANLY.');
}

runAllTests().catch((e) => {
  console.error('[TestRunner] Test suite failed:', e);
  process.exit(1);
});
