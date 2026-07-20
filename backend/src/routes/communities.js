const crypto = require('crypto');
const { Router } = require('../utils/router');
const { getState, save } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/requireAuth');
const { addRelationship } = require('../graph/relationships');

const router = new Router();

function serializeCommunity(state, community) {
  const memberCount = state.communityMembers.filter((m) => m.communityId === community.id).length;
  return { ...community, memberCount };
}

// Community discovery — supports simple text search over name/description.
router.get('/', optionalAuth, (req, res, next) => {
  try {
    const state = getState();
    const q = (req.query.q || '').toLowerCase().trim();
    let results = state.communities;
    if (q) {
      results = results.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)
      );
    }
    res.json({ communities: results.map((c) => serializeCommunity(state, c)) });
  } catch (e) { next(e); }
});

router.post('/', requireAuth, (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      const err = new Error('name is required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const community = {
      id: crypto.randomUUID(),
      name,
      description: description || '',
      ownerId: req.user.id,
      createdAt: new Date().toISOString(),
    };
    state.communities.push(community);
    const membership = {
      id: crypto.randomUUID(),
      communityId: community.id,
      userId: req.user.id,
      role: 'owner',
      joinedAt: new Date().toISOString(),
    };
    state.communityMembers.push(membership);
    addRelationship(state, {
      fromType: 'person', fromId: req.user.id,
      toType: 'community', toId: community.id,
      kind: 'member_of', weight: 1,
    });
    save();
    res.status(201).json({ community: serializeCommunity(state, community) });
  } catch (e) { next(e); }
});

router.get('/:id', (req, res, next) => {
  try {
    const state = getState();
    const community = state.communities.find((c) => c.id === req.params.id);
    if (!community) {
      const err = new Error('Community not found');
      err.status = 404;
      throw err;
    }
    const members = state.communityMembers
      .filter((m) => m.communityId === community.id)
      .map((m) => {
        const user = state.users.find((u) => u.id === m.userId);
        return user ? { id: user.id, name: user.name, role: m.role } : null;
      })
      .filter(Boolean);
    res.json({ community: serializeCommunity(state, community), members });
  } catch (e) { next(e); }
});

router.post('/:id/join', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const community = state.communities.find((c) => c.id === req.params.id);
    if (!community) {
      const err = new Error('Community not found');
      err.status = 404;
      throw err;
    }
    const already = state.communityMembers.find(
      (m) => m.communityId === community.id && m.userId === req.user.id
    );
    if (already) return res.json({ joined: true, already: true });

    state.communityMembers.push({
      id: crypto.randomUUID(),
      communityId: community.id,
      userId: req.user.id,
      role: 'member',
      joinedAt: new Date().toISOString(),
    });
    addRelationship(state, {
      fromType: 'person', fromId: req.user.id,
      toType: 'community', toId: community.id,
      kind: 'member_of', weight: 1,
    });
    save();
    res.status(201).json({ joined: true });
  } catch (e) { next(e); }
});

router.post('/:id/leave', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const idx = state.communityMembers.findIndex(
      (m) => m.communityId === req.params.id && m.userId === req.user.id
    );
    if (idx === -1) {
      const err = new Error('You are not a member of this community');
      err.status = 400;
      throw err;
    }
    if (state.communityMembers[idx].role === 'owner') {
      const err = new Error('Owner cannot leave their own community — transfer ownership first');
      err.status = 400;
      throw err;
    }
    state.communityMembers.splice(idx, 1);
    save();
    res.json({ left: true });
  } catch (e) { next(e); }
});

// Owner-only update (role-based access control)
router.put('/:id', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const community = state.communities.find((c) => c.id === req.params.id);
    if (!community) {
      const err = new Error('Community not found');
      err.status = 404;
      throw err;
    }
    if (community.ownerId !== req.user.id) {
      const err = new Error('Only the community owner can update it');
      err.status = 403;
      throw err;
    }
    const { name, description } = req.body;
    if (name !== undefined) community.name = name;
    if (description !== undefined) community.description = description;
    save();
    res.json({ community: serializeCommunity(state, community) });
  } catch (e) { next(e); }
});

module.exports = router;
