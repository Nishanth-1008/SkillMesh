const crypto = require('crypto');

// The "relationship engine" from roadmap.md: a small helper that writes
// edges into the knowledge graph and keeps them de-duplicated. Every node
// is referenced as { type, id } so the graph can hold people, skills,
// communities, and (later) organizations/projects under one edge shape.

function addRelationship(state, { fromType, fromId, toType, toId, kind, weight = 1 }) {
  const existing = state.relationships.find(
    (r) => r.fromType === fromType && r.fromId === fromId &&
           r.toType === toType && r.toId === toId && r.kind === kind
  );
  if (existing) {
    existing.weight += weight;
    return existing;
  }
  const rel = {
    id: crypto.randomUUID(),
    fromType, fromId, toType, toId, kind, weight,
    createdAt: new Date().toISOString(),
  };
  state.relationships.push(rel);
  return rel;
}

function removeRelationship(state, { fromType, fromId, toType, toId, kind }) {
  const before = state.relationships.length;
  state.relationships = state.relationships.filter(
    (r) => !(
      r.fromType === fromType && r.fromId === fromId &&
      r.toType === toType && r.toId === toId &&
      (!kind || r.kind === kind)
    )
  );
  return before - state.relationships.length;
}

// Build a graph payload { nodes, edges } for visualization, optionally
// scoped to a single community so the frontend doesn't have to render the
// entire mesh at once.
function buildGraph(state, { communityId } = {}) {
  const nodes = [];
  const nodeIds = new Set();

  const addNode = (type, id, label, meta = {}) => {
    const key = `${type}:${id}`;
    if (nodeIds.has(key)) return;
    nodeIds.add(key);
    nodes.push({ id: key, type, label, ...meta });
  };

  let memberIds = null;
  if (communityId) {
    memberIds = new Set(
      state.communityMembers.filter((m) => m.communityId === communityId).map((m) => m.userId)
    );
  }

  for (const user of state.users) {
    if (memberIds && !memberIds.has(user.id)) continue;
    addNode('person', user.id, user.name, { location: user.location || null });
  }
  for (const community of state.communities) {
    if (communityId && community.id !== communityId) continue;
    addNode('community', community.id, community.name);
  }

  // Only include skills held by people already in the graph (avoids orphan skill nodes)
  for (const us of state.userSkills) {
    if (memberIds && !memberIds.has(us.userId)) continue;
    if (!nodeIds.has(`person:${us.userId}`)) continue;
    const skill = state.skills.find((s) => s.id === us.skillId);
    if (skill) addNode('skill', skill.id, skill.name);
  }

  // Phase 2 nodes
  for (const project of state.projects || []) {
    if (communityId && project.communityId && project.communityId !== communityId) continue;
    if (communityId && !project.communityId) continue;
    addNode('project', project.id, project.title, { status: project.status });
  }
  for (const org of state.organizations || []) {
    if (communityId && org.communityId && org.communityId !== communityId) continue;
    if (communityId && !org.communityId) continue;
    addNode('organization', org.id, org.name, { orgType: org.type });
  }

  const edges = state.relationships
    .filter((r) => nodeIds.has(`${r.fromType}:${r.fromId}`) && nodeIds.has(`${r.toType}:${r.toId}`))
    .map((r) => ({
      id: r.id,
      source: `${r.fromType}:${r.fromId}`,
      target: `${r.toType}:${r.toId}`,
      kind: r.kind,
      weight: r.weight,
    }));

  return { nodes, edges };
}

module.exports = { addRelationship, removeRelationship, buildGraph };
