// Shared frontend utilities. Loaded before views.js/app.js.
// escapeHtml() must wrap EVERY dynamic DOM injection that includes user
// data (names, bios, descriptions, messages…) to prevent XSS.

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

// Escapes a string for safe interpolation inside double-quoted HTML
// attribute values (value="..."), which must also escape quotes.
function escapeAttr(s) {
  return escapeHtml(s);
}

const AVAILABILITY_ORDER = ['available', 'busy', 'away'];

const AVAILABILITY_META = {
  available: {
    label: 'Available',
    icon: 'circle-check',
    className: 'status-available',
  },
  busy: {
    label: 'Busy',
    icon: 'clock-3',
    className: 'status-busy',
  },
  away: {
    label: 'Away',
    icon: 'moon',
    className: 'status-away',
  },
};

function normalizeAvailability(value) {
  const v = String(value || 'available').toLowerCase();
  return AVAILABILITY_META[v] ? v : 'available';
}

function nextAvailability(value) {
  const current = normalizeAvailability(value);
  const idx = AVAILABILITY_ORDER.indexOf(current);
  return AVAILABILITY_ORDER[(idx + 1) % AVAILABILITY_ORDER.length];
}

function availabilityMeta(value) {
  return AVAILABILITY_META[normalizeAvailability(value)];
}

/** Inline status markup for profile/search cards. */
function availabilityBadgeHtml(value) {
  const key = normalizeAvailability(value);
  const meta = AVAILABILITY_META[key];
  return `<span class="status-pill ${meta.className}"><i data-lucide="${meta.icon}" style="width:12px;height:12px;"></i> ${escapeHtml(meta.label)}</span>`;
}

window.escapeHtml = escapeHtml;
window.escapeAttr = escapeAttr;
window.AVAILABILITY_ORDER = AVAILABILITY_ORDER;
window.AVAILABILITY_META = AVAILABILITY_META;
window.normalizeAvailability = normalizeAvailability;
window.nextAvailability = nextAvailability;
window.availabilityMeta = availabilityMeta;
window.availabilityBadgeHtml = availabilityBadgeHtml;
