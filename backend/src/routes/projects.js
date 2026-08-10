// Collaboration Engine — projects, invitations, roles, join requests (Phase 2).

const crypto = require('crypto');
const { Router } = require('../utils/router');
const { getState, save } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/requireAuth');
const { hasProjectRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { projectCreate } = require('../validation/schemas');
const { addRelationship } = require('../graph/relationships');
const { recordContribution } = require('../services/trust');
const { notify, logActivity } = require('../services/notify');

const router = new Router();

function serializeProject(state, project) {
  const members = state.projectMembers
    .filter((m) => m.projectId === project.id)
    .map((m) => {
      const user = state.users.find((u) => u.id === m.userId);
      return user
        ? { id: m.id, userId: user.id, name: user.name, role: m.role, status: m.status, joinedAt: m.joinedAt }
        : null;
    })
    .filter(Boolean);
  return { ...project, members, memberCount: members.filter((m) => m.status === 'joined').length };
}

router.get('/', optionalAuth, (req, res, next) => {
  try {
    const state = getState();
    let projects = state.projects;
    if (req.query.communityId) {
      projects = projects.filter((p) => p.communityId === req.query.communityId);
    }
    if (req.query.status) {
      projects = projects.filter((p) => p.status === req.query.status);
    }
    if (req.query.mine === '1' && req.user) {
      const myIds = new Set(
        state.projectMembers
          .filter((m) => m.userId === req.user.id && m.status !== 'declined')
          .map((m) => m.projectId)
      );
      projects = projects.filter((p) => p.ownerId === req.user.id || myIds.has(p.id));
    }
    res.json({ projects: projects.map((p) => serializeProject(state, p)) });
  } catch (e) { next(e); }
});

router.post('/', requireAuth, validate(projectCreate), (req, res, next) => {
  try {
    const { title, description, goal, communityId, timeline } = req.body;
    const state = getState();
    if (communityId) {
      const community = state.communities.find((c) => c.id === communityId);
      if (!community) {
        const err = new Error('Community not found');
        err.status = 404;
        throw err;
      }
    }
    const project = {
      id: crypto.randomUUID(),
      title,
      description: description || '',
      goal: goal || description || title,
      communityId: communityId || null,
      ownerId: req.user.id,
      status: 'active',
      timeline: timeline || null,
      createdAt: new Date().toISOString(),
    };
    state.projects.push(project);
    state.projectMembers.push({
      id: crypto.randomUUID(),
      projectId: project.id,
      userId: req.user.id,
      role: 'owner',
      status: 'joined',
      joinedAt: new Date().toISOString(),
    });
    addRelationship(state, {
      fromType: 'person', fromId: req.user.id,
      toType: 'project', toId: project.id,
      kind: 'owns', weight: 1,
    });
    recordContribution(state, {
      userId: req.user.id, kind: 'project_create',
      refType: 'project', refId: project.id, points: 3,
      summary: `Created project "${title}"`,
    });
    logActivity(state, {
      communityId: communityId || null,
      actorId: req.user.id,
      type: 'project_created',
      summary: `${req.user.name} created project "${title}"`,
    });
    save();
    res.status(201).json({ project: serializeProject(state, project) });
  } catch (e) { next(e); }
});

router.get('/:id', (req, res, next) => {
  try {
    const state = getState();
    const project = state.projects.find((p) => p.id === req.params.id);
    if (!project) {
      const err = new Error('Project not found');
      err.status = 404;
      throw err;
    }
    const history = state.activity
      .filter((a) => a.summary && a.summary.includes(project.title))
      .slice(-20);
    res.json({ project: serializeProject(state, project), history });
  } catch (e) { next(e); }
});

router.put('/:id', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const project = state.projects.find((p) => p.id === req.params.id);
    if (!project) {
      const err = new Error('Project not found');
      err.status = 404;
      throw err;
    }
    if (!hasProjectRole(state, req.user.id, project.id, ['owner'])) {
      const err = new Error('Only the project owner can update it');
      err.status = 403;
      throw err;
    }
    const { title, description, goal, status, timeline } = req.body;
    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (goal !== undefined) project.goal = goal;
    if (status !== undefined) project.status = status;
    if (timeline !== undefined) project.timeline = timeline;
    save();
    res.json({ project: serializeProject(state, project) });
  } catch (e) { next(e); }
});

