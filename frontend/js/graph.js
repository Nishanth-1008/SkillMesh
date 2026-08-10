// Minimal knowledge-graph visualizer. No external libs (no D3 available
// offline), so this lays nodes out on concentric rings by type and draws
// straight-line edges — good enough to see the mesh at Phase 1 scale.
//
// Viewport handling: the initial transform fits ALL nodes into the visible
// area (nothing is ever clipped), and wheel/button zoom + drag panning are
// clamped so the graph can never be panned out of reach.

const GraphView = {
  colorFor(type) {
    return {
      person: '#C55221',       // Burnt Orange
      skill: '#CC8800',        // Amber
      community: '#9A3412',    // Ochre
      organization: '#D97706', // Warm Amber
      project: '#16A34A',      // Success Green
    }[type] || '#5C6479';
  },

  render(container, data) {
    const { nodes, edges } = data;
    const width = container.clientWidth || 800;
    const height = 520;
    const cx = width / 2, cy = height / 2;
    const MIN_SCALE = 0.12, MAX_SCALE = 3, PAN_PAD = 16;

    let selectedNodeId = null;
    let view = null; // { k, tx, ty } — persists across re-renders (node clicks)

    const byType = { person: [], skill: [], community: [], organization: [], project: [] };
    nodes.forEach((n) => { (byType[n.type] || (byType[n.type] = [])).push(n); });

    const maxPerRing = Math.max(...Object.values(byType).map((l) => l.length), 1);
    const ringScale = Math.max(1, Math.sqrt(maxPerRing / 8));
    const ringRadius = {
      community: Math.min(40 * ringScale, 100),
      person: Math.min(160 * ringScale, 230),
      skill: Math.min(240 * ringScale, 310),
      organization: Math.min(320 * ringScale, 380),
      project: Math.min(200 * ringScale, 280),
    };

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

    // Content bounds in world coordinates (node radius + label space included).
    const NODE_EXTENT = 34;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
      const p = positions[n.id];
      if (!p) return;
      minX = Math.min(minX, p.x - NODE_EXTENT);
      maxX = Math.max(maxX, p.x + NODE_EXTENT);
      minY = Math.min(minY, p.y - NODE_EXTENT);
      maxY = Math.max(maxY, p.y + NODE_EXTENT);
    });
    if (!isFinite(minX)) { minX = 0; maxX = width; minY = 0; maxY = height; }
    const contentW = maxX - minX, contentH = maxY - minY;

    const clampK = (k) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, k));
    const fitK = () => {
      const k = Math.min(width / contentW, height / contentH) * 0.94;
      return clampK(k);
    };
    const clampPan = () => {
      const cw = contentW * view.k, ch = contentH * view.k;
      view.tx = cw <= width
        ? (width - cw) / 2
        : Math.min(PAN_PAD, Math.max(width - cw - PAN_PAD, view.tx));
      view.ty = ch <= height
        ? (height - ch) / 2
        : Math.min(PAN_PAD, Math.max(height - ch - PAN_PAD, view.ty));
    };
    const resetView = () => {
      const k = fitK();
      view = { k, tx: (width - contentW * k) / 2, ty: (height - contentH * k) / 2 };
      clampPan();
    };
    if (!view) resetView();

    const zoomAt = (mx, my, factor) => {
      const k = clampK(view.k * factor);
      const wx = (mx - view.tx) / view.k;
      const wy = (my - view.ty) / view.k;
      view.k = k;
      view.tx = mx - wx * k;
      view.ty = my - wy * k;
      clampPan();
    };

    const renderGraph = () => {
      // Find connected node IDs for the selected node (person -> skill, community -> person/members)
      const connectedNodeIds = new Set();
      const connectedEdgeIds = new Set();
      let selectedNode = null;

      if (selectedNodeId) {
        selectedNode = nodes.find((n) => n.id === selectedNodeId);
        if (selectedNode) {
          const targetType = selectedNode.type === 'person' ? 'skill' : selectedNode.type === 'community' ? 'person' : null;
          edges.forEach((e) => {
            if (e.source === selectedNodeId || e.target === selectedNodeId) {
              const otherId = e.source === selectedNodeId ? e.target : e.source;
              const otherNode = nodes.find((n) => n.id === otherId);
              if (otherNode && (targetType === null || otherNode.type === targetType)) {
                connectedNodeIds.add(otherId);
                connectedEdgeIds.add(e.id || `${e.source}-${e.target}`);
              }
            }
          });
        }
      }

      const edgeLines = edges.map((e) => {
        const a = positions[e.source], b = positions[e.target];
        if (!a || !b) return '';
        const edgeId = e.id || `${e.source}-${e.target}`;
        const isHighlighted = connectedEdgeIds.has(edgeId);
        const strokeColor = isHighlighted ? (selectedNode && selectedNode.type === 'community' ? '#b088ff' : '#4ce0ff') : 'rgba(255,255,255,0.14)';
        const strokeWidth = isHighlighted ? 3 : Math.min(1 + e.weight, 4);
        return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${isHighlighted ? 'style="filter: drop-shadow(0 0 6px ' + strokeColor + ');"' : ''} />`;
      }).join('');

      const nodeCircles = nodes.map((n) => {
        const p = positions[n.id];
        if (!p) return '';
        const isSelected = n.id === selectedNodeId;
        const isConnected = connectedNodeIds.has(n.id);
        const color = GraphView.colorFor(n.type);

        let radius = n.type === 'community' ? 14 : n.type === 'person' ? 10 : 7;
        let strokeColor = color;
        let strokeWidth = 1.5;
        let fillOpacity = 0.85;

        if (isSelected) {
          radius = n.type === 'community' ? 18 : 15;
          strokeColor = '#ffffff';
          strokeWidth = 3;
          fillOpacity = 1;
        } else if (isConnected) {
          radius = n.type === 'person' ? 12 : 11;
          strokeColor = n.type === 'person' ? '#b088ff' : '#4ce0ff';
          strokeWidth = 2.5;
          fillOpacity = 1;
        }

        const isClickable = n.type === 'person' || n.type === 'community';
        const cursorStyle = isClickable ? 'cursor: pointer;' : '';

        return `
          <g class="graph-node ${isClickable ? 'node-clickable' : ''}" data-id="${n.id}" style="${cursorStyle}">
            <circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="${color}" fill-opacity="${fillOpacity}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${isSelected || isConnected ? 'style="filter: drop-shadow(0 0 8px ' + (isSelected ? '#ffffff' : color) + ');"' : ''}>
              <title>${escapeXml(n.label)} (${n.type}) ${isClickable ? '— Click to toggle connected nodes' : ''}</title>
            </circle>
            <text x="${p.x}" y="${p.y - radius - 6}" fill="${isSelected || isConnected ? '#ffffff' : '#eef1f8'}" font-size="${isSelected ? '12' : '10'}" font-weight="${isSelected || isConnected ? 'bold' : 'normal'}" text-anchor="middle" opacity="${isSelected || isConnected ? '1' : '0.85'}">${escapeXml(truncate(n.label, 16))}</text>
          </g>`;
      }).join('');

      const connectedNodesList = Array.from(connectedNodeIds)
        .map((id) => nodes.find((n) => n.id === id))
        .filter(Boolean);

      let popupHtml = '';
      if (selectedNode) {
        if (selectedNode.type === 'person') {
          popupHtml = `
            <div class="card" style="margin-top: 14px; padding: 14px 18px; background: rgba(76, 224, 255, 0.08); border-color: rgba(76, 224, 255, 0.3);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong><i data-lucide="zap" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i> Attached Skills for ${escapeXml(selectedNode.label)}:</strong>
                <button class="btn btn-sm" id="close-graph-popup" style="padding: 2px 8px; font-size: 11px;"><i data-lucide="x" style="width: 12px; height: 12px; vertical-align: middle;"></i> Close</button>
              </div>
              <div style="margin-top: 8px; max-height: 220px; overflow-y: auto;">
                ${connectedNodesList.length
                  ? connectedNodesList.map((s) => `<span class="badge badge-skill"><i data-lucide="sparkles" style="width: 12px; height: 12px; vertical-align: middle;"></i> ${escapeXml(s.label)}</span>`).join(' ')
                  : '<span class="muted">No attached skill nodes found in graph.</span>'}
              </div>
            </div>`;
        } else if (selectedNode.type === 'community') {
          popupHtml = `
            <div class="card" style="margin-top: 14px; padding: 14px 18px; background: rgba(176, 136, 255, 0.1); border-color: rgba(176, 136, 255, 0.35);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong><i data-lucide="globe" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i> Members of ${escapeXml(selectedNode.label)}:</strong>
                <button class="btn btn-sm" id="close-graph-popup" style="padding: 2px 8px; font-size: 11px;"><i data-lucide="x" style="width: 12px; height: 12px; vertical-align: middle;"></i> Close</button>
              </div>
              <div style="margin-top: 8px; max-height: 220px; overflow-y: auto;">
                ${connectedNodesList.length
                  ? connectedNodesList.map((p) => `<span class="badge" style="border-color:#b088ff;color:#ffffff;"><i data-lucide="user" style="width: 12px; height: 12px; vertical-align: middle;"></i> ${escapeXml(p.label)}</span>`).join(' ')
                  : '<span class="muted">No member nodes found in graph.</span>'}
              </div>
            </div>`;
        }
      }

      container.innerHTML = `
        <div class="graph-shell">
          <svg class="graph-svg" viewBox="0 0 ${width} ${height}">
            <g class="graph-transform" transform="translate(${view.tx}, ${view.ty}) scale(${view.k})">
              ${edgeLines}
              ${nodeCircles}
            </g>
          </svg>
          <div class="graph-toolbar" role="toolbar" aria-label="Graph zoom controls">
            <button class="graph-tool-btn" id="graph-zoom-in" title="Zoom in" aria-label="Zoom in"><i data-lucide="zoom-in"></i></button>
            <button class="graph-tool-btn" id="graph-zoom-out" title="Zoom out" aria-label="Zoom out"><i data-lucide="zoom-out"></i></button>
            <button class="graph-tool-btn" id="graph-zoom-reset" title="Reset view" aria-label="Reset view"><i data-lucide="maximize-2"></i></button>
          </div>
        </div>
        <div class="muted" style="margin-top:10px;">
          <span class="badge" style="border-color:#4da3ff;color:#4da3ff;">● person (click)</span>
          <span class="badge" style="border-color:#4ce0ff;color:#4ce0ff;">● skill</span>
          <span class="badge" style="border-color:#b088ff;color:#b088ff;">● community (click)</span>
          <span class="badge" style="border-color:#ffb454;color:#ffb454;">● org</span>
          <span class="badge" style="border-color:#4ce0a0;color:#4ce0a0;">● project</span>
          &nbsp;·&nbsp; ${nodes.length} nodes, ${edges.length} edges
          <span class="muted">&nbsp;·&nbsp; scroll to zoom · drag to pan</span>
        </div>
        ${popupHtml}`;

      const svg = container.querySelector('.graph-svg');

      const getPos = (ev) => {
        const rect = svg.getBoundingClientRect();
        return {
          x: (ev.clientX - rect.left) * (width / rect.width),
          y: (ev.clientY - rect.top) * (height / rect.height),
        };
      };

      svg.addEventListener('wheel', (ev) => {
        ev.preventDefault();
        const p = getPos(ev);
        zoomAt(p.x, p.y, ev.deltaY < 0 ? 1.18 : 1 / 1.18);
        applyTransform();
      }, { passive: false });

      let dragging = false, didDrag = false, startX = 0, startY = 0, startTx = 0, startTy = 0;
      svg.addEventListener('pointerdown', (ev) => {
        dragging = true;
        didDrag = false;
        startX = ev.clientX; startY = ev.clientY;
        startTx = view.tx; startTy = view.ty;
        svg.setPointerCapture(ev.pointerId);
      });
      svg.addEventListener('pointermove', (ev) => {
        if (!dragging) return;
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDrag = true;
        if (didDrag) {
          view.tx = startTx + dx;
          view.ty = startTy + dy;
          clampPan();
          applyTransform();
        }
      });
      const endDrag = (ev) => {
        if (!dragging) return;
        dragging = false;
        if (svg.hasPointerCapture && svg.hasPointerCapture(ev.pointerId)) {
          svg.releasePointerCapture(ev.pointerId);
        }
      };
      svg.addEventListener('pointerup', endDrag);
      svg.addEventListener('pointercancel', endDrag);

      const applyTransform = () => {
        const g = container.querySelector('.graph-transform');
        if (g) g.setAttribute('transform', `translate(${view.tx}, ${view.ty}) scale(${view.k})`);
      };

      const zoomBy = (factor) => {
        zoomAt(width / 2, height / 2, factor);
        applyTransform();
      };

      const zoomInBtn = container.querySelector('#graph-zoom-in');
      const zoomOutBtn = container.querySelector('#graph-zoom-out');
      const zoomResetBtn = container.querySelector('#graph-zoom-reset');
      if (zoomInBtn) zoomInBtn.onclick = () => zoomBy(1.3);
      if (zoomOutBtn) zoomOutBtn.onclick = () => zoomBy(1 / 1.3);
      if (zoomResetBtn) zoomResetBtn.onclick = () => { resetView(); applyTransform(); };

      // Attach click events on clickable nodes (person & community).
      // A click after a drag gesture is suppressed so panning never toggles nodes.
      container.querySelectorAll('.node-clickable').forEach((el) => {
        el.onclick = (ev) => {
          ev.stopPropagation();
          if (didDrag) return;
          const nodeId = el.getAttribute('data-id');
          selectedNodeId = selectedNodeId === nodeId ? null : nodeId;
          renderGraph();
        };
      });

      const closeBtn = container.querySelector('#close-graph-popup');
      if (closeBtn) {
        closeBtn.onclick = () => {
          selectedNodeId = null;
          renderGraph();
        };
      }

      window.lucide?.createIcons();
    };

    renderGraph();
  },
};

function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}
