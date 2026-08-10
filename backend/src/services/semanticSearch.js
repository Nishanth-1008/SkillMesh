// Semantic search (Phase 2, pgvector).
//
// Ranks people / opportunities / skills / projects by cosine similarity of
// text embeddings, refreshed lazily via a text-snapshot diff so results are
// always current without re-embedding unchanged entities.
//
// The embeddings themselves are persisted in the `semantic_vectors` table
// (a genuine pgvector column) and a guarded SQL distance query is exposed for
// Postgres deployments; the in-memory ranking below is the always-correct,
// mode-agnostic path used by the API and tests.

const crypto = require('crypto');
const { embed, semanticSimilarity, DIM } = require('./embeddings');
const { computeTrustScore, getUserSkillNames } = require('./trust');
const { feedbackModifier } = require('./feedback');

const ENTITY_SNAPSHOTS = {
  user: (state, entity) =>
    [entity.name, entity.bio, entity.location, (entity.interests || []).join(' '), getUserSkillNames(state, entity.id).join(' ')]
      .filter(Boolean).join(' ').toLowerCase(),
  skill: (state, entity) => String(entity.name || '').toLowerCase(),
  opportunity: (state, entity) =>
    [entity.title, entity.description, (entity.skillsNeeded || []).join(' ')]
      .filter(Boolean).join(' ').toLowerCase(),
  project: (state, entity) =>
    [entity.title, entity.description, entity.goal]
      .filter(Boolean).join(' ').toLowerCase(),
};

const ENTITY_LISTS = {
  user: (s) => s.users,
  skill: (s) => s.skills,
  opportunity: (s) => s.opportunities,
  project: (s) => s.projects,
};

function keyOf(type, id) {
  return `${type}:${id}`;
}

function vectorMap(state) {
  const map = new Map();
  for (const v of state.semanticVectors || []) {
    map.set(keyOf(v.entityType, v.entityId), v);
  }
  return map;
}

/**
 * Recompute embeddings only for entities whose snapshot text changed.
 * @returns {Promise<number>} count of freshly embedded (or updated) entries.
 */
async function ensureSemanticVectors(state) {
  const vectors = vectorMap(state);
  const now = new Date().toISOString();
  let changed = 0;

  for (const type of Object.keys(ENTITY_SNAPSHOTS)) {
    const snapshot = ENTITY_SNAPSHOTS[type];
    const entities = ENTITY_LISTS[type](state) || [];
    for (const entity of entities) {
      const text = snapshot(state, entity);
      if (!text) continue;
      const key = keyOf(type, entity.id);
      const existing = vectors.get(key);
      if (existing && existing.text === text) continue;

      const { vector } = await embed(text);
      vectors.set(key, {
        id: (existing && existing.id) || crypto.randomUUID(),
        entityType: type,
        entityId: entity.id,
        text,
        vector,
        createdAt: (existing && existing.createdAt) || now,
        updatedAt: now,
      });
      changed += 1;
    }
  }

  state.semanticVectors = Array.from(vectors.values());
  return changed;
}

function baseExplain(similarity, trustScore, availability) {
  const lines = [`Semantic match ${Math.round(similarity * 100)}% with your request`];
  if (typeof trustScore === 'number') lines.push(`Trust score ${Math.round(trustScore)}/100`);
  if (availability === 'available') lines.push('Available right now');
  else if (availability === 'busy') lines.push('Currently busy');
  return lines;
}

/**
 * Rank people by semantic similarity to `text`.
 * @returns {Promise<{people, engine}>}
 */
