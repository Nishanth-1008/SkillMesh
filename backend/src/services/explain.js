// Explainability (Phase 2).
// Turns the structured signals the recommenders already compute into a small,
// human-readable list of reasons for each recommendation. The frontend renders
// these verbatim, so they must read like plain sentences.

function buildExplain(parts = {}) {
  const lines = [];

  if (Array.isArray(parts.matchedSkills) && parts.matchedSkills.length) {
    lines.push(`Matched your request with: ${parts.matchedSkills.join(', ')}`);
  }
  if (Array.isArray(parts.teachable) && parts.teachable.length) {
    lines.push(`Can teach you: ${parts.teachable.join(', ')}`);
  }
  if (Array.isArray(parts.sharedSkills) && parts.sharedSkills.length) {
    lines.push(`Shares your interests in: ${parts.sharedSkills.join(', ')}`);
  }
  if (Array.isArray(parts.inferredHits) && parts.inferredHits.length) {
    lines.push(`Collaborated with people who have: ${parts.inferredHits.join(', ')}`);
  }
  if (Array.isArray(parts.newCoverage) && parts.newCoverage.length) {
    lines.push(`Covers an open need on the team: ${parts.newCoverage.join(', ')}`);
  }

  if (typeof parts.trustScore === 'number') {
    lines.push(`Trust score ${Math.round(parts.trustScore)}/100`);
  }
  if (parts.endorsements) {
    lines.push(`Endorsed by ${parts.endorsements} people`);
  }
  if (parts.volunteerHistory) {
    lines.push(`Volunteered ${parts.volunteerHistory} time(s)`);
  }
  if (parts.priorCollaborations) {
    lines.push(`${parts.priorCollaborations} prior collaboration(s)`);
  }
  if (parts.compatibility) {
    lines.push(`Strong prior collaboration with teammates`);
  }
  if (parts.availability === 'available') {
    lines.push('Available right now');
  } else if (parts.availability === 'busy') {
    lines.push('Currently busy');
  }
  if (parts.sameArea) {
    lines.push(`Works nearby (${parts.sameArea})`);
  }

  return lines;
}

module.exports = { buildExplain };
