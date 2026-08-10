// Role-based access control (RBAC) — Phase 1.
// Pure helpers (for inline handler checks, preserving existing 404/403
// semantics) plus middleware factories for route-level enforcement.

const { getState } = require('../db');

function forbidden(message, status = 403) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// A project owner (membership row with role 'owner') or the project.ownerId
// field always counts as owner — matches the legacy ownerId checks.
function hasProjectRole(state, userId, projectId, roles) {
  if (!userId || !projectId) return false;
  const project = state.projects.find((p) => p.id === projectId);
  if (project && project.ownerId === userId && roles.includes('owner')) return true;
  return state.projectMembers.some(
    (m) =>
      m.projectId === projectId &&
      m.userId === userId &&
      m.status === 'joined' &&
      roles.includes(m.role)
  );
}

function hasCommunityRole(state, userId, communityId, roles) {
  if (!userId || !communityId) return false;
  const community = state.communities.find((c) => c.id === communityId);
  if (community && community.ownerId === userId && roles.includes('owner')) return true;
  return state.communityMembers.some(
    (m) => m.communityId === communityId && m.userId === userId && roles.includes(m.role)
  );
}

function hasOrgRole(state, userId, organizationId, roles) {
  if (!userId || !organizationId) return false;
  const org = state.organizations.find((o) => o.id === organizationId);
  if (org && org.ownerId === userId && roles.includes('owner')) return true;
  return state.organizationMembers.some(
    (m) => m.organizationId === organizationId && m.userId === userId && roles.includes(m.role)
  );
}

function hasUserRole(req, roles) {
  return !!req.user && roles.includes(req.user.role);
}

// ---- Middleware factories ----

function resolveParam(req, names) {
  for (const n of names) {
    if (req.params && req.params[n]) return req.params[n];
  }
  if (req.body && req.body.projectId) return req.body.projectId;
  if (req.body && req.body.communityId) return req.body.communityId;
  if (req.body && req.body.organizationId) return req.body.organizationId;
  return null;
}

function requireProjectRole(...roles) {
  return (req, res, next) => {
    try {
      const state = getState();
      const projectId = resolveParam(req, ['id', 'projectId']);
      if (!projectId) return next(forbidden('Project identifier missing'));
      if (!hasProjectRole(state, req.user && req.user.id, projectId, roles)) {
        return next(forbidden(`Requires project role: ${roles.join('/')}`));
      }
      next();
    } catch (e) { next(e); }
  };
}

function requireCommunityRole(...roles) {
  return (req, res, next) => {
    try {
      const state = getState();
      const communityId = resolveParam(req, ['id', 'communityId']);
      if (!communityId) return next(forbidden('Community identifier missing'));
      if (!hasCommunityRole(state, req.user && req.user.id, communityId, roles)) {
        return next(forbidden(`Requires community role: ${roles.join('/')}`));
      }
      next();
    } catch (e) { next(e); }
  };
}

function requireOrgRole(...roles) {
  return (req, res, next) => {
    try {
      const state = getState();
      const orgId = resolveParam(req, ['id', 'organizationId']);
      if (!orgId) return next(forbidden('Organization identifier missing'));
      if (!hasOrgRole(state, req.user && req.user.id, orgId, roles)) {
        return next(forbidden(`Requires organization role: ${roles.join('/')}`));
      }
      next();
    } catch (e) { next(e); }
  };
}

function requireUserRole(...roles) {
  return (req, res, next) => {
    if (!hasUserRole(req, roles)) {
      return next(forbidden(`Requires user role: ${roles.join('/')}`));
    }
    next();
  };
}

module.exports = {
  forbidden,
  hasProjectRole, hasCommunityRole, hasOrgRole, hasUserRole,
  requireProjectRole, requireCommunityRole, requireOrgRole, requireUserRole,
};
