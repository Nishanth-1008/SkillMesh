// LLM intent harness (Phase 2).
//
// When an LLM endpoint is configured (LLM_API_URL + LLM_API_KEY), query
// understanding runs through a real LLM via an OpenAI-compatible
// /chat/completions contract (also covers Gemini's OpenAI-compat layer).
// If no endpoint is configured, the call fails, times out, or returns
// malformed JSON, we transparently fall back to the deterministic
// heuristic extractor — so the API keeps working with zero configuration.

const { extractSkills } = require('../nlp/skillExtractor');

const INTENTS = ['find_person', 'build_team', 'emergency', 'volunteer'];

function llmConfigured() {
  return Boolean(process.env.LLM_API_URL && process.env.LLM_API_KEY);
}

function buildSystemPrompt() {
  return [
    'You are the intent-detection layer of a community skill-matching API.',
    'Respond with STRICT JSON only, no markdown, matching exactly this shape:',
    '{"intent":"find_person|build_team|emergency|volunteer","skills":["..."],"urgent":false,"locationHint":false}',
    `intent must be one of: ${INTENTS.join(', ')}.`,
    'skills is a short list of canonical lowercase skill names people might',
    'have (e.g. programming, design, electrical, plumbing, first aid, teaching,',
    'marketing, writing, robotics, photography, event management, leadership).',
    'urgent is true only if the request signals an emergency/asap/immediate need.',
    'locationHint is true only if the request mentions nearby/near me.',
  ].join(' ');
}

function parseLlmOutput(text) {
  const cleaned = String(text || '').trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(cleaned);
  const intent = INTENTS.includes(parsed.intent) ? parsed.intent : 'find_person';
  const rawSkills = Array.isArray(parsed.skills) ? parsed.skills : [];
  const skills = rawSkills
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
  return {
    intent,
    skills,
    urgent: Boolean(parsed.urgent),
    locationHint: Boolean(parsed.locationHint),
  };
}

async function callLlm(query) {
  const url = process.env.LLM_API_URL;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.LLM_TIMEOUT_MS) || 8000
  );
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'gpt-4o-mini',
        temperature: 0,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: query },
        ],
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('LLM returned no content');
    return parseLlmOutput(content);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Understand a query, preferring the LLM when configured.
 * @returns {Promise<{intent, skills, urgent, locationHint, source}>}
 */
async function understandQuery(query) {
  if (llmConfigured()) {
    try {
      const llm = await callLlm(query);
      return { ...llm, source: 'llm' };
    } catch (e) {
      console.warn(`[llm] falling back to heuristic extractor: ${e.message}`);
    }
  }
  return { ...extractSkills(query), source: 'heuristic' };
}

module.exports = { understandQuery, llmConfigured, INTENTS };
