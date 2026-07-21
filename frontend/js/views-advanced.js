// Phase 3–6 views (extends Views from views.js)

Views.analytics = async function (root) {
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading communities…</div>`;
  try {
    const { communities } = await Api.listCommunities();
    if (!communities.length) {
      root.innerHTML = `<div class="info-box">Create a community first.</div>`;
      return;
    }
    root.innerHTML = `
      <div class="card">
        <h3>Community Intelligence</h3>
        <p class="muted">Skill gaps, health scores, predictions, and member insights.</p>
        <select class="input" id="cid">${communities.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}</select>
        <button class="btn btn-primary" id="load">Load dashboard</button>
      </div>
      <div id="dash"></div>
    `;
    const load = async () => {
      const id = root.querySelector('#cid').value;
      const dashEl = root.querySelector('#dash');
      dashEl.innerHTML = `<div class="loading-line"><span class="spinner"></span> Analyzing…</div>`;
      const d = await Api.communityAnalytics(id);
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
          <div class="card"><h3>Activity heatmap</h3>
            <p>${h.heatmap.labels.map((l, i) => `<span class="badge">${l}: ${h.heatmap.values[i]}</span>`).join(' ')}</p>
          </div>
        </div>
        <div class="card">
          <h3>Skill gaps</h3>
          ${(d.skills.gaps || []).map((g) => `
            <div class="result-row"><div><strong>${g.skill}</strong> <span class="badge badge-urgent">${g.severity}</span>
              <p class="muted">${g.recommendation} (supply ${g.supply} / demand ${g.demand})</p></div></div>
          `).join('') || '<p class="muted">No gaps detected.</p>'}
        </div>
        <div class="card">
          <h3>Emerging leaders</h3>
          ${(d.predictions.emergingLeaders || []).map((l) => `
            <span class="badge badge-matched">${l.user.name} (${l.leadershipScore})</span>
          `).join(' ') || '<p class="muted">None yet.</p>'}
        </div>
        <div class="card">
          <h3>Risks &amp; resource plan</h3>
          ${(d.predictions.risks || []).map((r) => `<p class="muted">⚠ ${r.detail} <span class="badge">${r.severity}</span></p>`).join('') || '<p class="muted">No risks flagged.</p>'}
          <ul>${(d.predictions.resourcePlan || []).map((p) => `<li>${p.action}</li>`).join('')}</ul>
        </div>
      `;
    };
    root.querySelector('#load').onclick = load;
    load();
  } catch (e) {
    root.innerHTML = `<div class="error-box">${e.message}</div>`;
  }
};

