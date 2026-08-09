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

window.escapeHtml = escapeHtml;
window.escapeAttr = escapeAttr;
