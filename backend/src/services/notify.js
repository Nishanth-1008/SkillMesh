// Lightweight notification + activity helpers used across Phase 2 routes.

const crypto = require('crypto');

function notify(state, { userId, type, title, body, link }) {
  const n = {
    id: crypto.randomUUID(),
    userId,
    type: type || 'info',
    title,
    body: body || '',
    link: link || null,
    read: false,
    createdAt: new Date().toISOString(),
  };
  state.notifications.push(n);
  return n;
}

function logActivity(state, { communityId, actorId, type, summary }) {
  const a = {
    id: crypto.randomUUID(),
    communityId: communityId || null,
    actorId,
    type,
    summary,
    createdAt: new Date().toISOString(),
  };
  state.activity.push(a);
  return a;
}

module.exports = { notify, logActivity };
