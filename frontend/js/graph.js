// Minimal knowledge-graph visualizer. No external libs (no D3 available
// offline), so this lays nodes out on concentric rings by type and draws
// straight-line edges — good enough to see the mesh at Phase 1 scale.

const GraphView = {
  colorFor(type) {
    return {
      person: '#4da3ff',
      skill: '#4ce0ff',
      community: '#b088ff',
      organization: '#ffb454',
      project: '#4ce0a0',
    }[type] || '#9aa3b8';
  },

  render(container, data) {
    const { nodes, edges } = data;
    const width = container.clientWidth || 800;
    const height = 520;
    const cx = width / 2, cy = height / 2;

    let expandedPersonId = null;

    const renderGraph = () => {
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

      // Find connected skill node IDs for the expanded person
      const connectedSkillIds = new Set();
      const connectedEdgeIds = new Set();
      let expandedPersonNode = null;

      if (expandedPersonId) {
        expandedPersonNode = nodes.find((n) => n.id === expandedPersonId);
        edges.forEach((e) => {
          if (e.source === expandedPersonId || e.target === expandedPersonId) {
            const otherId = e.source === expandedPersonId ? e.target : e.source;
            const otherNode = nodes.find((n) => n.id === otherId);
            if (otherNode && otherNode.type === 'skill') {
              connectedSkillIds.add(otherId);
              connectedEdgeIds.add(e.id || `${e.source}-${e.target}`);
            }
          }
        });
      }

      const edgeLines = edges.map((e) => {
        const a = positions[e.source], b = positions[e.target];
        if (!a || !b) return '';
        const edgeId = e.id || `${e.source}-${e.target}`;
        const isHighlighted = connectedEdgeIds.has(edgeId);
        const strokeColor = isHighlighted ? '#4ce0ff' : 'rgba(255,255,255,0.14)';
        const strokeWidth = isHighlighted ? 3 : Math.min(1 + e.weight, 4);
        return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${isHighlighted ? 'style="filter: drop-shadow(0 0 6px #4ce0ff);"' : ''} />`;
      }).join('');

      const nodeCircles = nodes.map((n) => {
        const p = positions[n.id];
        if (!p) return '';
        const isExpandedPerson = n.id === expandedPersonId;
        const isConnectedSkill = connectedSkillIds.has(n.id);
        const color = GraphView.colorFor(n.type);
        
        let radius = n.type === 'community' ? 14 : n.type === 'person' ? 10 : 7;
        let strokeColor = color;
        let strokeWidth = 1.5;
        let fillOpacity = 0.85;

        if (isExpandedPerson) {
          radius = 15;
          strokeColor = '#ffffff';
          strokeWidth = 3;
          fillOpacity = 1;
        } else if (isConnectedSkill) {
          radius = 11;
          strokeColor = '#4ce0ff';
          strokeWidth = 2.5;
          fillOpacity = 1;
        }

        const isClickable = n.type === 'person';
        const cursorStyle = isClickable ? 'cursor: pointer;' : '';

        return `
          <g class="graph-node ${isClickable ? 'node-person' : ''}" data-id="${n.id}" style="${cursorStyle}">
            <circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="${color}" fill-opacity="${fillOpacity}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${isExpandedPerson || isConnectedSkill ? 'style="filter: drop-shadow(0 0 8px ' + color + ');"' : ''}>
              <title>${escapeXml(n.label)} (${n.type}) ${isClickable ? '— Click to toggle attached skills' : ''}</title>
            </circle>
            <text x="${p.x}" y="${p.y - radius - 6}" fill="${isExpandedPerson || isConnectedSkill ? '#ffffff' : '#eef1f8'}" font-size="${isExpandedPerson ? '12' : '10'}" font-weight="${isExpandedPerson || isConnectedSkill ? 'bold' : 'normal'}" text-anchor="middle" opacity="${isExpandedPerson || isConnectedSkill ? '1' : '0.85'}">${escapeXml(truncate(n.label, 16))}</text>
          </g>`;
      }).join('');

      const connectedSkillNodes = Array.from(connectedSkillIds)
        .map((id) => nodes.find((n) => n.id === id))
        .filter(Boolean);

      const skillPopupHtml = expandedPersonNode
        ? `<div class="card" style="margin-top: 14px; padding: 14px 18px; background: rgba(76, 224, 255, 0.08); border-color: rgba(76, 224, 255, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong>⚡ Attached Skills for ${escapeXml(expandedPersonNode.label)}:</strong>
              <button class="btn btn-sm" id="close-skill-popup" style="padding: 2px 8px; font-size: 11px;">✕ Close</button>
            </div>
            <div style="margin-top: 8px;">
              ${connectedSkillNodes.length
                ? connectedSkillNodes.map((s) => `<span class="badge badge-skill">✦ ${escapeXml(s.label)}</span>`).join(' ')
                : '<span class="muted">No attached skill nodes found in graph.</span>'}
            </div>
          </div>`
        : '';

      container.innerHTML = `
        <svg class="graph-svg" viewBox="0 0 ${width} ${height}">
          ${edgeLines}
          ${nodeCircles}
        </svg>
        <div class="muted" style="margin-top:10px;">
          <span class="badge" style="border-color:#4da3ff;color:#4da3ff;">● person (click)</span>
          <span class="badge" style="border-color:#4ce0ff;color:#4ce0ff;">● skill</span>
          <span class="badge" style="border-color:#b088ff;color:#b088ff;">● community</span>
          <span class="badge" style="border-color:#ffb454;color:#ffb454;">● org</span>
          <span class="badge" style="border-color:#4ce0a0;color:#4ce0a0;">● project</span>
          &nbsp;·&nbsp; ${nodes.length} nodes, ${edges.length} edges
        </div>
        ${skillPopupHtml}`;

      // Attach click events on person nodes
      container.querySelectorAll('.node-person').forEach((el) => {
        el.onclick = (ev) => {
          ev.stopPropagation();
          const nodeId = el.getAttribute('data-id');
          expandedPersonId = expandedPersonId === nodeId ? null : nodeId;
          renderGraph();
        };
      });

      const closeBtn = container.querySelector('#close-skill-popup');
      if (closeBtn) {
        closeBtn.onclick = () => {
          expandedPersonId = null;
          renderGraph();
        };
      }
    };

    renderGraph();
  },
};

function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}
