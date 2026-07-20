// Organization Support — NGO / school / college / club / business workspaces (Phase 2).

const crypto = require('crypto');
const { Router } = require('../utils/router');
const { getState, save } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/requireAuth');
const { addRelationship } = require('../graph/relationships');
const { recordContribution } = require('../services/trust');
const { notify, logActivity } = require('../services/notify');

const ORG_TYPES = ['ngo', 'school', 'college', 'club', 'small_business'];

const router = new Router();

function serializeOrg(state, org) {
  const members = state.organizationMembers.filter((m) => m.organizationId === org.id);
  return { ...org, memberCount: members.length };
}

router.get('/', optionalAuth, (req, res, next) => {
  try {
    const state = getState();
    let orgs = state.organizations;
    if (req.query.type) orgs = orgs.filter((o) => o.type === req.query.type);
    if (req.query.communityId) orgs = orgs.filter((o) => o.communityId === req.query.communityId);
    if (req.query.q) {
      const q = req.query.q.toLowerCase();
      orgs = orgs.filter(
        (o) => o.name.toLowerCase().includes(q) || (o.description || '').toLowerCase().includes(q)
      );
    }
    res.json({ organizations: orgs.map((o) => serializeOrg(state, o)), types: ORG_TYPES });
  } catch (e) { next(e); }
});

router.post('/', requireAuth, (req, res, next) => {
  try {
    const { name, type, description, communityId } = req.body;
    if (!name || !type) {
      const err = new Error('name and type are required');
      err.status = 400;
      throw err;
    }
    if (!ORG_TYPES.includes(type)) {
      const err = new Error(`type must be one of: ${ORG_TYPES.join(', ')}`);
      err.status = 400;
      throw err;
    }
    const state = getState();
    const org = {
      id: crypto.randomUUID(),
      name,
      type,
      description: description || '',
      ownerId: req.user.id,
      communityId: communityId || null,
      createdAt: new Date().toISOString(),
    };
    state.organizations.push(org);
    state.organizationMembers.push({
      id: crypto.randomUUID(),
      organizationId: org.id,
      userId: req.user.id,
      role: 'owner',
      joinedAt: new Date().toISOString(),
    });
    addRelationship(state, {
      fromType: 'person', fromId: req.user.id,
      toType: 'organization', toId: org.id,
      kind: 'works_at', weight: 1,
    });
    recordContribution(state, {
      userId: req.user.id, kind: 'org_create',
      refType: 'organization', refId: org.id, points: 3,
      summary: `Created ${type} organization "${name}"`,
    });
    logActivity(state, {
      communityId: communityId || null,
      actorId: req.user.id,
      type: 'organization',
      summary: `${req.user.name} created ${type} workspace "${name}"`,
    });
    save();
    res.status(201).json({ organization: serializeOrg(state, org) });
  } catch (e) { next(e); }
});

router.get('/:id', (req, res, next) => {
  try {
    const state = getState();
    const org = state.organizations.find((o) => o.id === req.params.id);
    if (!org) {
      const err = new Error('Organization not found');
      err.status = 404;
      throw err;
    }
    const members = state.organizationMembers
      .filter((m) => m.organizationId === org.id)
      .map((m) => {
        const user = state.users.find((u) => u.id === m.userId);
        return user ? { id: user.id, name: user.name, role: m.role, joinedAt: m.joinedAt } : null;
      })
      .filter(Boolean);

    // Linked opportunities posted by org members
    const memberIds = new Set(members.map((m) => m.id));
    const opportunities = state.opportunities.filter(
      (o) => memberIds.has(o.creatorId) && o.status === 'open'
    );

    res.json({
      organization: serializeOrg(state, org),
      members,
      opportunities: opportunities.map((o) => ({
        id: o.id, type: o.type, title: o.title, skillsNeeded: o.skillsNeeded,
      })),
    });
  } catch (e) { next(e); }
});

router.post('/:id/join', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const org = state.organizations.find((o) => o.id === req.params.id);
    if (!org) {
      const err = new Error('Organization not found');
      err.status = 404;
      throw err;
    }
    const already = state.organizationMembers.find(
      (m) => m.organizationId === org.id && m.userId === req.user.id
    );
    if (already) return res.json({ joined: true, already: true });

    state.organizationMembers.push({
      id: crypto.randomUUID(),
      organizationId: org.id,
      userId: req.user.id,
      role: 'member',
      joinedAt: new Date().toISOString(),
    });
    addRelationship(state, {
      fromType: 'person', fromId: req.user.id,
      toType: 'organization', toId: org.id,
      kind: 'works_at', weight: 1,
    });
    notify(state, {
      userId: org.ownerId,
      type: 'org',
      title: `${req.user.name} joined ${org.name}`,
      body: 'New organization member.',
      link: `#organization?id=${org.id}`,
    });
    save();
    res.status(201).json({ joined: true });
  } catch (e) { next(e); }
});

router.put('/:id', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const org = state.organizations.find((o) => o.id === req.params.id);
    if (!org) {
      const err = new Error('Organization not found');
      err.status = 404;
      throw err;
    }
    if (org.ownerId !== req.user.id) {
      const err = new Error('Only the organization owner can update it');
      err.status = 403;
      throw err;
    }
    const { name, description } = req.body;
    if (name !== undefined) org.name = name;
    if (description !== undefined) org.description = description;
    save();
    res.json({ organization: serializeOrg(state, org) });
  } catch (e) { next(e); }
});

// Recruit: create a volunteer opportunity tied to the org's community
router.post('/:id/recruit', requireAuth, (req, res, next) => {
  try {
    const { title, description, skillsNeeded } = req.body;
    if (!title) {
      const err = new Error('title is required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const org = state.organizations.find((o) => o.id === req.params.id);
    if (!org) {
      const err = new Error('Organization not found');
      err.status = 404;
      throw err;
    }
    const membership = state.organizationMembers.find(
      (m) => m.organizationId === org.id && m.userId === req.user.id
    );
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      const err = new Error('Only org owners/admins can recruit');
      err.status = 403;
      throw err;
    }
    const opp = {
      id: crypto.randomUUID(),
      type: 'organization_request',
      title,
      description: description || `Recruiting for ${org.name}`,
      communityId: org.communityId,
      creatorId: req.user.id,
      skillsNeeded: Array.isArray(skillsNeeded)
        ? skillsNeeded.map((s) => s.toLowerCase())
        : [],
      location: null,
      status: 'open',
      organizationId: org.id,
      createdAt: new Date().toISOString(),
    };
    state.opportunities.push(opp);
    logActivity(state, {
      communityId: org.communityId,
      actorId: req.user.id,
      type: 'recruit',
      summary: `${org.name} is recruiting: "${title}"`,
    });
    save();
    res.status(201).json({ opportunity: opp });
  } catch (e) { next(e); }
});

module.exports = router;
