// Semantic embeddings (Phase 2, pgvector).
//
// Produces a normalized float vector for arbitrary text. Two modes:
//  1. LOCAL (default): deterministic feature-hashing embedding over a
//     canonical-skill vocabulary plus a synonym/expansion layer, so
//     conceptual queries like "school STEM club" still align with profiles
//     that mention "robotics"/"programming"/"teaching". No network, no config,
//     stable ordering — ideal for tests and the JSON fallback store.
//  2. API: when EMBEDDING_API_URL + EMBEDDING_API_KEY are set, calls an
//     OpenAI-compatible /v1/embeddings endpoint; falls back to local on any
//     failure/timeout.

const { SKILL_DICTIONARY } = require('../nlp/skillExtractor');

const DIM = 384;

// Extra everyday synonyms that map a token to a canonical skill, so queries
// phrased in plain language still embed near the relevant skill vectors.
const EXPANSION = {
  robotics: ['stem', 'robot', 'drones', 'electronics', 'mechatronics'],
  programming: ['stem', 'coding', 'code', 'developer', 'software', 'website', 'web', 'app', 'tech', 'computer'],
  electrical: ['wiring', 'power', 'electrician', 'lights'],
  plumbing: ['pipes', 'plumber', 'leak'],
  'first aid': ['cpr', 'medical', 'health', 'nurse', 'ambulance'],
  design: ['ui', 'ux', 'figma', 'art', 'creative', 'graphic'],
  'machine learning': ['ml', 'ai', 'data', 'analytics', 'model'],
  photography: ['photo', 'camera', 'video', 'film'],
  teaching: ['mentor', 'tutor', 'school', 'class', 'student', 'teacher', 'education', 'club', 'coach'],
  'event management': ['event', 'organize', 'coordination', 'planning', 'logistics'],
  fundraising: ['fundraiser', 'donation', 'ngo', 'charity', 'sponsor'],
  leadership: ['lead', 'manage', 'organizer', 'coordinate', 'manager'],
  writing: ['content', 'copy', 'blog', 'editorial'],
  marketing: ['social media', 'seo', 'brand', 'promotion', 'outreach'],
  music: ['singing', 'guitar', 'piano', 'instrument', 'band'],
  'blood donation': ['blood', 'donor'],
  carpentry: ['wood', 'woodwork', 'carpenter'],
  healthcare: ['health', 'counseling', 'nursing', 'medical', 'care', 'therapy'],
};

const STOPWORDS = new Set([
  'need', 'someone', 'want', 'looking', 'for', 'with', 'find', 'help', 'nearby',
  'near', 'me', 'the', 'and', 'who', 'can', 'a', 'an', 'to', 'build', 'our',
  'we', 'i', 'is', 'are', 'in', 'my', 'this', 'team', 'hackathon', 'please',
  'have', 'has', 'do', 'does', 'on', 'of', 'at', 'by', 'from', 'that', 'it',
]);

// Canonical skills get a dedicated, stable slot so query and document vectors
// agree on the same dimension. Tokens resolve to skills via dictionary +
// expansion; raw out-of-vocabulary tokens fall through to feature hashing so
// identical words still contribute cosine signal.
const CANONICAL_SKILLS = Array.from(
  new Set([...Object.keys(SKILL_DICTIONARY), ...Object.keys(EXPANSION)])
);

const SKILL_SLOTS = new Map();
CANONICAL_SKILLS.forEach((skill, i) => SKILL_SLOTS.set(skill, i));

const TOKEN_FEATURES = new Map();
function addTokenFeature(token, skill) {
  if (!TOKEN_FEATURES.has(token)) TOKEN_FEATURES.set(token, []);
  TOKEN_FEATURES.get(token).push(skill);
}
for (const [skill, synonyms] of Object.entries(SKILL_DICTIONARY)) {
  for (const syn of synonyms) addTokenFeature(syn.toLowerCase(), skill);
}
for (const [skill, synonyms] of Object.entries(EXPANSION)) {
  for (const syn of synonyms) addTokenFeature(syn.toLowerCase(), skill);
  addTokenFeature(skill.toLowerCase(), skill); // the canonical name itself
}

function hashToken(token) {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) >>> 0;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

/**
 * Deterministic local embedding. Returns a normalized array of length DIM.
 */
function embedLocal(text) {
  const vec = new Float64Array(DIM);
  const tokens = tokenize(text);

  for (const token of tokens) {
    const skills = TOKEN_FEATURES.get(token);
    if (skills && skills.length) {
      // weight the skill slot once per occurrence (TF flavor)
      for (const skill of skills) {
        const slot = SKILL_SLOTS.get(skill);
        if (slot !== undefined) vec[slot] += 1;
      }
    } else {
      // feature-hash unknown tokens into the tail so exact terms align
      const slot = DIM - 1 - (hashToken(token) % Math.floor(DIM * 0.2));
      vec[slot] += 0.5;
    }
  }

  let norm = 0;
  for (let i = 0; i < DIM; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return Array(DIM).fill(0);
  const out = Array(DIM);
  for (let i = 0; i < DIM; i++) out[i] = vec[i] / norm;
  return out;
}

async function embedExternal(text) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.EMBEDDING_TIMEOUT_MS) || 8000
  );
  try {
    const res = await fetch(process.env.EMBEDDING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.EMBEDDING_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
        input: text,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`embedding HTTP ${res.status}`);
    const data = await res.json();
    const vector = data?.data?.[0]?.embedding;
    if (!Array.isArray(vector)) throw new Error('embedding response missing vector');
    return normalize(resizeVector(vector, DIM));
  } finally {
    clearTimeout(timeout);
  }
}

function resizeVector(vector, dim) {
  if (vector.length === dim) return vector;
  const out = new Array(dim).fill(0);
  for (let i = 0; i < Math.min(vector.length, dim); i++) out[i] = vector[i];
  return out;
}

function normalize(vector) {
  let norm = 0;
  for (const v of vector) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vector.map((v) => v / norm);
}

/**
 * Embed text into a normalized DIM-length vector.
 * @returns {Promise<{ vector: number[], dim: number, source: 'api'|'local' }>}
 */
async function embed(text) {
  if (process.env.EMBEDDING_API_URL && process.env.EMBEDDING_API_KEY) {
    try {
      return { vector: await embedExternal(text), dim: DIM, source: 'api' };
    } catch (e) {
      console.warn(`[embeddings] external API failed, using local: ${e.message}`);
    }
  }
  return { vector: embedLocal(text), dim: DIM, source: 'local' };
}

/** Cosine similarity between two equal-length numeric vectors (0..1). */
function semanticSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return Math.max(0, Math.min(1, dot));
}

module.exports = { embed, embedLocal, semanticSimilarity, DIM, CANONICAL_SKILLS };