Views.events = async function (root) {
  root.innerHTML = `
    <div class="card">
      <h3>Events &amp; Initiatives</h3>
      <p class="muted">Workshops, camps, and community campaigns with attendance tracking.</p>
    </div>
    ${Store.isLoggedIn() ? `
    <div class="card">
      <h3>Create event</h3>
      <div id="msg"></div>
      <input class="input" id="title" placeholder="Title" />
      <textarea class="input" id="desc" rows="2" placeholder="Description"></textarea>
      <input class="input" id="cid" placeholder="Community ID" />
      <button class="btn btn-primary" id="create">Create</button>
    </div>` : ''}
    <div id="list" class="grid"><div class="loading-line"><span class="spinner"></span> Loading…</div></div>
  `;
  if (Store.isLoggedIn()) {
    const { communities } = await Api.listCommunities();
    if (communities[0]) root.querySelector('#cid').value = communities[0].id;
    root.querySelector('#create').onclick = async () => {
      try {
        await Api.createEvent({
          title: root.querySelector('#title').value.trim(),
          description: root.querySelector('#desc').value.trim(),
          communityId: root.querySelector('#cid').value.trim(),
        });
        App.navigate('events');
      } catch (e) {
        root.querySelector('#msg').innerHTML = `<div class="error-box">${e.message}</div>`;
      }
    };
  }
  const { events } = await Api.listEvents();
  root.querySelector('#list').innerHTML = events.length ? events.map((e) => `
    <div class="card">
      <span class="badge">${e.type || 'event'}</span>
      <h3>${e.title}</h3>
      <p class="muted">${e.description || ''}</p>
      <p class="muted">${e.startAt ? new Date(e.startAt).toLocaleString() : 'TBD'} · ${e.registered || 0} registered · ${e.status}</p>
      ${Store.isLoggedIn() ? `<button class="btn btn-primary" data-reg="${e.id}">Register</button>` : ''}
    </div>
  `).join('') : '<p class="muted">No events yet.</p>';
  root.querySelectorAll('[data-reg]').forEach((btn) => {
    btn.onclick = async () => { await Api.registerEvent(btn.getAttribute('data-reg')); App.navigate('events'); };
  });
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
        <p>${(mine.achievements || []).map((a) => `<span class="badge badge-matched">${a.label || a.achievement}</span>`).join(' ') || '<span class="muted">No achievements yet</span>'}</p>
      </div>` : ''}
      <div class="card">
        <h3>Leaderboard</h3>
        ${leaderboard.map((r) => `
          <div class="result-row">
            <div class="result-main">
              <div class="result-rank">${r.rank}</div>
              <div><strong>${r.user.name}</strong>
                <p class="muted">${r.achievementCount} achievements · ${r.contributionPoints} contrib pts</p>
              </div>
            </div>
            <div class="score-pill">${r.score}</div>
          </div>
        `).join('') || '<p class="muted">Empty.</p>'}
      </div>
    `;
  } catch (e) {
    root.innerHTML = `<div class="error-box">${e.message}</div>`;
  }
};

