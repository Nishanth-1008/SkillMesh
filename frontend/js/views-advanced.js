// Phase 3–6 views (extends Views from views.js)

Views.analytics = async function (root) {
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading communities…</div>`;
  try {
    const { communities } = await Api.listCommunities();
    if (!communities.length) {
      root.innerHTML = `<div class="info-box">Create a community first.</div>`;
      return;
    }
    let insightsHtml = '';
    if (Store.isLoggedIn()) {
      try {
        const insights = await Api.myInsights();
        insightsHtml = `
          <div class="card">
            <h3>Personalized insights</h3>
            <p class="muted">Trust ${insights.trustScore}</p>
            ${(insights.insights || []).map((i) => `<p class="info-box">${escapeHtml(i.message)}</p>`).join('') || '<p class="muted">No insights yet — join a community and add skills.</p>'}
            ${(insights.learningRecommendations || []).length ? `<p><strong>Learn next:</strong> ${insights.learningRecommendations.map((l) => `<span class="badge badge-skill">${escapeHtml(l.skill)}</span>`).join(' ')}</p>` : ''}
          </div>`;
      } catch { /* optional */ }
    }
    root.innerHTML = `
      ${insightsHtml}
      <div class="card">
        <h3>Community Intelligence</h3>
        <p class="muted">Skill gaps, health scores, predictions, and member insights. <span class="badge">demo AI</span></p>
        <select class="input" id="cid">${communities.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select>
        <button class="btn btn-primary" id="load">Load dashboard</button>
      </div>
      <div id="dash"></div>
    `;
    const load = async () => {
      const id = root.querySelector('#cid').value;
      const dashEl = root.querySelector('#dash');
      dashEl.innerHTML = `<div class="loading-line"><span class="spinner"></span> Analyzing…</div>`;
      const [d, milestones, forecast] = await Promise.all([
        Api.communityAnalytics(id),
        Api.milestones(id).catch(() => ({ milestones: [] })),
        Api.forecast(id).catch(() => null),
      ]);
      const h = d.health;
      dashEl.innerHTML = `
        <div class="grid">
          <div class="card"><h3>Health index</h3><div class="stat-big">${h.healthIndex}</div>
            <p class="muted">Engagement ${h.engagementScore} · Collaboration ${h.collaborationScore} · Diversity ${h.diversityScore}</p>
            <div class="trust-track"><div class="trust-fill" style="width:${h.healthIndex}%"></div></div>
          </div>
          <div class="card"><h3>Members</h3><div class="stat-big">${h.metrics.members}</div>
            <p class="muted">${h.metrics.available} available · ${h.metrics.uniqueSkills} skills · ${h.metrics.activeProjects} active projects</p>
          </div>
          <div class="card"><h3>Milestones</h3>
            ${(milestones.milestones || []).map((m) => `
              <p><strong>${escapeHtml(m.label)}</strong> ${m.reached ? '<i data-lucide="check" style="width: 14px; height: 14px; color: var(--green);"></i>' : `${m.progress}%`}
              <div class="trust-track"><div class="trust-fill" style="width:${m.progress}%"></div></div></p>
            `).join('') || '<p class="muted">None</p>'}
          </div>
        </div>
        <div class="card">
          <h3>Skill gaps</h3>
          ${(d.skills.gaps || []).map((g) => `
            <div class="result-row"><div><strong>${escapeHtml(g.skill)}</strong> <span class="badge badge-urgent">${escapeHtml(g.severity)}</span>
              <p class="muted">${escapeHtml(g.recommendation)}</p></div></div>
          `).join('') || '<p class="muted">No gaps detected.</p>'}
        </div>
        ${forecast ? `
        <div class="card">
          <h3>Forecast</h3>
          <p class="muted">Health outlook: <strong>${escapeHtml(forecast.healthTrend.outlook)}</strong> (now ${forecast.healthTrend.current})</p>
          <p class="muted">Volunteer demand: ${escapeHtml(forecast.volunteerForecast.forecast)} · ${forecast.volunteerForecast.openRoles} open roles</p>
          ${(forecast.crisisRisk || []).map((r) => `<p class="muted"><i data-lucide="alert-triangle" style="width: 14px; height: 14px; color: var(--amber);"></i> ${escapeHtml(r.detail)}</p>`).join('')}
        </div>` : ''}
        <div class="card">
          <h3>Emerging leaders</h3>
          ${(d.predictions.emergingLeaders || []).map((l) => `
            <span class="badge badge-matched">${escapeHtml(l.user.name)} (${l.leadershipScore})</span>
          `).join(' ') || '<p class="muted">None yet.</p>'}
        </div>
      `;
    };
    root.querySelector('#load').onclick = load;
    load();
  } catch (e) {
    root.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
  }
};

Views.events = async function (root) {
  root.innerHTML = `
    <div class="card">
      <h3>Events &amp; Initiatives</h3>
      <p class="muted">Workshops, camps, and community campaigns with attendance + impact reports.</p>
    </div>
    ${Store.isLoggedIn() ? `
    <div class="card">
      <h3>Create event</h3>
      <div id="msg"></div>
      <input class="input" id="title" placeholder="Title" />
      <textarea class="input" id="desc" rows="2" placeholder="Description"></textarea>
      <input class="input" id="cid" placeholder="Community ID" />
      <button class="btn btn-primary" id="create">Save Event</button>
    </div>` : ''}
    <div class="card" style="padding: 12px 18px;">
      <div style="display:flex; gap:10px; align-items:center;" id="event-bar-tabs">
        <strong style="margin-right:8px;">Event Bar:</strong>
        <button class="btn btn-sm active" data-filter="all">All Events</button>
        <button class="btn btn-sm" data-filter="upcoming">Upcoming</button>
        <button class="btn btn-sm" data-filter="completed">Completed</button>
      </div>
    </div>
    <div id="list" class="grid"><div class="loading-line"><span class="spinner"></span> Loading…</div></div>
  `;

  let currentFilter = 'all';

  async function loadEventsList() {
    const listEl = root.querySelector('#list');
    if (!listEl) return;
    listEl.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading events…</div>`;
    const { events } = await Api.listEvents();
    
    let filtered = events;
    if (currentFilter === 'upcoming') filtered = events.filter((e) => e.status === 'upcoming' || e.status === 'open');
    else if (currentFilter === 'completed') filtered = events.filter((e) => e.status === 'completed' || e.status === 'closed');

    listEl.innerHTML = filtered.length ? filtered.map((e) => `
      <div class="card">
        <span class="badge">${escapeHtml(e.type || 'event')}</span>
        <h3>${escapeHtml(e.title)}</h3>
        <p class="muted">${escapeHtml(e.description || '')}</p>
        <p class="muted">${e.startAt ? new Date(e.startAt).toLocaleString() : 'TBD'} · ${e.registered || 0} registered · ${escapeHtml(e.status)}</p>
        <button class="btn" data-view="${e.id}">Open</button>
        ${Store.isLoggedIn() ? `<button class="btn btn-primary" data-reg="${e.id}">Register</button>` : ''}
      </div>
    `).join('') : '<p class="muted">No events found in this category.</p>';

    listEl.querySelectorAll('[data-view]').forEach((btn) => {
      btn.onclick = () => App.navigate('event', { id: btn.getAttribute('data-view') });
    });
    listEl.querySelectorAll('[data-reg]').forEach((btn) => {
      btn.onclick = async () => {
        await Api.registerEvent(btn.getAttribute('data-reg'));
        await loadEventsList();
      };
    });
  }

  root.querySelectorAll('#event-bar-tabs button').forEach((btn) => {
    btn.onclick = async () => {
      root.querySelectorAll('#event-bar-tabs button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      await loadEventsList();
    };
  });

  if (Store.isLoggedIn()) {
    const { communities } = await Api.listCommunities();
    if (communities[0] && root.querySelector('#cid')) root.querySelector('#cid').value = communities[0].id;
    const createBtn = root.querySelector('#create');
    if (createBtn) {
      createBtn.onclick = async () => {
        const title = root.querySelector('#title').value.trim();
        const description = root.querySelector('#desc').value.trim();
        const communityId = root.querySelector('#cid').value.trim();
        const msgEl = root.querySelector('#msg');

        if (!title || !communityId) {
          msgEl.innerHTML = `<div class="error-box">Title and Community ID are required.</div>`;
          return;
        }

        try {
          createBtn.disabled = true;
          createBtn.innerHTML = `<span class="spinner"></span> Saving…`;
          await Api.createEvent({ title, description, communityId });
          
          root.querySelector('#title').value = '';
          root.querySelector('#desc').value = '';
          msgEl.innerHTML = `<div class="info-box">Event saved successfully and added to Event Bar!</div>`;
          createBtn.disabled = false;
          createBtn.innerHTML = `Save Event`;

          currentFilter = 'all';
          root.querySelectorAll('#event-bar-tabs button').forEach((b) => b.classList.remove('active'));
          const allBtn = root.querySelector('#event-bar-tabs button[data-filter="all"]');
          if (allBtn) allBtn.classList.add('active');

          await loadEventsList();
        } catch (e) {
          msgEl.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
          createBtn.disabled = false;
          createBtn.innerHTML = `Save Event`;
        }
      };
    }
  }

  await loadEventsList();
};

Views.event = async function (root, params) {
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading event…</div>`;
  try {
    const { event, attendance } = await Api.getEvent(params.id);
    const me = Store.getUser();
    const isCreator = me && event.creatorId === me.id;
    root.innerHTML = `
      <div class="card">
        <span class="badge">${escapeHtml(event.type || 'event')}</span>
        <h3>${escapeHtml(event.title)}</h3>
        <p class="muted">${escapeHtml(event.description || '')}</p>
        <p class="muted">${event.startAt ? new Date(event.startAt).toLocaleString() : 'TBD'} · ${escapeHtml(event.status)}
          ${event.location ? ` · ${escapeHtml(event.location)}` : ''}</p>
        <div>${(event.skillsNeeded || []).map((s) => `<span class="badge badge-skill">${escapeHtml(s)}</span>`).join(' ')}</div>
        ${Store.isLoggedIn() && event.status === 'upcoming' ? `<button class="btn btn-primary" id="reg" style="margin-top:12px;">Register</button>` : ''}
        ${event.impactReport ? `<div class="info-box" style="margin-top:12px;">Impact: ${escapeHtml(event.impactReport.summary || '')} · ${event.impactReport.peopleHelped || 0} people · ${event.impactReport.volunteerHours || 0}h</div>` : ''}
      </div>
      <div class="card">
        <h3>Attendance (${attendance.length})</h3>
        ${attendance.map((a) => `
          <div class="result-row">
            <div><strong>${escapeHtml(a.user ? a.user.name : '?')}</strong> <span class="badge">${escapeHtml(a.status)}</span></div>
            ${isCreator && a.status === 'registered' ? `<button class="btn btn-primary" data-checkin="${a.userId}">Check in</button>` : ''}
          </div>
        `).join('') || '<p class="muted">No registrations yet.</p>'}
      </div>
      ${isCreator && !event.impactReport ? `
      <div class="card">
        <h3>File impact report</h3>
        <div id="impact-msg"></div>
        <textarea class="input" id="impact-summary" rows="2" placeholder="What happened?"></textarea>
        <input class="input" id="impact-people" type="number" placeholder="People helped" />
        <input class="input" id="impact-hours" type="number" placeholder="Volunteer hours" />
        <button class="btn btn-primary" id="impact-btn">Submit &amp; complete event</button>
      </div>` : ''}
    `;
    if (root.querySelector('#reg')) {
      root.querySelector('#reg').onclick = async () => { await Api.registerEvent(event.id); App.navigate('event', { id: event.id }); };
    }
    root.querySelectorAll('[data-checkin]').forEach((btn) => {
      btn.onclick = async () => {
        await Api.checkinEvent(event.id, btn.getAttribute('data-checkin'));
        App.navigate('event', { id: event.id });
      };
    });
    if (root.querySelector('#impact-btn')) {
      root.querySelector('#impact-btn').onclick = async () => {
        try {
          await Api.eventImpact(event.id, {
            summary: root.querySelector('#impact-summary').value.trim(),
            peopleHelped: Number(root.querySelector('#impact-people').value) || 0,
            volunteerHours: Number(root.querySelector('#impact-hours').value) || 0,
            tags: ['event', 'community'],
          });
          App.navigate('event', { id: event.id });
        } catch (e) {
          root.querySelector('#impact-msg').innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
        }
      };
    }
  } catch (e) {
    root.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
  }
};

Views.leaderboard = async function (root) {
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading…</div>`;
  try {
    const [{ leaderboard }, mine] = await Promise.all([
      Api.leaderboard(),
      Store.isLoggedIn() ? Api.myGamification() : Promise.resolve(null),
    ]);
    root.innerHTML = `
      ${mine ? `<div class="card">
        <h3>Your rewards</h3>
        <div class="stat-big">${mine.points.balance} pts</div>
        <p>${(mine.achievements || []).map((a) => `<span class="badge badge-matched">${escapeHtml(a.label || a.achievement)}</span>`).join(' ') || '<span class="muted">No achievements yet</span>'}</p>
      </div>` : ''}
      <div class="card">
        <h3>Leaderboard</h3>
        ${leaderboard.map((r) => `
          <div class="result-row">
            <div class="result-main">
              <div class="result-rank">${r.rank}</div>
              <div><strong>${escapeHtml(r.user.name)}</strong>
                <p class="muted">${r.achievementCount} achievements · ${r.contributionPoints} contrib pts</p>
              </div>
            </div>
            <div class="score-pill">${r.score}</div>
          </div>
        `).join('') || '<p class="muted">Empty.</p>'}
      </div>
    `;
  } catch (e) {
    root.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
  }
};

Views.admin = async function (root) {
  if (!Store.isLoggedIn()) {
    root.innerHTML = `<div class="error-box">Log in as a community owner to access admin tools.</div>`;
    return;
  }
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading admin…</div>`;
  try {
    const [{ users, communities }, audit] = await Promise.all([
      Api.adminUsers(),
      Api.adminAudit(),
    ]);
    root.innerHTML = `
      <div class="card">
        <h3>Admin · ${communities.map((c) => escapeHtml(c.name)).join(', ')}</h3>
        <p class="muted">Owner-only moderation, audit logs, and member overview.</p>
      </div>
      <div class="card">
        <h3>Members (${users.length})</h3>
        ${users.map((u) => `<span class="badge" style="cursor:pointer;" data-p="${u.id}">${escapeHtml(u.name)}</span>`).join(' ')}
      </div>
      <div class="card">
        <h3>Moderate</h3>
        <div id="mod-msg"></div>
        <select class="input" id="mod-action">
          <option value="close_opportunity">Close opportunity</option>
          <option value="archive_project">Archive project</option>
        </select>
        <input class="input" id="mod-target" placeholder="Target ID (opportunity or project)" />
        <input class="input" id="mod-reason" placeholder="Reason" />
        <button class="btn btn-primary" id="mod-btn">Apply</button>
      </div>
      <div class="card">
        <h3>Audit log</h3>
        ${(audit.auditLogs || []).slice(0, 15).map((l) => `
          <div class="msg-row"><code>${escapeHtml(l.action)}</code>
            <p class="muted" style="font-size:12px;">${new Date(l.createdAt).toLocaleString()}</p></div>
        `).join('') || '<p class="muted">No audit entries yet.</p>'}
      </div>
      <div class="card">
        <h3>Open reports</h3>
        ${(audit.reports || []).map((r) => `
          <p class="muted">${escapeHtml(r.targetType)} ${escapeHtml(r.targetId)}: ${escapeHtml(r.reason)} <span class="badge">${escapeHtml(r.status)}</span></p>
        `).join('') || '<p class="muted">No reports.</p>'}
      </div>
    `;
    root.querySelectorAll('[data-p]').forEach((el) => {
      el.onclick = () => App.navigate('profile', { id: el.getAttribute('data-p') });
    });
    root.querySelector('#mod-btn').onclick = async () => {
      const msg = root.querySelector('#mod-msg');
      try {
        await Api.adminModerate({
          targetType: root.querySelector('#mod-action').value.includes('opportunity') ? 'opportunity' : 'project',
          targetId: root.querySelector('#mod-target').value.trim(),
          action: root.querySelector('#mod-action').value,
          reason: root.querySelector('#mod-reason').value.trim(),
        });
        msg.innerHTML = `<div class="info-box">Moderation applied.</div>`;
        App.navigate('admin');
      } catch (e) {
        msg.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
      }
    };
  } catch (e) {
    root.innerHTML = `<div class="error-box">${escapeHtml(e.message)}<p class="muted">You must own at least one community.</p></div>`;
  }
};

Views.hub = async function (root) {
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading public hub…</div>`;
  try {
    const [data, parts] = await Promise.all([
      Api.publicHub(),
      Api.partnerships().catch(() => ({ partnerships: [], federations: [] })),
    ]);
    root.innerHTML = `
      <div class="card">
        <h3>Public Community Hub</h3>
        <p class="muted">Open directory of communities, showcases, and opportunities.</p>
      </div>
      <div class="grid">
        ${(data.directory || []).map((c) => c && `
          <div class="card">
            <h3>${escapeHtml(c.name)}</h3>
            <p class="muted">${escapeHtml(c.description || '')}</p>
            <p class="muted">${c.stats.members} members · ${c.stats.projects} projects · ${c.stats.openOpportunities} open roles</p>
            <button class="btn" data-c="${c.id}">Open community</button>
          </div>
        `).filter(Boolean).join('')}
      </div>
      <div class="card">
        <h3>Federation &amp; partnerships</h3>
        ${(parts.federations || []).map((f) => `<p><span class="badge badge-matched">${escapeHtml(f.name)}</span> <span class="muted">${escapeHtml(f.region)}</span></p>`).join('') || '<p class="muted">No federations yet.</p>'}
        ${(parts.partnerships || []).map((p) => `
          <div class="result-row">
            <div class="muted">${p.fromCommunityId.slice(0, 8)}… → ${p.toCommunityId.slice(0, 8)}… <span class="badge">${escapeHtml(p.status)}</span></div>
            ${Store.isLoggedIn() && p.status === 'pending' ? `<button class="btn btn-primary" data-accept-p="${p.id}">Accept</button>` : ''}
          </div>
        `).join('')}
        ${Store.isLoggedIn() ? `
          <hr class="divider" />
          <h3>Propose partnership</h3>
          <div id="part-msg"></div>
          <input class="input" id="from-c" placeholder="Your community ID (you must own it)" />
          <input class="input" id="to-c" placeholder="Partner community ID" />
          <button class="btn btn-primary" id="propose">Propose</button>
        ` : ''}
      </div>
      <div class="card">
        <h3>Open opportunities</h3>
        ${(data.openOpportunities || []).map((o) => `
          <div class="result-row"><div><strong>${escapeHtml(o.title)}</strong> <span class="badge">${escapeHtml(o.type)}</span></div>
          <button class="btn" data-o="${o.id}">View</button></div>
        `).join('') || '<p class="muted">None.</p>'}
      </div>
    `;
    root.querySelectorAll('[data-c]').forEach((b) => {
      b.onclick = () => App.navigate('community', { id: b.getAttribute('data-c') });
    });
    root.querySelectorAll('[data-o]').forEach((b) => {
      b.onclick = () => App.navigate('opportunity', { id: b.getAttribute('data-o') });
    });
    root.querySelectorAll('[data-accept-p]').forEach((b) => {
      b.onclick = async () => { await Api.acceptPartnership(b.getAttribute('data-accept-p')); App.navigate('hub'); };
    });
    if (root.querySelector('#propose')) {
      const { communities } = await Api.listCommunities();
      if (communities[0]) root.querySelector('#from-c').value = communities[0].id;
      if (communities[1]) root.querySelector('#to-c').value = communities[1].id;
      root.querySelector('#propose').onclick = async () => {
        try {
          await Api.proposePartnership({
            fromCommunityId: root.querySelector('#from-c').value.trim(),
            toCommunityId: root.querySelector('#to-c').value.trim(),
            type: 'collaboration',
          });
          App.navigate('hub');
        } catch (e) {
          root.querySelector('#part-msg').innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
        }
      };
    }
  } catch (e) {
    root.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
  }
};

Views.emergency = async function (root) {
  root.innerHTML = `
    <div class="card">
      <h3>Emergency &amp; Civic Response</h3>
      <p class="muted">Rapid expert discovery for urgent community needs. <span class="badge">not a substitute for 112/911</span></p>
    </div>
    ${Store.isLoggedIn() ? `
    <div class="card">
      <h3>Open an incident</h3>
      <div id="msg"></div>
      <input class="input" id="title" placeholder="e.g. Power outage — need electrician" />
      <input class="input" id="cid" placeholder="Community ID" />
      <select class="input" id="sev"><option value="critical">critical</option><option value="high" selected>high</option><option value="medium">medium</option></select>
      <button class="btn btn-primary" id="open">Alert responders</button>
    </div>` : ''}
    <div id="list"><div class="loading-line"><span class="spinner"></span> Loading…</div></div>
    <div id="detail"></div>
  `;
  if (Store.isLoggedIn()) {
    const { communities } = await Api.listCommunities();
    if (communities[0]) root.querySelector('#cid').value = communities[0].id;
    root.querySelector('#open').onclick = async () => {
      try {
        const result = await Api.createEmergency({
          title: root.querySelector('#title').value.trim(),
          communityId: root.querySelector('#cid').value.trim(),
          severity: root.querySelector('#sev').value,
        });
        root.querySelector('#detail').innerHTML = `
          <div class="card">
            <h3>Incident opened · ${result.recommendedResponders.length} responders ranked</h3>
            ${result.recommendedResponders.map((r, i) => `
              <div class="result-row">
                <div class="result-main"><div class="result-rank">${i + 1}</div>
                  <div><strong>${escapeHtml(r.user.name)}</strong>
                    <p class="muted">${escapeHtml(r.matchedSkills.join(', '))} · ETA ~${r.etaMinutes}m · trust ${r.trustScore}</p>
                  </div>
                </div>
                <div class="score-pill">${r.score}</div>
              </div>
            `).join('')}
          </div>`;
        loadList();
      } catch (e) {
        root.querySelector('#msg').innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
      }
    };
  }
  async function loadList() {
    const { emergencies } = await Api.listEmergencies();
    const active = emergencies.filter((e) => e.status === 'active');
    const me = Store.getUser();
    root.querySelector('#list').innerHTML = `
      <div class="card"><h3>Incidents</h3>
        ${emergencies.map((e) => `
          <div class="result-row">
            <div><strong>${escapeHtml(e.title)}</strong> <span class="badge ${e.status === 'active' ? 'badge-urgent' : ''}">${escapeHtml(e.severity)} · ${escapeHtml(e.status)}</span>
              <p class="muted">${(e.skillsNeeded || []).map((s) => escapeHtml(s)).join(', ')}</p></div>
            <div>
              ${Store.isLoggedIn() && e.status === 'active' ? `<button class="btn btn-primary" data-resp="${e.id}">I can help</button>` : ''}
              ${me && e.creatorId === me.id && e.status === 'active' ? `<button class="btn" data-resolve="${e.id}">Resolve</button>` : ''}
            </div>
          </div>
        `).join('') || '<p class="muted">No emergencies.</p>'}
        <p class="muted">${active.length} active</p>
      </div>`;
    root.querySelectorAll('[data-resp]').forEach((btn) => {
      btn.onclick = async () => { await Api.respondEmergency(btn.getAttribute('data-resp'), 15); App.navigate('emergency'); };
    });
    root.querySelectorAll('[data-resolve]').forEach((btn) => {
      btn.onclick = async () => { await Api.resolveEmergency(btn.getAttribute('data-resolve')); App.navigate('emergency'); };
    });
  }
  await loadList();
};

Views.developers = async function (root) {
  if (!Store.isLoggedIn()) {
    root.innerHTML = `<div class="error-box">Log in to manage API keys, webhooks, and integrations.</div>`;
    return;
  }
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading…</div>`;
  try {
    const [integ, plugins, keys] = await Promise.all([
      Api.integrations(),
      Api.listPlugins(),
      Api.listApiKeys(),
    ]);
    root.innerHTML = `
      <div class="card">
        <h3>Open Platform</h3>
        <p class="muted">API keys, webhooks, plugins, and integration stubs. Outbound HTTP is stubbed in this offline build.</p>
        <button class="btn btn-primary" id="key">Generate API key</button>
        <div id="key-out"></div>
        <p class="muted" style="margin-top:10px;">Existing keys:</p>
        ${(keys.apiKeys || []).map((k) => `<code>${escapeHtml(k.key)}</code> <span class="muted">${escapeHtml(k.name)}</span><br/>`).join('') || '<p class="muted">None</p>'}
      </div>
      <div class="card">
        <h3>Webhooks</h3>
        <div id="wh-msg"></div>
        <input class="input" id="wh-url" placeholder="https://example.com/hooks/skillmesh" />
        <button class="btn btn-primary" id="wh-create">Create webhook</button>
        <button class="btn" id="wh-test">Test deliver (stub)</button>
        <div id="wh-out"></div>
      </div>
      <div class="card">
        <h3>Available integrations</h3>
        ${(integ.available || []).map((i) => `
          <div class="result-row">
            <div><strong>${escapeHtml(i.provider)}</strong> <span class="badge">${escapeHtml(i.status)}</span></div>
            <button class="btn" data-p="${i.provider}">Connect stub</button>
          </div>
        `).join('')}
      </div>
      <div class="card">
        <h3>Plugin marketplace</h3>
        ${(plugins.marketplace || []).map((p) => `
          <div class="result-row">
            <div><strong>${escapeHtml(p.name)}</strong> <span class="muted">v${escapeHtml(p.version)}</span>
              <p class="muted">${escapeHtml(p.description)}</p></div>
            <button class="btn" data-install="${p.name}" data-ver="${p.version}">Install</button>
          </div>
        `).join('')}
        <p class="muted">Installed: ${(plugins.installed || []).map((p) => escapeHtml(p.name)).join(', ') || 'none'}</p>
      </div>
    `;
    root.querySelector('#key').onclick = async () => {
      const { apiKey } = await Api.createApiKey({ name: 'ui-generated' });
      root.querySelector('#key-out').innerHTML = `<div class="info-box">Key: <code>${escapeHtml(apiKey.key)}</code> — copy it now.</div>`;
    };
    root.querySelector('#wh-create').onclick = async () => {
      try {
        const { webhook } = await Api.createWebhook({ url: root.querySelector('#wh-url').value.trim() });
        root.querySelector('#wh-msg').innerHTML = `<div class="info-box">Created. Secret: <code>${escapeHtml(webhook.secret)}</code></div>`;
      } catch (e) {
        root.querySelector('#wh-msg').innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
      }
    };
    root.querySelector('#wh-test').onclick = async () => {
      const { deliveries, note } = await Api.testWebhooks();
      root.querySelector('#wh-out').innerHTML = `<div class="info-box">${escapeHtml(note)}<br/>Deliveries recorded: ${deliveries.length}</div>`;
    };
    root.querySelectorAll('[data-p]').forEach((btn) => {
      btn.onclick = async () => {
        await Api.connectIntegration({ provider: btn.getAttribute('data-p') });
        App.navigate('developers');
      };
    });
    root.querySelectorAll('[data-install]').forEach((btn) => {
      btn.onclick = async () => {
        await Api.installPlugin({ name: btn.getAttribute('data-install'), version: btn.getAttribute('data-ver') });
        App.navigate('developers');
      };
    });
  } catch (e) {
    root.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
  }
};

Views.intelligence = async function (root) {
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading global network…</div>`;
  try {
    const [network, impact, research] = await Promise.all([
      Api.globalNetwork(),
      Api.impact(),
      Api.research(),
    ]);
    root.innerHTML = `
      <div class="card">
        <h3>Global Knowledge Network</h3>
        <p class="muted">${network.graphStats.nodes} nodes · ${network.graphStats.edges} edges · ${network.federations.length} federations · <span class="badge">demo heuristics</span></p>
        <div class="grid">
          ${(network.communities || []).map((c) => c && `
            <div class="card" style="margin:0;">
              <h3>${escapeHtml(c.name)}</h3>
              <p class="muted">Health ${escapeHtml(c.health)} · ${c.stats.members} members</p>
            </div>
          `).filter(Boolean).join('')}
        </div>
      </div>
      <div class="card">
        <h3>AI Reasoning Engine</h3>
        <textarea class="input" id="q" rows="2" placeholder="Describe a goal for explainable multi-agent reasoning…"></textarea>
        <button class="btn btn-primary" id="reason">Reason</button>
        <div id="reason-out"></div>
      </div>
      <div class="card">
        <h3>Impact &amp; SDG Module</h3>
        <p class="muted">Resilience score <strong id="resilience-score">${impact.communityResilienceScore}</strong>/100 · <span id="total-impact-records">${impact.totalRecords}</span> records logged</p>
        <div id="sdg-badges-container">${(impact.bySdg || []).map((s) => `<span class="badge badge-matched">SDG ${escapeHtml(s.sdg)}: ${escapeHtml(s.value)}</span>`).join(' ')}</div>
        ${Store.isLoggedIn() ? `
          <hr class="divider" />
          <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
            <input class="input" id="metric" placeholder="Metric e.g. people_helped" style="flex:1; min-width:180px; margin-bottom:0;" />
            <input class="input" id="value" type="number" placeholder="Value" style="width:100px; margin-bottom:0;" value="1" min="1" />
            <button class="btn btn-primary" id="log-impact"><i data-lucide="sprout" style="width: 14px; height: 14px; vertical-align: middle;"></i> Log Impact</button>
            <button class="btn" id="open-impact-modal"><i data-lucide="clipboard" style="width: 14px; height: 14px; margin-right: 4px;"></i> Full Impact Logger</button>
          </div>
        ` : '<p class="muted" style="margin-top:10px;">Log in to contribute impact records.</p>'}
      </div>
      <div class="card">
        <h3>Research hub</h3>
        ${(research.datasets || []).map((d) => `
          <div class="result-row"><div><strong>${escapeHtml(d.title)}</strong>
            <p class="muted">${escapeHtml(d.description || '')} · ${d.records ? d.records.length : 0} records ${d.open ? '· open' : ''}</p></div></div>
        `).join('') || '<p class="muted">No datasets yet.</p>'}
        ${Store.isLoggedIn() ? `<button class="btn" id="pub-ds">Publish skill snapshot</button>` : ''}
      </div>
      <div class="card">
        <h3>Skill Passport</h3>
        ${Store.isLoggedIn()
          ? `<button class="btn btn-primary" id="passport">Sync my portable passport</button><div id="pass-out"></div>`
          : `<p class="muted">Log in to sync your skill passport.</p>`}
      </div>
      <div class="card">
        <h3>Scenario simulation</h3>
        ${Store.isLoggedIn() ? `
          <input class="input" id="scen-cid" placeholder="Community ID" />
          <input class="input" id="scen-members" type="number" placeholder="New members to simulate" value="5" />
          <input class="input" id="scen-skill" placeholder="Emergency skill e.g. first aid" />
          <button class="btn btn-primary" id="scen">Run scenario</button>
          <div id="scen-out"></div>
        ` : '<p class="muted">Log in to run scenarios.</p>'}
      </div>
    `;
    if (Store.isLoggedIn()) {
      const { communities } = await Api.listCommunities();
      if (communities[0] && root.querySelector('#scen-cid')) {
        root.querySelector('#scen-cid').value = communities[0].id;
      }
    }
    root.querySelector('#reason').onclick = async () => {
      const query = root.querySelector('#q').value.trim();
      if (!query) return;
      const out = root.querySelector('#reason-out');
      out.innerHTML = `<div class="loading-line"><span class="spinner"></span> Reasoning…</div>`;
      const data = await Api.reason({ query });
      out.innerHTML = `
        <p class="muted">Agents: ${(data.agents || []).map((a) => escapeHtml(a)).join(', ')}</p>
        <p><strong>${escapeHtml(data.recommendation.primaryAction)}</strong></p>
        <ol>${data.steps.map((s) => `<li><code>${escapeHtml(s.name)}</code></li>`).join('')}</ol>
      `;
    };
    if (root.querySelector('#passport')) {
      root.querySelector('#passport').onclick = async () => {
        const p = await Api.syncPassport();
        root.querySelector('#pass-out').innerHTML = `
          <div class="info-box">Verified ${p.summary.verified}/${p.summary.skills} credentials · trust ${p.summary.trustScore}
            <div>${p.credentials.map((c) => `<span class="badge ${c.verified ? 'badge-matched' : 'badge-skill'}">${escapeHtml(c.skill)}</span>`).join(' ')}</div>
          </div>`;
      };
    }
    
    // Task 3: Log Impact Button Bug Fix & Interactivity
    if (root.querySelector('#log-impact')) {
      const logBtn = root.querySelector('#log-impact');
      logBtn.onclick = async (e) => {
        e.preventDefault();
        const metric = root.querySelector('#metric').value.trim() || 'people_helped';
        const val = Number(root.querySelector('#value').value) || 1;

        // 1. Show loading spinner on button to stop double taps & disable
        logBtn.disabled = true;
        logBtn.innerHTML = `<span class="spinner"></span> Logging...`;

        try {
          await Api.recordImpact({
            metric,
            value: val,
            tags: ['community', 'SDG_13'],
          });

          // 2. Real-time SDG metric update
          const updatedImpact = await Api.impact();
          const recEl = root.querySelector('#total-impact-records');
          if (recEl) recEl.textContent = updatedImpact.totalRecords;
          const badgesEl = root.querySelector('#sdg-badges-container');
          if (badgesEl && updatedImpact.bySdg) {
            badgesEl.innerHTML = updatedImpact.bySdg.map((s) => `<span class="badge badge-matched">SDG ${escapeHtml(s.sdg)}: ${escapeHtml(s.value)}</span>`).join(' ');
          }

          // 3. Success Toast
          App.showToast('Impact logged successfully!');
        } catch (err) {
          App.showToast(`Failed to log impact: ${err.message || 'Error'}`);
        } finally {
          logBtn.disabled = false;
          logBtn.innerHTML = `<i data-lucide="sprout" style="width: 14px; height: 14px; vertical-align: middle;"></i> Log Impact`;
        }
      };
    }

    if (root.querySelector('#open-impact-modal')) {
      root.querySelector('#open-impact-modal').onclick = () => {
        App.openImpactModal();
      };
    }
    if (root.querySelector('#pub-ds')) {
      root.querySelector('#pub-ds').onclick = async () => {
        await Api.createResearch({ title: `Skill snapshot ${new Date().toISOString().slice(0, 10)}`, open: true });
        App.navigate('intelligence');
      };
    }
    if (root.querySelector('#scen')) {
      root.querySelector('#scen').onclick = async () => {
        const { scenario } = await Api.runScenario({
          communityId: root.querySelector('#scen-cid').value.trim(),
          name: 'What-if growth',
          assumptions: {
            newMembers: Number(root.querySelector('#scen-members').value) || 0,
            skillTraining: ['first aid', 'leadership'],
            emergencySkill: root.querySelector('#scen-skill').value.trim() || 'first aid',
            projectCount: 1,
          },
        });
        root.querySelector('#scen-out').innerHTML = `<div class="info-box">${escapeHtml(scenario.results.narrative)}</div>`;
      };
    }
  } catch (e) {
    root.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
  }
};

Views.autonomy = async function (root) {
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading…</div>`;
  try {
    const { communities } = await Api.listCommunities();
    if (!communities.length) {
      root.innerHTML = `<div class="info-box">Need a community first.</div>`;
      return;
    }
    const cid = communities[0].id;
    const [agents, twin, memory] = await Promise.all([
      Api.listAgents(cid),
      Api.digitalTwin(cid),
      Api.communityMemory(cid),
    ]);
    root.innerHTML = `
      <div class="card">
        <h3>Autonomous Community Intelligence</h3>
        <p class="muted">Working on <strong>${escapeHtml(communities[0].name)}</strong> · <span class="badge">rule-based agents (demo)</span></p>
        ${Store.isLoggedIn() ? `
          <button class="btn btn-primary" id="pulse">Run OS pulse (all agents)</button>
          <button class="btn" id="auto-teams">Auto-form teams</button>
          <button class="btn" id="refresh-twin">Refresh digital twin</button>
        ` : '<div class="error-box">Log in to run agents.</div>'}
        <div id="out"></div>
      </div>
      <div class="card">
        <h3>Digital Twin · health ${twin.twin.snapshot.health.healthIndex}</h3>
        <p class="muted">Updated ${new Date(twin.twin.updatedAt).toLocaleString()}</p>
        <p class="muted">${twin.twin.snapshot.people.length} people · ${twin.twin.snapshot.infrastructure.projects.length} projects · ${twin.twin.snapshot.resources.openOpportunities} open roles</p>
        <div class="trust-track"><div class="trust-fill" style="width:${twin.twin.snapshot.health.healthIndex}%"></div></div>
      </div>
      <div class="card">
        <h3>Agents</h3>
        ${agents.agents.map((a) => `
          <div class="result-row">
            <div><strong>${escapeHtml(a.type)}</strong> <span class="badge">${escapeHtml(a.status)}</span>
              <p class="muted">Last run: ${a.lastRunAt ? new Date(a.lastRunAt).toLocaleString() : 'never'}</p>
            </div>
            ${Store.isLoggedIn() ? `<button class="btn" data-agent="${a.type}">Run</button>` : ''}
          </div>
        `).join('')}
      </div>
      <div class="card">
        <h3>Collective memory</h3>
        ${(memory.memory || []).map((m) => `
          <div class="msg-row"><span class="badge">${escapeHtml(m.kind)}</span><p>${escapeHtml(m.content)}</p>
            <p class="muted" style="font-size:12px;">${new Date(m.createdAt).toLocaleString()}</p></div>
        `).join('') || '<p class="muted">No memory yet.</p>'}
        ${Store.isLoggedIn() ? `
          <hr class="divider" />
          <h3>AI brainstorm</h3>
          <textarea class="input" id="prompt" rows="2" placeholder="How might we improve emergency readiness?"></textarea>
          <button class="btn btn-primary" id="brain">Brainstorm</button>
          <div id="brain-out"></div>
        ` : ''}
      </div>
    `;
    if (Store.isLoggedIn()) {
      root.querySelector('#pulse').onclick = async () => {
        const out = root.querySelector('#out');
        out.innerHTML = `<div class="loading-line"><span class="spinner"></span> Running Community OS pulse…</div>`;
        const r = await Api.osPulse(cid, 'Strengthen community this week');
        out.innerHTML = `<div class="info-box">${escapeHtml(r.message)}<ul>${r.agents.map((a) => `<li><strong>${escapeHtml(a.type)}</strong>: ${escapeHtml(a.summary)}</li>`).join('')}</ul>
          Auto-teams formed: ${r.autoTeams.count}</div>`;
      };
      root.querySelector('#auto-teams').onclick = async () => {
        const r = await Api.autoTeams(cid);
        root.querySelector('#out').innerHTML = `<div class="info-box">Formed ${r.count} autonomous teams.</div>`;
      };
      root.querySelector('#refresh-twin').onclick = () => App.navigate('autonomy');
      root.querySelectorAll('[data-agent]').forEach((btn) => {
        btn.onclick = async () => {
          const r = await Api.runAgents(cid, { type: btn.getAttribute('data-agent') });
          root.querySelector('#out').innerHTML = `<div class="info-box">${escapeHtml(r.output.summary)}</div>`;
        };
      });
      root.querySelector('#brain').onclick = async () => {
        const prompt = root.querySelector('#prompt').value.trim();
        if (!prompt) return;
        const r = await Api.brainstorm(cid, prompt);
        root.querySelector('#brain-out').innerHTML = r.ideas.map((i) => `
          <div class="msg-row"><span class="badge">${escapeHtml(i.source)}</span><p>${escapeHtml(i.text)}</p></div>
        `).join('');
      };
    }
  } catch (e) {
    root.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
  }
};

const _origHome = Views.home;
Views.home = function (root) {
  _origHome(root);
  const extra = document.createElement('div');
  extra.innerHTML = `
    <div class="section-title">Phases 3–6 · demo intelligence</div>
    <div class="grid">
      <div class="card"><div class="card-icon"><i data-lucide="bar-chart-3"></i></div><h3>Community Intelligence</h3>
        <p class="muted">Health scores, skill gaps, predictions, events, and gamification.</p>
        <button class="btn" data-go="analytics">Open analytics</button></div>
      <div class="card"><div class="card-icon"><i data-lucide="globe"></i></div><h3>Ecosystem</h3>
        <p class="muted">Public hub, federation, emergency response, and developer APIs.</p>
        <button class="btn" data-go="hub">Public hub</button></div>
      <div class="card"><div class="card-icon"><i data-lucide="shield-check"></i></div><h3>Global Intelligence</h3>
        <p class="muted">Reasoning engine, skill passports, SDG impact, scenario sims.</p>
        <button class="btn" data-go="intelligence">Explore</button></div>
      <div class="card"><div class="card-icon"><i data-lucide="bot"></i></div><h3>Autonomy</h3>
        <p class="muted">AI agents, digital twin, collective memory, auto-forming teams.</p>
        <button class="btn" data-go="autonomy">Launch agents</button></div>
    </div>`;
  root.appendChild(extra);
  extra.querySelectorAll('[data-go]').forEach((btn) => {
    btn.onclick = () => App.navigate(btn.getAttribute('data-go'));
  });
};