// Invite a user to the project
router.post('/:id/invite', requireAuth, (req, res, next) => {
  try {
    const { userId, role } = req.body;
    if (!userId) {
      const err = new Error('userId is required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const project = state.projects.find((p) => p.id === req.params.id);
    if (!project) {
      const err = new Error('Project not found');
      err.status = 404;
      throw err;
    }
    if (!hasProjectRole(state, req.user.id, project.id, ['owner', 'lead'])) {
      const err = new Error('Only project owners/leads can invite');
      err.status = 403;
      throw err;
    }
    const target = state.users.find((u) => u.id === userId);
    if (!target) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }
    let existing = state.projectMembers.find(
      (m) => m.projectId === project.id && m.userId === userId
    );
    if (existing && existing.status === 'joined') {
      return res.json({ invited: true, already: true, member: existing });
    }
    if (existing) {
      existing.status = 'invited';
      existing.role = role || existing.role || 'member';
    } else {
      existing = {
        id: crypto.randomUUID(),
        projectId: project.id,
        userId,
        role: role || 'member',
        status: 'invited',
        joinedAt: null,
      };
      state.projectMembers.push(existing);
    }
    notify(state, {
      userId,
      type: 'invite',
      title: `Invited to ${project.title}`,
      body: `${req.user.name} invited you to join the project.`,
      link: `#project?id=${project.id}`,
    });
    save();
    res.status(201).json({ invited: true, member: existing });
  } catch (e) { next(e); }
});

// Accept / decline an invitation
router.post('/:id/respond', requireAuth, (req, res, next) => {
  try {
    const { accept } = req.body;
    const state = getState();
    const project = state.projects.find((p) => p.id === req.params.id);
    if (!project) {
      const err = new Error('Project not found');
      err.status = 404;
      throw err;
    }
    const membership = state.projectMembers.find(
      (m) => m.projectId === project.id && m.userId === req.user.id
    );
    if (!membership || membership.status !== 'invited') {
      const err = new Error('No pending invitation found');
      err.status = 400;
      throw err;
    }
    if (accept) {
      membership.status = 'joined';
      membership.joinedAt = new Date().toISOString();
      addRelationship(state, {
        fromType: 'person', fromId: req.user.id,
        toType: 'project', toId: project.id,
        kind: 'member_of', weight: 1,
      });
      // Collaborate edges with existing joined members
      const others = state.projectMembers.filter(
        (m) => m.projectId === project.id && m.status === 'joined' && m.userId !== req.user.id
      );
      for (const other of others) {
        addRelationship(state, {
          fromType: 'person', fromId: req.user.id,
          toType: 'person', toId: other.userId,
          kind: 'collaborated', weight: 1,
        });
        addRelationship(state, {
          fromType: 'person', fromId: other.userId,
          toType: 'person', toId: req.user.id,
          kind: 'collaborated', weight: 1,
        });
      }
      recordContribution(state, {
        userId: req.user.id, kind: 'project_join',
        refType: 'project', refId: project.id, points: 2,
        summary: `Joined project "${project.title}"`,
      });
      notify(state, {
        userId: project.ownerId,
        type: 'project',
        title: `${req.user.name} joined ${project.title}`,
        body: 'Invitation accepted.',
        link: `#project?id=${project.id}`,
      });
      logActivity(state, {
        communityId: project.communityId,
        actorId: req.user.id,
        type: 'project_join',
        summary: `${req.user.name} joined project "${project.title}"`,
      });
    } else {
      membership.status = 'declined';
    }
    save();
    res.json({ project: serializeProject(state, project), accepted: !!accept });
  } catch (e) { next(e); }
});

// Request to join (for open projects)
router.post('/:id/request', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const project = state.projects.find((p) => p.id === req.params.id);
    if (!project) {
      const err = new Error('Project not found');
      err.status = 404;
      throw err;
    }
    let existing = state.projectMembers.find(
      (m) => m.projectId === project.id && m.userId === req.user.id
    );
    if (existing && ['joined', 'invited', 'requested'].includes(existing.status)) {
      return res.json({ requested: true, already: true, status: existing.status });
    }
    if (existing) {
      existing.status = 'requested';
      existing.role = 'member';
    } else {
      existing = {
        id: crypto.randomUUID(),
        projectId: project.id,
        userId: req.user.id,
        role: 'member',
        status: 'requested',
        joinedAt: null,
      };
      state.projectMembers.push(existing);
    }
    notify(state, {
      userId: project.ownerId,
      type: 'join_request',
      title: `Join request for ${project.title}`,
      body: `${req.user.name} wants to join your project.`,
      link: `#project?id=${project.id}`,
    });
    save();
    res.status(201).json({ requested: true, member: existing });
  } catch (e) { next(e); }
});

// Owner approves/rejects a join request
router.post('/:id/approve', requireAuth, (req, res, next) => {
  try {
    const { userId, approve } = req.body;
    const state = getState();
    const project = state.projects.find((p) => p.id === req.params.id);
    if (!project) {
      const err = new Error('Project not found');
      err.status = 404;
      throw err;
    }
    if (!hasProjectRole(state, req.user.id, project.id, ['owner'])) {
      const err = new Error('Only the owner can approve join requests');
      err.status = 403;
      throw err;
    }
    const membership = state.projectMembers.find(
      (m) => m.projectId === project.id && m.userId === userId && m.status === 'requested'
    );
    if (!membership) {
      const err = new Error('No pending join request for that user');
      err.status = 400;
      throw err;
    }
    if (approve) {
      membership.status = 'joined';
      membership.joinedAt = new Date().toISOString();
      addRelationship(state, {
        fromType: 'person', fromId: userId,
        toType: 'project', toId: project.id,
        kind: 'member_of', weight: 1,
      });
      const target = state.users.find((u) => u.id === userId);
      notify(state, {
        userId,
        type: 'project',
        title: `Accepted to ${project.title}`,
        body: 'Your join request was approved.',
        link: `#project?id=${project.id}`,
      });
      logActivity(state, {
        communityId: project.communityId,
        actorId: userId,
        type: 'project_join',
        summary: `${target ? target.name : 'A member'} joined project "${project.title}"`,
      });
    } else {
      membership.status = 'declined';
      notify(state, {
        userId,
        type: 'project',
        title: `Request declined: ${project.title}`,
        body: 'Your join request was not approved.',
        link: `#project?id=${project.id}`,
      });
    }
    save();
    res.json({ project: serializeProject(state, project) });
  } catch (e) { next(e); }
});

module.exports = router;
