// Trust & Reputation — endorsements, trust scores, badges (Phase 2).

const crypto = require('crypto');
const { Router } = require('../utils/router');
const { getState, save } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/requireAuth');
const {
  computeTrustScore,
  communityReputation,
  recordContribution,
  maybeAwardBadges,
} = require('../services/trust');
const { notify, logActivity } = require('../services/notify');

const router = new Router();

router.get('/:userId', optionalAuth, (req, res, next) => {
  try {
    const state = getState();
    const user = state.users.find((u) => u.id === req.params.userId);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }
    const trust = computeTrustScore(state, user.id);
    const endorsements = state.endorsements
      .filter((e) => e.toUserId === user.id)
      .map((e) => {
        const from = state.users.find((u) => u.id === e.fromUserId);
        const skill = state.skills.find((s) => s.id === e.skillId);
        return {
          id: e.id,
          from: from ? { id: from.id, name: from.name } : null,
          skill: skill ? skill.name : null,
          note: e.note,
          createdAt: e.createdAt,
        };
      });
    const badges = state.badges.filter((b) => b.userId === user.id);
    const contributions = state.contributions
      .filter((c) => c.userId === user.id)
      .slice(-30);

    let community = null;
    if (req.query.communityId) {
      community = communityReputation(state, user.id, req.query.communityId);
    }

    res.json({
      userId: user.id,
      name: user.name,
      trust,
      communityReputation: community,
      endorsements,
      badges,
      contributions,
    });
  } catch (e) { next(e); }
});

router.post('/endorse', requireAuth, (req, res, next) => {
  try {
    const { toUserId, skill, note } = req.body;
    if (!toUserId || !skill) {
      const err = new Error('toUserId and skill are required');
      err.status = 400;
      throw err;
    }
    if (toUserId === req.user.id) {
      const err = new Error('You cannot endorse yourself');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const target = state.users.find((u) => u.id === toUserId);
    if (!target) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }
    const canonical = skill.trim().toLowerCase();
    let skillNode = state.skills.find((s) => s.name === canonical);
    if (!skillNode) {
      skillNode = { id: crypto.randomUUID(), name: canonical };
      state.skills.push(skillNode);
    }

    const already = state.endorsements.find(
      (e) => e.fromUserId === req.user.id && e.toUserId === toUserId && e.skillId === skillNode.id
    );
    if (already) {
      return res.json({ endorsement: already, already: true });
    }

    const endorsement = {
      id: crypto.randomUUID(),
      fromUserId: req.user.id,
      toUserId,
      skillId: skillNode.id,
      note: note || '',
      createdAt: new Date().toISOString(),
    };
    state.endorsements.push(endorsement);
    recordContribution(state, {
      userId: toUserId, kind: 'endorsement_received',
      refType: 'endorsement', refId: endorsement.id, points: 2,
      summary: `Endorsed for ${canonical} by ${req.user.name}`,
    });
    maybeAwardBadges(state, toUserId);
    notify(state, {
      userId: toUserId,
      type: 'endorsement',
      title: `${req.user.name} endorsed you for ${canonical}`,
      body: note || '',
      link: `#dashboard`,
    });
    logActivity(state, {
      communityId: null,
      actorId: req.user.id,
      type: 'endorsement',
      summary: `${req.user.name} endorsed ${target.name} for ${canonical}`,
    });
    save();
    res.status(201).json({
      endorsement: {
        id: endorsement.id,
        skill: canonical,
        note: endorsement.note,
        createdAt: endorsement.createdAt,
      },
      trust: computeTrustScore(state, toUserId),
    });
  } catch (e) { next(e); }
});

module.exports = router;