Views.hub = async function (root) {
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading public hub…</div>`;
  try {
    const data = await Api.publicHub();
    root.innerHTML = `
      <div class="card">
        <h3>Public Community Hub</h3>
        <p class="muted">Open directory of communities, showcases, and opportunities.</p>
      </div>
      <div class="grid">
        ${(data.directory || []).map((c) => c && `
          <div class="card">
            <h3>${c.name}</h3>
            <p class="muted">${c.description || ''}</p>
            <p class="muted">${c.stats.members} members · ${c.stats.projects} projects · ${c.stats.openOpportunities} open roles</p>
            <button class="btn" data-c="${c.id}">Open community</button>
          </div>
        `).filter(Boolean).join('')}
      </div>
      <div class="card">
        <h3>Open opportunities</h3>
        ${(data.openOpportunities || []).map((o) => `
          <div class="result-row"><div><strong>${o.title}</strong> <span class="badge">${o.type}</span></div>
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
  } catch (e) {
    root.innerHTML = `<div class="error-box">${e.message}</div>`;
  }
};

Views.emergency = async function (root, params) {
  root.innerHTML = `
    <div class="card">
      <h3>Emergency &amp; Civic Response</h3>
      <p class="muted">Rapid expert discovery for urgent community needs.</p>
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
                  <div><strong>${r.user.name}</strong>
                    <p class="muted">${r.matchedSkills.join(', ')} · ETA ~${r.etaMinutes}m · trust ${r.trustScore}</p>
                  </div>
                </div>
                <div class="score-pill">${r.score}</div>
              </div>
            `).join('')}
          </div>`;
        loadList();
      } catch (e) {
        root.querySelector('#msg').innerHTML = `<div class="error-box">${e.message}</div>`;
      }
    };
  }
  async function loadList() {
    const { emergencies } = await Api.listEmergencies({ status: 'active' });
    root.querySelector('#list').innerHTML = `
      <div class="card"><h3>Active incidents</h3>
        ${emergencies.map((e) => `
          <div class="result-row">
            <div><strong>${e.title}</strong> <span class="badge badge-urgent">${e.severity}</span>
              <p class="muted">${(e.skillsNeeded || []).join(', ')}</p></div>
            ${Store.isLoggedIn() ? `<button class="btn btn-primary" data-resp="${e.id}">I can help</button>` : ''}
          </div>
        `).join('') || '<p class="muted">No active emergencies.</p>'}
      </div>`;
    root.querySelectorAll('[data-resp]').forEach((btn) => {
      btn.onclick = async () => { await Api.respondEmergency(btn.getAttribute('data-resp'), 15); App.navigate('emergency'); };
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
    const [integ, plugins] = await Promise.all([Api.integrations(), Api.listPlugins()]);
    root.innerHTML = `
      <div class="card">
        <h3>Open Platform</h3>
        <p class="muted">API keys, webhooks, plugins, and integration stubs (no outbound calls in this build).</p>
        <button class="btn btn-primary" id="key">Generate API key</button>
        <div id="key-out"></div>
      </div>
      <div class="card">
        <h3>Available integrations</h3>
        ${(integ.available || []).map((i) => `
          <div class="result-row">
            <div><strong>${i.provider}</strong> <span class="badge">${i.status}</span></div>
            <button class="btn" data-p="${i.provider}">Connect stub</button>
          </div>
        `).join('')}
      </div>
      <div class="card">
        <h3>Plugin marketplace</h3>
        ${(plugins.marketplace || []).map((p) => `
          <div class="result-row"><div><strong>${p.name}</strong> <span class="muted">v${p.version}</span>
            <p class="muted">${p.description}</p></div></div>
        `).join('')}
        <p class="muted">Installed: ${(plugins.installed || []).map((p) => p.name).join(', ') || 'none'}</p>
      </div>
    `;
    root.querySelector('#key').onclick = async () => {
      const { apiKey } = await Api.createApiKey({ name: 'ui-generated' });
      root.querySelector('#key-out').innerHTML = `<div class="info-box">Key: <code>${apiKey.key}</code> — copy it now.</div>`;
    };
    root.querySelectorAll('[data-p]').forEach((btn) => {
      btn.onclick = async () => {
        await Api.connectIntegration({ provider: btn.getAttribute('data-p') });
        App.navigate('developers');
      };
    });
  } catch (e) {
    root.innerHTML = `<div class="error-box">${e.message}</div>`;
  }
};

Views.intelligence = async function (root) {
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading global network…</div>`;
  try {
    const [network, impact] = await Promise.all([Api.globalNetwork(), Api.impact()]);
    root.innerHTML = `
      <div class="card">
        <h3>Global Knowledge Network</h3>
        <p class="muted">${network.graphStats.nodes} nodes · ${network.graphStats.edges} edges · ${network.federations.length} federations</p>
        <div class="grid">
          ${(network.communities || []).map((c) => c && `
            <div class="card" style="margin:0;">
              <h3>${c.name}</h3>
              <p class="muted">Health ${c.health} · ${c.stats.members} members</p>
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
        <h3>Impact &amp; SDG</h3>
        <p class="muted">Resilience score ${impact.communityResilienceScore}/100 · ${impact.totalRecords} records</p>
        <div>${(impact.bySdg || []).map((s) => `<span class="badge">SDG ${s.sdg}: ${s.value}</span>`).join(' ')}</div>
        ${Store.isLoggedIn() ? `
          <hr class="divider" />
          <input class="input" id="metric" placeholder="Metric e.g. people_helped" />
          <input class="input" id="value" type="number" placeholder="Value" />
          <button class="btn" id="log-impact">Log impact</button>
        ` : ''}
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
        <p class="muted">Agents: ${(data.agents || []).join(', ')}</p>
        <p><strong>${data.recommendation.primaryAction}</strong></p>
        <ol>${data.steps.map((s) => `<li><code>${s.name}</code></li>`).join('')}</ol>
      `;
    };
    if (root.querySelector('#passport')) {
      root.querySelector('#passport').onclick = async () => {
        const p = await Api.syncPassport();
        root.querySelector('#pass-out').innerHTML = `
          <div class="info-box">Verified ${p.summary.verified}/${p.summary.skills} credentials · trust ${p.summary.trustScore}
            <div>${p.credentials.map((c) => `<span class="badge ${c.verified ? 'badge-matched' : 'badge-skill'}">${c.skill}</span>`).join(' ')}</div>
          </div>`;
      };
    }
    if (root.querySelector('#log-impact')) {
      root.querySelector('#log-impact').onclick = async () => {
        await Api.recordImpact({
          metric: root.querySelector('#metric').value.trim() || 'people_helped',
          value: Number(root.querySelector('#value').value) || 1,
          tags: ['community'],
        });
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
        root.querySelector('#scen-out').innerHTML = `<div class="info-box">${scenario.results.narrative}</div>`;
      };
    }
  } catch (e) {
    root.innerHTML = `<div class="error-box">${e.message}</div>`;
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
        <p class="muted">Working on <strong>${communities[0].name}</strong></p>
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
            <div><strong>${a.type}</strong> <span class="badge">${a.status}</span>
              <p class="muted">Last run: ${a.lastRunAt ? new Date(a.lastRunAt).toLocaleString() : 'never'}</p>
            </div>
            ${Store.isLoggedIn() ? `<button class="btn" data-agent="${a.type}">Run</button>` : ''}
          </div>
        `).join('')}
      </div>
      <div class="card">
        <h3>Collective memory</h3>
        ${(memory.memory || []).map((m) => `
          <div class="msg-row"><span class="badge">${m.kind}</span><p>${m.content}</p>
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
        out.innerHTML = `<div class="info-box">${r.message}<ul>${r.agents.map((a) => `<li><strong>${a.type}</strong>: ${a.summary}</li>`).join('')}</ul>
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
          root.querySelector('#out').innerHTML = `<div class="info-box">${r.output.summary}</div>`;
        };
      });
      root.querySelector('#brain').onclick = async () => {
        const prompt = root.querySelector('#prompt').value.trim();
        if (!prompt) return;
        const r = await Api.brainstorm(cid, prompt);
        root.querySelector('#brain-out').innerHTML = r.ideas.map((i) => `
          <div class="msg-row"><span class="badge">${i.source}</span><p>${i.text}</p></div>
        `).join('');
      };
    }
  } catch (e) {
    root.innerHTML = `<div class="error-box">${e.message}</div>`;
  }
};

// Slight home page enrichment if present
const _origHome = Views.home;
Views.home = function (root) {
  _origHome(root);
  const extra = document.createElement('div');
  extra.innerHTML = `
    <div class="section-title">Phases 3–6</div>
    <div class="grid">
      <div class="card"><div class="card-icon">📊</div><h3>Community Intelligence</h3>
        <p class="muted">Health scores, skill gaps, predictions, events, and gamification.</p>
        <button class="btn" data-go="analytics">Open analytics</button></div>
      <div class="card"><div class="card-icon">🌐</div><h3>Ecosystem</h3>
        <p class="muted">Public hub, federation, emergency response, and developer APIs.</p>
        <button class="btn" data-go="hub">Public hub</button></div>
      <div class="card"><div class="card-icon">🛂</div><h3>Global Intelligence</h3>
        <p class="muted">Reasoning engine, skill passports, SDG impact, scenario sims.</p>
        <button class="btn" data-go="intelligence">Explore</button></div>
      <div class="card"><div class="card-icon">🤖</div><h3>Autonomy</h3>
        <p class="muted">AI agents, digital twin, collective memory, auto-forming teams.</p>
        <button class="btn" data-go="autonomy">Launch agents</button></div>
    </div>`;
  root.appendChild(extra);
  extra.querySelectorAll('[data-go]').forEach((btn) => {
    btn.onclick = () => App.navigate(btn.getAttribute('data-go'));
  });
};
