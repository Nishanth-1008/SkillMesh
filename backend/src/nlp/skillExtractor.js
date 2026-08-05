// Phase 1 "AI Service" — natural language understanding.
//
// The target architecture (system_architecture.md) calls for an LLM
// (Gemini/OpenAI) doing intent detection + skill extraction. This sandbox
// has no outbound network access, so Phase 1 ships a deterministic,
// dictionary + heuristic implementation with the SAME input/output contract
// an LLM-backed version would have: extractSkills(text) -> { intent,
// skills[], urgent, locationHint }. Swapping in a real LLM call later means
// replacing the body of this function, not any of its callers.

const SKILL_DICTIONARY = {
  robotics: ['robotics', 'robot', 'arduino', 'raspberry pi'],
  electrical: ['electrician', 'electrical', 'wiring', 'power outage'],
  plumbing: ['plumber', 'plumbing', 'pipes', 'leak'],
  'first aid': ['first aid', 'cpr', 'medical emergency', 'first-aid'],
  design: ['design', 'ui', 'ux', 'graphic design', 'figma', 'designer'],
  programming: ['programming', 'coding', 'developer', 'software', 'web development', 'app development', 'react', 'node', 'javascript', 'python', 'frontend', 'backend'],
  'machine learning': ['machine learning', 'ml', 'ai', 'artificial intelligence', 'data science'],
  photography: ['photography', 'photographer', 'photo'],
  teaching: ['teach', 'teacher', 'tutor', 'mentor', 'mentoring'],
  'event management': ['event', 'events', 'organize', 'organizing', 'coordination'],
  fundraising: ['fundraising', 'fundraiser', 'donation', 'donations'],
  leadership: ['leadership', 'lead', 'project management', 'manage'],
  writing: ['writing', 'content writing', 'copywriting', 'blogging'],
  marketing: ['marketing', 'social media', 'seo', 'branding'],
  music: ['music', 'singing', 'guitar', 'piano', 'instrument'],
  'blood donation': ['blood donation', 'blood camp', 'blood drive'],
  carpentry: ['carpenter', 'carpentry', 'woodwork'],
  healthcare: ['health', 'healthcare', 'counseling', 'nursing', 'medical'],
};

const INTENT_KEYWORDS = {
  build_team: ['team', 'hackathon team', 'build me a team', 'assemble', 'squad'],
  emergency: ['emergency', 'urgent', 'asap', 'right now', 'immediately', 'power outage', 'need someone now'],
  volunteer: ['volunteer', 'volunteers', 'ngo', 'camp', 'drive'],
  find_person: [], // default fallback
};

function normalize(text) {
  return (text || '').toLowerCase().trim();
}

function detectIntent(normalizedText) {
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (intent === 'find_person') continue;
    if (keywords.some((kw) => normalizedText.includes(kw))) return intent;
  }
  return 'find_person';
}

function extractSkills(text) {
  const normalized = normalize(text);
  const matched = new Set();

  for (const [canonicalSkill, synonyms] of Object.entries(SKILL_DICTIONARY)) {
    if (synonyms.some((syn) => {
      // Word-boundary match so short synonyms like "ui" don't hit inside "build"
      const escaped = syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`).test(normalized);
    })) {
      matched.add(canonicalSkill);
    }
  }

  // Fallback: if nothing in the dictionary matched, treat significant
  // nouns/adjectives (words > 3 chars, minus stopwords) as loose skill
  // tokens so search still returns something instead of nothing.
  if (matched.size === 0) {
    const stopwords = new Set([
      'need', 'someone', 'want', 'looking', 'for', 'with', 'find', 'help',
      'nearby', 'near', 'me', 'the', 'and', 'who', 'can', 'a', 'an', 'to',
      'build', 'our', 'we', 'i', 'is', 'are', 'in', 'my', 'this', 'team',
      'hackathon', 'please', 'someone',
    ]);
    normalized
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopwords.has(w))
      .forEach((w) => matched.add(w));
  }

  const urgent = INTENT_KEYWORDS.emergency.some((kw) => normalized.includes(kw));
  const locationHint = /\bnear(by)? me\b|\bnearby\b|\bnear\b/.test(normalized);

  let skills = Array.from(matched);
  const intent = detectIntent(normalized);

  // When building a team from a vague goal ("hackathon team"), seed common
  // complementary skill slots so the team builder has something to balance.
  if (intent === 'build_team' && skills.length < 2) {
    const defaults = ['programming', 'design', 'leadership'];
    for (const d of defaults) {
      if (!skills.includes(d)) skills.push(d);
    }
  }

  return {
    intent,
    skills,
    urgent,
    locationHint,
  };
}

module.exports = { extractSkills, SKILL_DICTIONARY };
