const crypto = require('crypto');
const { Router } = require('../utils/router');
const { getState, save } = require('../db');
const { requireAuth } = require('../middleware/requireAuth');
const { addRelationship } = require('../graph/relationships');
const { computeTrustScore } = require('../services/trust');

const router = new Router();

function findOrCreateSkill(state, name) {
  const canonical = name.trim().toLowerCase();
  let skill = state.skills.find((s) => s.name === canonical);
  if (!skill) {
    skill = { id: crypto.randomUUID(), name: canonical };
    state.skills.push(skill);
  }
  return skill;
}

function serializeProfile(state, user) {
  const { passwordHash, salt, ...publicFields } = user;
  const skills = state.userSkills
    .filter((us) => us.userId === user.id)
    .map((us) => {
      const skill = state.skills.find((s) => s.id === us.skillId);
      return { id: us.id, skill: skill ? skill.name : 'unknown', level: us.level, source: us.source };
    });
  const communities = state.communityMembers
    .filter((m) => m.userId === user.id)
    .map((m) => {
      const community = state.communities.find((c) => c.id === m.communityId);
      return community ? { id: community.id, name: community.name, role: m.role } : null;
    })
    .filter(Boolean);
  const trust = computeTrustScore(state, user.id);
  const badges = (state.badges || []).filter((b) => b.userId === user.id);
  const endorsements = (state.endorsements || [])
    .filter((e) => e.toUserId === user.id)
    .map((e) => {
      const from = state.users.find((u) => u.id === e.fromUserId);
      const skill = state.skills.find((s) => s.id === e.skillId);
      return {
        id: e.id,
        from: from ? { id: from.id, name: from.name } : null,
        skill: skill ? skill.name : null,
        note: e.note,
      };
    });
  return { ...publicFields, skills, communities, trust, badges, endorsements };
}

router.get('/:id', (req, res, next) => {
  try {
    const state = getState();
    const user = state.users.find((u) => u.id === req.params.id);
    if (!user) {
      const err = new Error('Profile not found');
      err.status = 404;
      throw err;
    }
    res.json({ profile: serializeProfile(state, user) });
  } catch (e) { next(e); }
});

router.put('/me', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const user = state.users.find((u) => u.id === req.user.id);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }
    const { name, location, availability, bio, interests } = req.body;
    if (name !== undefined) user.name = name;
    if (location !== undefined) user.location = location;
    if (availability !== undefined) user.availability = availability;
    if (bio !== undefined) user.bio = bio;
    if (interests !== undefined) user.interests = interests;
    save();
    res.json({ profile: serializeProfile(state, user) });
  } catch (e) { next(e); }
});

// Add/update a skill on the current user's profile. This is also where the
// person node <-> skill node edge is written into the knowledge graph.
router.post('/me/skills', requireAuth, (req, res, next) => {
  try {
    const { skill, level } = req.body;
    if (!skill) {
      const err = new Error('skill is required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const skillNode = findOrCreateSkill(state, skill);
    let userSkill = state.userSkills.find(
      (us) => us.userId === req.user.id && us.skillId === skillNode.id
    );
    if (userSkill) {
      userSkill.level = level || userSkill.level;
    } else {
      userSkill = {
        id: crypto.randomUUID(),
        userId: req.user.id,
        skillId: skillNode.id,
        level: level || 'intermediate',
        source: 'stated',
      };
      state.userSkills.push(userSkill);
      addRelationship(state, {
        fromType: 'person', fromId: req.user.id,
        toType: 'skill', toId: skillNode.id,
        kind: 'has_skill', weight: 1,
      });
    }
    save();
    res.status(201).json({ skill: { id: userSkill.id, skill: skillNode.name, level: userSkill.level } });
  } catch (e) { next(e); }
});

router.delete('/me/skills/:userSkillId', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const idx = state.userSkills.findIndex(
      (us) => us.id === req.params.userSkillId && us.userId === req.user.id
    );
    if (idx === -1) {
      const err = new Error('Skill entry not found');
      err.status = 404;
      throw err;
    }
    state.userSkills.splice(idx, 1);
    save();
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
