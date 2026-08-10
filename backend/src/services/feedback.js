// Feedback loop (Phase 2).
// Records up/down feedback users give on recommendations and derives a small
// score modifier per target user so future rankings learn from past signals.

const UP_POINTS = 8;
const DOWN_POINTS = -14;
const MAX_ADJUSTMENT = 20;

/**
 * Score adjustment for recommending `targetUserId`, based on `viewerId`'s
 * feedback history. Capped so reputation/skill signals still dominate.
 */
function feedbackModifier(state, targetUserId, viewerId) {
  if (!viewerId || !targetUserId || !Array.isArray(state.feedback)) return 0;

  let adj = 0;
  for (const f of state.feedback) {
    if (f.userId !== viewerId) continue;
    if (f.targetType === 'user' && f.targetId === targetUserId) {
      adj += f.rating === 'up' ? UP_POINTS : DOWN_POINTS;
    }
  }
  return Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, adj));
}

module.exports = { feedbackModifier, UP_POINTS, DOWN_POINTS, MAX_ADJUSTMENT };