async function rankPeople(state, { text, communityId, excludeUserId, limit = 10, viewerId }) {
  const { vector: queryVec } = await embed(text);
  const vectors = vectorMap(state);
  const results = [];

  for (const user of state.users) {
    if (excludeUserId && user.id === excludeUserId) continue;
    if (communityId) {
      const member = state.communityMembers.some(
        (m) => m.communityId === communityId && m.userId === user.id
      );
      if (!member) continue;
    }

    const entry = vectors.get(keyOf('user', user.id));
    if (!entry) continue;
    const similarity = semanticSimilarity(queryVec, entry.vector);

    const trust = computeTrustScore(state, user.id);
    let score = similarity * 100;
    score += trust.score * 0.1;
    if (user.availability === 'available') score += 2;
    else if (user.availability === 'busy') score -= 2;
    score += feedbackModifier(state, user.id, viewerId);

    results.push({
      user: { id: user.id, name: user.name, location: user.location, availability: user.availability },
      similarity: Math.round(similarity * 100),
      trustScore: trust.score,
      relevant: similarity >= 0.3,
      explain: baseExplain(similarity, trust.score, user.availability),
      score: Math.round(score * 10) / 10,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return { people: results.slice(0, limit), engine: 'memory' };
}

/**
 * Rank opportunity postings by semantic similarity to `text`.
 */
async function rankOpportunities(state, { text, communityId, limit = 5 }) {
  const { vector: queryVec } = await embed(text);
  const vectors = vectorMap(state);
  const results = [];

  for (const opp of state.opportunities) {
    if (communityId && opp.communityId !== communityId) continue;
    const entry = vectors.get(keyOf('opportunity', opp.id));
    if (!entry) continue;
    const similarity = semanticSimilarity(queryVec, entry.vector);
    if (similarity <= 0) continue;
    results.push({
      opportunity: { id: opp.id, title: opp.title, skillsNeeded: opp.skillsNeeded || [] },
      similarity: Math.round(similarity * 100),
      explain: [`Semantic match ${Math.round(similarity * 100)}% with your request`],
      score: Math.round(similarity * 100 * 10) / 10,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * Rank skills by semantic similarity to `text`.
 */
async function rankSkills(state, { text, limit = 8 }) {
  const { vector: queryVec } = await embed(text);
  const vectors = vectorMap(state);
  const results = [];

  for (const skill of state.skills) {
    const entry = vectors.get(keyOf('skill', skill.id));
    if (!entry) continue;
    const similarity = semanticSimilarity(queryVec, entry.vector);
    if (similarity <= 0) continue;
    results.push({
      skill: skill.name,
      similarity: Math.round(similarity * 100),
      score: Math.round(similarity * 100 * 10) / 10,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * Rank projects by semantic similarity to `text`.
 */
async function rankProjects(state, { text, communityId, limit = 5 }) {
  const { vector: queryVec } = await embed(text);
  const vectors = vectorMap(state);
  const results = [];

  for (const project of state.projects) {
    if (communityId && project.communityId !== communityId) continue;
    const entry = vectors.get(keyOf('project', project.id));
    if (!entry) continue;
    const similarity = semanticSimilarity(queryVec, entry.vector);
    if (similarity <= 0) continue;
    results.push({
      project: { id: project.id, title: project.title },
      similarity: Math.round(similarity * 100),
      explain: [`Semantic match ${Math.round(similarity * 100)}% with your request`],
      score: Math.round(similarity * 100 * 10) / 10,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * Genuine pgvector SQL distance search. Returns null when Postgres / the
 * pgvector table is unavailable (caller should fall back to in-memory).
 */
async function pgVectorSearch(state, { text, entityType, limit = 10 }) {
  const { isPostgres, poolQuery } = require('../db');
  if (!isPostgres()) return null;
  const { vector: queryVec } = await embed(text);

  try {
    const { rows } = await poolQuery(
      `SELECT entity_id, 1 - (vector <=> $1) AS similarity
       FROM semantic_vectors
       WHERE entity_type = $2
       ORDER BY vector <=> $1
       LIMIT $3`,
      [`[${queryVec.join(',')}]`, entityType, limit]
    );
    return rows.map((r) => ({
      entityId: r.entity_id,
      similarity: Math.round(Number(r.similarity) * 100),
    }));
  } catch (e) {
    console.warn(`[semantic] pgvector search unavailable, falling back: ${e.message}`);
    return null;
  }
}

module.exports = {
  ensureSemanticVectors,
  rankPeople,
  rankOpportunities,
  rankSkills,
  rankProjects,
  pgVectorSearch,
  ENTITY_SNAPSHOTS,
  DIM,
};
