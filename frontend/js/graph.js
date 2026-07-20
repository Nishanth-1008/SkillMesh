// Minimal knowledge-graph visualizer. No external libs (no D3 available
// offline), so this lays nodes out on concentric rings by type and draws
// straight-line edges — good enough to see the mesh at Phase 1 scale.

const GraphView = {
  colorFor(type) {
    return { person: '#4da3ff', skill: '#4ce0ff', community: '#b088ff', organization: '#ffb454' }[type] || '#9aa3b8';
  },

  render(container, data) {
    const { nodes, edges } = data;
    const width = container.clientWidth || 800;
    const height = 520;
    const cx = width / 2, cy = height / 2;

    const byType = { person: [], skill: [], community: [], organization: [] };
    nodes.forEach((n) => { (byType[n.type] || (byType[n.type] = [])).push(n); });

    const ringRadius = { community: 40, person: 160, skill: 240, organization: 320 };
    const positions = {};
    Object.entries(byType).forEach(([type, list]) => {
      const r = ringRadius[type] ?? 200;
      list.forEach((n, i) => {
        const angle = (2 * Math.PI * i) / Math.max(list.length, 1);
        positions[n.id] = {
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        };
      });
    });

    const edgeLines = edges.map((e) => {
      const a = positions[e.source], b = positions[e.target];
      if (!a || !b) return '';
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="rgba(255,255,255,0.14)" stroke-width="${Math.min(1 + e.weight, 4)}" />`;
    }).join('');

    const nodeCircles = nodes.map((n) => {
      const p = positions[n.id];
      if (!p) return '';
      const color = GraphView.colorFor(n.type);
      const radius = n.type === 'community' ? 14 : n.type === 'person' ? 10 : 7;
      return `
        <g>
          <circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="${color}" fill-opacity="0.85" stroke="${color}" stroke-width="1.5">
            <title>${escapeXml(n.label)} (${n.type})</title>
          </circle>
          <text x="${p.x}" y="${p.y - radius - 6}" fill="#eef1f8" font-size="10" text-anchor="middle" opacity="0.85">${escapeXml(truncate(n.label, 16))}</text>
        </g>`;
    }).join('');

    container.innerHTML = `
      <svg class="graph-svg" viewBox="0 0 ${width} ${height}">
        ${edgeLines}
        ${nodeCircles}
      </svg>
      <div class="muted" style="margin-top:10px;">
        <span class="badge" style="border-color:#4da3ff;color:#4da3ff;">● person</span>
        <span class="badge" style="border-color:#4ce0ff;color:#4ce0ff;">● skill</span>
        <span class="badge" style="border-color:#b088ff;color:#b088ff;">● community</span>
        &nbsp;·&nbsp; ${nodes.length} nodes, ${edges.length} edges
      </div>`;
  },
};

function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}
