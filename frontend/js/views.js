const Views = {};

// ---------- Home ----------
Views.home = function (root) {
  root.innerHTML = `
    <div class="hero">
      <span class="eyebrow">AI-Powered Community Intelligence · Phase 2</span>
      <h1>Every Community Already Has<br/>the People It Needs</h1>
      <p>Describe your problem in plain language. SkillMesh discovers the right people,
      builds balanced teams, and surfaces opportunities across your community.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" id="cta-search">✦ Try AI Search</button>
        <button class="btn" id="cta-teams">Build a Team</button>
        <button class="btn" id="cta-communities">Browse Communities</button>
      </div>
    </div>
    <div class="section-title">What makes SkillMesh different</div>
    <div class="grid">
      <div class="card">
        <div class="card-icon">🗣️</div>
        <h3>AI Community Search</h3>
        <p class="muted">Search using natural language instead of filters — describe the problem, not the profile.</p>
      </div>
      <div class="card">
        <div class="card-icon">👥</div>
        <h3>AI Team Builder</h3>
        <p class="muted">Describe a project goal. SkillMesh balances skills, availability, and prior collaborations.</p>
      </div>
      <div class="card">
        <div class="card-icon">⭐</div>
        <h3>Trust &amp; Reputation</h3>
        <p class="muted">Endorsements, badges, and contribution history influence every recommendation.</p>
      </div>
      <div class="card">
        <div class="card-icon">🎯</div>
        <h3>Opportunity Matching</h3>
        <p class="muted">Volunteer, mentorship, and event openings ranked by your skills and location.</p>
      </div>
    </div>
  `;
  root.querySelector('#cta-search').onclick = () => App.navigate('search');
  root.querySelector('#cta-teams').onclick = () => App.navigate('teams');
  root.querySelector('#cta-communities').onclick = () => App.navigate('communities');
};

// ---------- Auth ----------
Views.login = function (root) {
  root.innerHTML = `
    <div class="card" style="max-width:420px;margin:40px auto;">
      <h3>Log in</h3>
      <div id="msg"></div>
      <label>Email</label>
      <input class="input" id="email" type="email" placeholder="raj@example.com" />
      <label>Password</label>
      <input class="input" id="password" type="password" placeholder="password123" />
      <button class="btn btn-primary" id="submit" style="width:100%;">Log in</button>
      <p class="muted" style="margin-top:14px;">No account? <a href="#" id="go-register" style="color:var(--cyan);">Register</a></p>
      <p class="muted">Demo: raj@example.com / password123 (also sneha, arjun, priya, kabir @example.com)</p>
    </div>
  `;
  root.querySelector('#go-register').onclick = (e) => { e.preventDefault(); App.navigate('register'); };
  root.querySelector('#submit').onclick = async () => {
    const email = root.querySelector('#email').value.trim();
    const password = root.querySelector('#password').value;
    const msg = root.querySelector('#msg');
    try {
      const { token, user } = await Api.login({ email, password });
      Store.setToken(token);
      Store.setUser(user);
      App.refreshNav();
      App.navigate('dashboard');
    } catch (e) {
      msg.innerHTML = `<div class="error-box">${e.message}</div>`;
    }
  };
};

Views.register = function (root) {
  root.innerHTML = `
    <div class="card" style="max-width:420px;margin:40px auto;">
      <h3>Create your profile</h3>
      <div id="msg"></div>
      <label>Name</label>
      <input class="input" id="name" placeholder="Your name" />
      <label>Email</label>
      <input class="input" id="email" type="email" placeholder="you@example.com" />
      <label>Password</label>
      <input class="input" id="password" type="password" placeholder="At least 6 characters" />
      <label>Location (optional)</label>
      <input class="input" id="location" placeholder="e.g. Greenwood Sector 4" />
      <button class="btn btn-primary" id="submit" style="width:100%;">Register</button>
      <p class="muted" style="margin-top:14px;">Already have an account? <a href="#" id="go-login" style="color:var(--cyan);">Log in</a></p>
    </div>
  `;
  root.querySelector('#go-login').onclick = (e) => { e.preventDefault(); App.navigate('login'); };
  root.querySelector('#submit').onclick = async () => {
    const name = root.querySelector('#name').value.trim();
    const email = root.querySelector('#email').value.trim();
    const password = root.querySelector('#password').value;
    const location = root.querySelector('#location').value.trim();
    const msg = root.querySelector('#msg');
    try {
      const { token, user } = await Api.register({ name, email, password, location: location || undefined });
      Store.setToken(token);
      Store.setUser(user);
      App.refreshNav();
      App.navigate('dashboard');
    } catch (e) {
      msg.innerHTML = `<div class="error-box">${e.message}</div>`;
    }
  };
};

// ---------- Dashboard / Profile ----------
Views.dashboard = async function (root) {
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading your profile…</div>`;
  try {
    const { user } = await Api.me();
    Store.setUser(user);
    const { profile } = await Api.getProfile(user.id);
    renderProfile(root, profile, true);
  } catch (e) {
    root.innerHTML = `<div class="error-box">${e.message}</div>`;
  }
};

function renderProfile(root, profile, editable) {
  const skillBadges = profile.skills.length
    ? profile.skills.map((s) => `<span class="badge badge-skill">${s.skill} <span class="muted">(${s.level})</span>${editable ? ` <a href="#" data-remove="${s.id}" style="color:#ff8a8a;">✕</a>` : ''}</span>`).join(' ')
    : `<span class="muted">No skills listed yet.</span>`;
  const communityBadges = profile.communities.length
    ? profile.communities.map((c) => `<span class="badge">${c.name} <span class="muted">(${c.role})</span></span>`).join(' ')
    : `<span class="muted">Not a member of any community yet.</span>`;
  const trustScore = profile.trust ? profile.trust.score : 0;
  const badges = (profile.badges || []).map((b) => `<span class="badge badge-matched">${b.badge}</span>`).join(' ') || '<span class="muted">No badges yet</span>';
  const endorsements = (profile.endorsements || []).length
    ? profile.endorsements.map((e) => `<li><strong>${e.skill}</strong> — ${e.from ? e.from.name : 'someone'}${e.note ? `: "${e.note}"` : ''}</li>`).join('')
    : '<li class="muted">No endorsements yet</li>';

  root.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
        <div>
          <h3 style="margin-bottom:4px;"><span class="avatar-chip">${(profile.name || '?').charAt(0).toUpperCase()}</span>${profile.name}</h3>
          <p class="muted" style="margin:0;">📍 ${profile.location || 'No location set'} · ${profile.availability === 'available' ? '🟢' : '🟠'} ${profile.availability || 'unknown'}</p>
        </div>
        ${editable ? `
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="btn" id="profile-inbox-btn">📥 Inbox & Alerts</button>
          <button class="btn btn-danger" id="profile-logout-btn">🚪 Log out</button>
        </div>` : ''}
      </div>
      <div class="trust-bar" style="margin-top:16px;">
        <div class="trust-label">Trust score <strong>${trustScore}</strong>/100</div>
        <div class="trust-track"><div class="trust-fill" style="width:${trustScore}%"></div></div>
      </div>
      <hr class="divider" />
      <p><strong>Skills</strong></p>
      <p>${skillBadges}</p>
      <p><strong>Communities</strong></p>
      <p>${communityBadges}</p>
      <p><strong>Badges</strong></p>
      <p>${badges}</p>
      <p><strong>Endorsements</strong></p>
      <ul class="endorse-list">${endorsements}</ul>
    </div>
    ${editable ? `
    <div class="card">
      <h3>Edit profile</h3>
      <div id="profile-msg"></div>
      <label class="muted">Name</label>
      <input class="input" id="edit-name" value="${(profile.name || '').replace(/"/g, '&quot;')}" />
      <label class="muted">Location</label>
      <input class="input" id="edit-location" value="${(profile.location || '').replace(/"/g, '&quot;')}" placeholder="e.g. Greenwood Sector 4" />
      <label class="muted">Availability</label>
      <select class="input" id="edit-availability">
        <option value="available" ${profile.availability === 'available' ? 'selected' : ''}>available</option>
        <option value="busy" ${profile.availability === 'busy' ? 'selected' : ''}>busy</option>
      </select>
      <label class="muted">Bio</label>
      <textarea class="input" id="edit-bio" rows="2" placeholder="Short bio">${profile.bio || ''}</textarea>
      <label class="muted">Interests (comma-separated)</label>
      <input class="input" id="edit-interests" value="${Array.isArray(profile.interests) ? profile.interests.join(', ') : (profile.interests || '')}" />
      <button class="btn btn-primary" id="save-profile">Save profile</button>
    </div>
    <div class="card">
      <h3>Add a skill</h3>
      <div id="msg"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <input class="input" id="skill-name" placeholder="e.g. robotics, first aid, design" style="flex:2;min-width:160px;" />
        <select class="input" id="skill-level" style="flex:1;min-width:120px;">
          <option value="beginner">beginner</option>
          <option value="intermediate" selected>intermediate</option>
          <option value="expert">expert</option>
        </select>
        <button class="btn btn-primary" id="add-skill">Add</button>
      </div>
    </div>
    <div class="card">
      <h3>Endorse someone</h3>
      <div id="endorse-msg"></div>
      <input class="input" id="endorse-user" placeholder="User ID (from a profile or search result)" />
      <input class="input" id="endorse-skill" placeholder="Skill to endorse" />
      <input class="input" id="endorse-note" placeholder="Optional note" />
      <button class="btn btn-primary" id="endorse-btn">Endorse</button>
    </div>` : `
    ${Store.isLoggedIn() && Store.getUser() && Store.getUser().id !== profile.id ? `
    <div class="card">
      <h3>Endorse ${profile.name}</h3>
      <div id="endorse-msg"></div>
      <input class="input" id="endorse-skill" placeholder="Skill to endorse" />
      <input class="input" id="endorse-note" placeholder="Optional note" />
      <button class="btn btn-primary" id="endorse-btn">Endorse</button>
    </div>` : ''}`}
  `;

  if (editable) {
    const inboxBtn = root.querySelector('#profile-inbox-btn');
    if (inboxBtn) {
      inboxBtn.onclick = () => App.navigate('messages');
    }
    const logoutBtn = root.querySelector('#profile-logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        Store.clearToken();
        Store.setUser(null);
        App.refreshNav();
        App.navigate('home');
      };
    }

    root.querySelector('#save-profile').onclick = async () => {
      const msg = root.querySelector('#profile-msg');
      const interestsRaw = root.querySelector('#edit-interests').value.trim();
      try {
        await Api.updateMyProfile({
          name: root.querySelector('#edit-name').value.trim(),
          location: root.querySelector('#edit-location').value.trim(),
          availability: root.querySelector('#edit-availability').value,
          bio: root.querySelector('#edit-bio').value.trim(),
          interests: interestsRaw ? interestsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
        });
        msg.innerHTML = `<div class="info-box">Profile saved.</div>`;
        App.navigate('dashboard');
      } catch (e) {
        msg.innerHTML = `<div class="error-box">${e.message}</div>`;
      }
    };
    root.querySelector('#add-skill').onclick = async () => {
      const skill = root.querySelector('#skill-name').value.trim();
      const level = root.querySelector('#skill-level').value;
      const msg = root.querySelector('#msg');
      if (!skill) return;
      try {
        await Api.addMySkill({ skill, level });
        App.navigate('dashboard');
      } catch (e) {
        msg.innerHTML = `<div class="error-box">${e.message}</div>`;
      }
    };
    root.querySelectorAll('[data-remove]').forEach((el) => {
      el.onclick = async (ev) => {
        ev.preventDefault();
        await Api.removeMySkill(el.getAttribute('data-remove'));
        App.navigate('dashboard');
      };
    });
    root.querySelector('#endorse-btn').onclick = async () => {
      const toUserId = root.querySelector('#endorse-user').value.trim();
      const skill = root.querySelector('#endorse-skill').value.trim();
      const note = root.querySelector('#endorse-note').value.trim();
      const msg = root.querySelector('#endorse-msg');
      try {
        await Api.endorse({ toUserId, skill, note });
        msg.innerHTML = `<div class="info-box">Endorsement sent.</div>`;
      } catch (e) {
        msg.innerHTML = `<div class="error-box">${e.message}</div>`;
      }
    };
  } else if (root.querySelector('#endorse-btn')) {
    root.querySelector('#endorse-btn').onclick = async () => {
      const skill = root.querySelector('#endorse-skill').value.trim();
      const note = root.querySelector('#endorse-note').value.trim();
      const msg = root.querySelector('#endorse-msg');
      try {
        await Api.endorse({ toUserId: profile.id, skill, note });
        msg.innerHTML = `<div class="info-box">Endorsement sent.</div>`;
        App.navigate('profile', { id: profile.id });
      } catch (e) {
        msg.innerHTML = `<div class="error-box">${e.message}</div>`;
      }
    };
  }
}

Views.profile = async function (root, params) {
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading…</div>`;
  try {
    const { profile } = await Api.getProfile(params.id);
    renderProfile(root, profile, false);
  } catch (e) {
    root.innerHTML = `<div class="error-box">${e.message}</div>`;
  }
};

// ---------- Communities ----------
Views.communities = async function (root) {
  root.innerHTML = `
    <div class="card">
      <h3>Communities</h3>
      <div style="display:flex;gap:10px;">
        <input class="input" id="q" placeholder="Search communities…" style="flex:2;" />
        <button class="btn" id="search-btn">Search</button>
      </div>
    </div>
    ${Store.isLoggedIn() ? `
    <div class="card">
      <h3>Create a community</h3>
      <div id="create-msg"></div>
      <input class="input" id="new-name" placeholder="Community name" />
      <textarea class="input" id="new-desc" placeholder="What's this community about?" rows="2"></textarea>
      <button class="btn btn-primary" id="create-btn">Create</button>
    </div>` : ''}
    <div id="list" class="grid"><p class="muted">Loading…</p></div>
  `;

  async function loadList(q) {
    const list = root.querySelector('#list');
    list.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading communities…</div>`;
    const { communities } = await Api.listCommunities(q);
    if (!communities.length) {
      list.innerHTML = `<p class="muted">No communities found.</p>`;
      return;
    }
    list.innerHTML = communities.map((c) => `
      <div class="card">
        <h3>${c.name}</h3>
        <p class="muted">${c.description || 'No description.'}</p>
        <p class="muted">${c.memberCount} member${c.memberCount === 1 ? '' : 's'}</p>
        <button class="btn" data-view="${c.id}">View</button>
        ${Store.isLoggedIn() ? `<button class="btn btn-primary" data-join="${c.id}">Join</button>` : ''}
      </div>
    `).join('');
    list.querySelectorAll('[data-view]').forEach((btn) => {
      btn.onclick = () => App.navigate('community', { id: btn.getAttribute('data-view') });
    });
    list.querySelectorAll('[data-join]').forEach((btn) => {
      btn.onclick = async () => {
        await Api.joinCommunity(btn.getAttribute('data-join'));
        App.navigate('community', { id: btn.getAttribute('data-join') });
      };
    });
  }

  root.querySelector('#search-btn').onclick = () => loadList(root.querySelector('#q').value.trim());
  if (Store.isLoggedIn()) {
    root.querySelector('#create-btn').onclick = async () => {
      const name = root.querySelector('#new-name').value.trim();
      const description = root.querySelector('#new-desc').value.trim();
      const msg = root.querySelector('#create-msg');
      if (!name) return;
      try {
        const { community } = await Api.createCommunity({ name, description });
        App.navigate('community', { id: community.id });
      } catch (e) {
        msg.innerHTML = `<div class="error-box">${e.message}</div>`;
      }
    };
  }
  loadList();
};

Views.community = async function (root, params) {
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading…</div>`;
  try {
    const { community, members } = await Api.getCommunity(params.id);
    const me = Store.getUser();
    const myMembership = me && members.find((m) => m.id === me.id);
    const isOwner = me && community.ownerId === me.id;
    root.innerHTML = `
      <div class="card">
        <h3>${community.name}</h3>
        <p class="muted">${community.description || ''}</p>
        <p class="muted">${community.memberCount} members</p>
        ${Store.isLoggedIn() ? `
          ${!myMembership ? `<button class="btn btn-primary" id="join">Join</button>` : ''}
          ${myMembership && !isOwner ? `<button class="btn btn-danger" id="leave">Leave</button>` : ''}
          <button class="btn" id="search-here">AI search here</button>
          <button class="btn" id="team-here">Build team here</button>
          <button class="btn" id="analytics-here">Community intel</button>
        ` : ''}
      </div>
      <div class="card">
        <h3>Members</h3>
        ${members.map((m) => `<span class="badge" style="cursor:pointer;" data-profile="${m.id}">${m.name} <span class="muted">(${m.role})</span></span>`).join(' ') || '<span class="muted">No members yet.</span>'}
      </div>
      <div class="card">
        <h3>Knowledge graph</h3>
        <div id="graph-container"><div class="loading-line"><span class="spinner"></span> Loading graph…</div></div>
      </div>
    `;
    if (Store.isLoggedIn()) {
      if (root.querySelector('#join')) {
        root.querySelector('#join').onclick = async () => { await Api.joinCommunity(community.id); App.navigate('community', { id: community.id }); };
      }
      if (root.querySelector('#leave')) {
        root.querySelector('#leave').onclick = async () => {
          await Api.leaveCommunity(community.id);
          App.navigate('communities');
        };
      }
      root.querySelector('#search-here').onclick = () => App.navigate('search', { communityId: community.id });
      root.querySelector('#team-here').onclick = () => App.navigate('teams', { communityId: community.id });
      root.querySelector('#analytics-here').onclick = () => App.navigate('analytics');
    }
    root.querySelectorAll('[data-profile]').forEach((el) => {
      el.onclick = () => App.navigate('profile', { id: el.getAttribute('data-profile') });
    });
    const { nodes, edges } = await Api.graph(community.id);
    GraphView.render(root.querySelector('#graph-container'), { nodes, edges });
  } catch (e) {
    root.innerHTML = `<div class="error-box">${e.message}</div>`;
  }
};

// ---------- AI Search ----------
Views.search = function (root, params) {
  root.innerHTML = `
    <div class="card">
      <h3>Describe what you need</h3>
      <p class="muted">Try: "I need someone to teach robotics", "emergency electrician needed now", or "build me a hackathon team".</p>
      ${!Store.isLoggedIn() ? '<div class="error-box">Log in to run a search.</div>' : ''}
      <textarea class="input" id="query" rows="2" placeholder="I need someone to teach robotics"></textarea>
      <button class="btn btn-primary" id="run" ${!Store.isLoggedIn() ? 'disabled' : ''}>Search</button>
    </div>
    <div id="results"></div>
  `;
  root.querySelector('#run').onclick = async () => {
    const query = root.querySelector('#query').value.trim();
    const results = root.querySelector('#results');
    if (!query) return;
    results.innerHTML = `<div class="loading-line"><span class="spinner"></span> Reasoning over the community graph…</div>`;
    try {
      const data = await Api.search({ query, communityId: params && params.communityId });
      renderSearchResults(results, data);
    } catch (e) {
      results.innerHTML = `<div class="error-box">${e.message}</div>`;
    }
  };
};

function renderSearchResults(container, data) {
  const { understanding, results, mode, team, hiddenExperts } = data;
  const skillBadges = understanding.skills.map((s) => `<span class="badge badge-skill">${s}</span>`).join(' ') || '<span class="muted">none detected</span>';

  let teamBlock = '';
  if (mode === 'team_builder' && team) {
    teamBlock = `
      <div class="card">
        <h3>AI Team · ${team.coverage}% skill coverage · success prediction ${team.successPrediction}%</h3>
        <p class="muted">Needed: ${team.neededSkills.join(', ') || '—'}
          ${team.uncoveredSkills.length ? ` · Gaps: ${team.uncoveredSkills.join(', ')}` : ''}</p>
        <p class="muted">Avg trust ${team.rationale.avgTrust} · Available ${team.rationale.availableRatio}% · Prior collabs ${team.rationale.priorCollaborations}</p>
      </div>`;
  }

  let hiddenBlock = '';
  if (hiddenExperts && hiddenExperts.length) {
    hiddenBlock = `
      <div class="card">
        <h3>Hidden experts</h3>
        ${hiddenExperts.map((h) => `
          <div class="result-row">
            <div class="result-main">
              <div>
                <strong style="cursor:pointer;" data-profile="${h.user.id}">${h.user.name}</strong>
                <p class="muted" style="margin:4px 0;">${h.reason}</p>
                <div>${(h.inferredHits || []).map((s) => `<span class="badge badge-matched">${s}</span>`).join(' ')}</div>
              </div>
            </div>
            <div class="score-pill">trust ${h.trustScore}</div>
          </div>
        `).join('')}
      </div>`;
  }

  container.innerHTML = `
    <div class="card">
      <p class="muted">Intent: <strong>${understanding.intent.replace('_', ' ')}</strong>
        ${understanding.urgent ? '<span class="badge badge-urgent">urgent</span>' : ''}
        ${mode ? `<span class="badge">${mode}</span>` : ''}
      </p>
      <p class="muted">Detected skills: ${skillBadges}</p>
    </div>
    ${teamBlock}
    <div class="card">
      <h3>${results.length} match${results.length === 1 ? '' : 'es'}</h3>
      ${results.length === 0 ? `<div class="info-box">No matches yet — try adding skills to profiles, or rephrase.</div>` : ''}
      ${results.map((r, i) => `
        <div class="result-row">
          <div class="result-main">
            <div class="result-rank">${i + 1}</div>
            <div>
              <strong style="cursor:pointer;" data-profile="${r.user.id}">${r.user.name}</strong>
              <p class="muted" style="margin:4px 0;">📍 ${r.user.location || 'Location unknown'} · ${r.user.availability === 'available' ? '🟢' : '🟠'} ${r.user.availability}${r.trustScore != null ? ` · trust ${r.trustScore}` : ''}</p>
              <div>${r.skills.map((s) => `<span class="badge ${(r.matchedSkills || []).includes(s) ? 'badge-matched' : 'badge-skill'}">${s}</span>`).join(' ')}</div>
            </div>
          </div>
          <div class="score-pill">score ${r.score}</div>
        </div>
      `).join('')}
    </div>
    ${hiddenBlock}
  `;
  container.querySelectorAll('[data-profile]').forEach((el) => {
    el.onclick = () => App.navigate('profile', { id: el.getAttribute('data-profile') });
  });
}

// ---------- AI Team Builder ----------
Views.teams = function (root, params) {
  root.innerHTML = `
    <div class="card">
      <h3>AI Team Builder</h3>
      <p class="muted">Describe a project goal. SkillMesh balances skills, availability, trust, and prior collaborations.</p>
      ${!Store.isLoggedIn() ? '<div class="error-box">Log in to build and optionally create a project from the suggestion.</div>' : ''}
      <textarea class="input" id="goal" rows="2" placeholder="Build me a hackathon team for a civic tech app"></textarea>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <label class="muted"><input type="checkbox" id="create-project" ${Store.isLoggedIn() ? '' : 'disabled'} /> Also create project &amp; invite the team</label>
        <button class="btn btn-primary" id="run">Build team</button>
      </div>
    </div>
    <div id="results"></div>
  `;
  root.querySelector('#run').onclick = async () => {
    const goal = root.querySelector('#goal').value.trim();
    const createProject = root.querySelector('#create-project').checked;
    const results = root.querySelector('#results');
    if (!goal) return;
    results.innerHTML = `<div class="loading-line"><span class="spinner"></span> Assembling a balanced team…</div>`;
    try {
      const data = await Api.buildTeam({
        goal,
        communityId: params && params.communityId,
        size: 4,
        createProject,
      });
      results.innerHTML = `
        <div class="card">
          <h3>Suggested team · coverage ${data.coverage}% · success ${data.successPrediction}%</h3>
          <p class="muted">Skills needed: ${(data.neededSkills || []).join(', ')}
            ${data.uncoveredSkills.length ? ` · Gaps: ${data.uncoveredSkills.join(', ')}` : ''}</p>
          ${data.project ? `<p class="info-box">Project created: <a href="#project?id=${data.project.id}" style="color:var(--cyan);">${data.project.title}</a> — invites sent.</p>` : ''}
          ${data.team.map((m, i) => `
            <div class="result-row">
              <div class="result-main">
                <div class="result-rank">${i + 1}</div>
                <div>
                  <strong style="cursor:pointer;" data-profile="${m.user.id}">${m.user.name}</strong>
                  <p class="muted" style="margin:4px 0;">${m.user.availability} · trust ${m.trustScore} · covers ${(m.covers || []).join(', ') || '—'}</p>
                  <div>${m.skills.map((s) => `<span class="badge badge-skill">${s}</span>`).join(' ')}</div>
                </div>
              </div>
              <div class="score-pill">${m.score}</div>
            </div>
          `).join('')}
        </div>
      `;
      results.querySelectorAll('[data-profile]').forEach((el) => {
        el.onclick = () => App.navigate('profile', { id: el.getAttribute('data-profile') });
      });
    } catch (e) {
      results.innerHTML = `<div class="error-box">${e.message}</div>`;
    }
  };
};

// ---------- Projects ----------
Views.projects = async function (root) {
  root.innerHTML = `
    <div class="card">
      <h3>Collaborative projects</h3>
      <p class="muted">Create projects, invite teammates, manage join requests.</p>
    </div>
    ${Store.isLoggedIn() ? `
    <div class="card">
      <h3>New project</h3>
      <div id="create-msg"></div>
      <input class="input" id="title" placeholder="Project title" />
      <textarea class="input" id="desc" rows="2" placeholder="Description / goal"></textarea>
      <input class="input" id="timeline" placeholder="Timeline (optional), e.g. 2026-08-15 to 2026-08-17" />
      <button class="btn btn-primary" id="create">Create</button>
    </div>` : '<div class="error-box">Log in to create projects.</div>'}
    <div id="list" class="grid"><div class="loading-line"><span class="spinner"></span> Loading…</div></div>
  `;
  if (Store.isLoggedIn()) {
    root.querySelector('#create').onclick = async () => {
      const title = root.querySelector('#title').value.trim();
      const description = root.querySelector('#desc').value.trim();
      const timeline = root.querySelector('#timeline').value.trim();
      const msg = root.querySelector('#create-msg');
      if (!title) return;
      try {
        const { project } = await Api.createProject({ title, description, goal: description, timeline: timeline || undefined });
        App.navigate('project', { id: project.id });
      } catch (e) {
        msg.innerHTML = `<div class="error-box">${e.message}</div>`;
      }
    };
  }
  try {
    const { projects } = await Api.listProjects();
    const list = root.querySelector('#list');
    if (!projects.length) {
      list.innerHTML = `<p class="muted">No projects yet.</p>`;
      return;
    }
    list.innerHTML = projects.map((p) => `
      <div class="card">
        <h3>${p.title}</h3>
        <p class="muted">${p.description || p.goal || ''}</p>
        <p class="muted">${p.memberCount} joined · ${p.status}${p.timeline ? ` · ${p.timeline}` : ''}</p>
        <button class="btn btn-primary" data-id="${p.id}">Open</button>
      </div>
    `).join('');
    list.querySelectorAll('[data-id]').forEach((btn) => {
      btn.onclick = () => App.navigate('project', { id: btn.getAttribute('data-id') });
    });
  } catch (e) {
    root.querySelector('#list').innerHTML = `<div class="error-box">${e.message}</div>`;
  }
};

Views.project = async function (root, params) {
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading project…</div>`;
  try {
    const { project } = await Api.getProject(params.id);
    const me = Store.getUser();
    const myMembership = me && project.members.find((m) => m.userId === me.id);
    const isOwner = me && project.ownerId === me.id;

    let discussionHtml = '';
    if (myMembership && myMembership.status === 'joined') {
      try {
        const { messages } = await Api.projectMessages(project.id);
        discussionHtml = messages.map((m) => `
          <div class="msg-row ${m.announcement ? 'announcement' : ''}">
            <strong>${m.from ? m.from.name : '?'}</strong>
            ${m.announcement ? '<span class="badge badge-urgent">announcement</span>' : ''}
            <p>${m.body}</p>
            <p class="muted" style="font-size:12px;">${new Date(m.createdAt).toLocaleString()}</p>
          </div>
        `).join('') || '<p class="muted">No messages yet.</p>';
      } catch {
        discussionHtml = '<p class="muted">Could not load discussion.</p>';
      }
    }

    root.innerHTML = `
      <div class="card">
        <h3>${project.title}</h3>
        <p class="muted">${project.description || ''}</p>
        <p class="muted">Goal: ${project.goal || '—'} · Status: ${project.status}${project.timeline ? ` · ${project.timeline}` : ''}</p>
        ${myMembership && myMembership.status === 'invited' ? `
          <button class="btn btn-primary" id="accept">Accept invite</button>
          <button class="btn" id="decline">Decline</button>
        ` : ''}
        ${Store.isLoggedIn() && (!myMembership || myMembership.status === 'declined') ? `
          <button class="btn btn-primary" id="request">Request to join</button>
        ` : ''}
        ${myMembership && myMembership.status === 'requested' ? `<span class="badge">Join request pending</span>` : ''}
      </div>
      <div class="card">
        <h3>Members</h3>
        ${project.members.map((m) => `
          <span class="badge" style="cursor:pointer;" data-profile="${m.userId}">${m.name} <span class="muted">(${m.role} · ${m.status})</span></span>
          ${isOwner && m.status === 'requested' ? `
            <button class="btn" data-approve="${m.userId}">Approve</button>
            <button class="btn" data-reject="${m.userId}">Reject</button>
          ` : ''}
        `).join(' ')}
      </div>
      ${isOwner ? `
      <div class="card">
        <h3>Invite someone</h3>
        <div id="invite-msg"></div>
        <input class="input" id="invite-id" placeholder="User ID" />
        <button class="btn btn-primary" id="invite-btn">Send invite</button>
      </div>` : ''}
      ${myMembership && myMembership.status === 'joined' ? `
      <div class="card">
        <h3>Team discussion</h3>
        <div id="discussion">${discussionHtml}</div>
        <textarea class="input" id="msg-body" rows="2" placeholder="Write a message…"></textarea>
        <label class="muted"><input type="checkbox" id="announce" ${isOwner ? '' : 'disabled'} /> Post as announcement</label>
        <button class="btn btn-primary" id="send-msg">Send</button>
      </div>` : ''}
    `;

    root.querySelectorAll('[data-profile]').forEach((el) => {
      el.onclick = () => App.navigate('profile', { id: el.getAttribute('data-profile') });
    });
    if (root.querySelector('#accept')) {
      root.querySelector('#accept').onclick = async () => { await Api.respondInvite(project.id, true); App.navigate('project', { id: project.id }); };
      root.querySelector('#decline').onclick = async () => { await Api.respondInvite(project.id, false); App.navigate('project', { id: project.id }); };
    }
    if (root.querySelector('#request')) {
      root.querySelector('#request').onclick = async () => { await Api.requestJoinProject(project.id); App.navigate('project', { id: project.id }); };
    }
    root.querySelectorAll('[data-approve]').forEach((btn) => {
      btn.onclick = async () => { await Api.approveJoin(project.id, { userId: btn.getAttribute('data-approve'), approve: true }); App.navigate('project', { id: project.id }); };
    });
    root.querySelectorAll('[data-reject]').forEach((btn) => {
      btn.onclick = async () => { await Api.approveJoin(project.id, { userId: btn.getAttribute('data-reject'), approve: false }); App.navigate('project', { id: project.id }); };
    });
    if (root.querySelector('#invite-btn')) {
      root.querySelector('#invite-btn').onclick = async () => {
        const userId = root.querySelector('#invite-id').value.trim();
        const msg = root.querySelector('#invite-msg');
        try {
          await Api.inviteToProject(project.id, { userId });
          msg.innerHTML = `<div class="info-box">Invite sent.</div>`;
        } catch (e) {
          msg.innerHTML = `<div class="error-box">${e.message}</div>`;
        }
      };
    }
    if (root.querySelector('#send-msg')) {
      root.querySelector('#send-msg').onclick = async () => {
        const body = root.querySelector('#msg-body').value.trim();
        const announcement = root.querySelector('#announce').checked;
        if (!body) return;
        await Api.sendMessage({ projectId: project.id, body, announcement });
        App.navigate('project', { id: project.id });
      };
    }
  } catch (e) {
    root.innerHTML = `<div class="error-box">${e.message}</div>`;
  }
};

// ---------- Recommendations ----------
Views.recommendations = async function (root) {
  root.innerHTML = `
    <div class="card">
      <h3>Smart recommendations</h3>
      <p class="muted">Mentors, volunteers, experts, similar people, and nearby contributors.</p>
      ${!Store.isLoggedIn() ? '<div class="error-box">Log in for personalized recommendations.</div>' : ''}
    </div>
    <div id="recs"><div class="loading-line"><span class="spinner"></span> Loading…</div></div>
  `;
  if (!Store.isLoggedIn()) return;
  try {
    const data = await Api.recommendations();
    const sections = [
      ['Mentors', data.mentors],
      ['Volunteers', data.volunteers],
      ['Experts', data.experts],
      ['Similar people', data.similar],
      ['Nearby', data.nearby],
    ];
    root.querySelector('#recs').innerHTML = sections.map(([title, items]) => `
      <div class="card">
        <h3>${title}</h3>
        ${!(items && items.length) ? '<p class="muted">None found yet.</p>' : items.map((r) => `
          <div class="result-row">
            <div class="result-main">
              <div>
                <strong style="cursor:pointer;" data-profile="${r.user.id}">${r.user.name}</strong>
                <p class="muted" style="margin:4px 0;">📍 ${r.user.location || '—'} · trust ${r.trustScore}</p>
                <div>${(r.skills || r.matchedSkills || r.teachable || []).slice(0, 6).map((s) => `<span class="badge badge-skill">${s}</span>`).join(' ')}</div>
              </div>
            </div>
            <div class="score-pill">${Math.round(r.score)}</div>
          </div>
        `).join('')}
      </div>
    `).join('');
    root.querySelectorAll('[data-profile]').forEach((el) => {
      el.onclick = () => App.navigate('profile', { id: el.getAttribute('data-profile') });
    });
  } catch (e) {
    root.querySelector('#recs').innerHTML = `<div class="error-box">${e.message}</div>`;
  }
};

// ---------- Opportunities ----------
Views.opportunities = async function (root) {
  root.innerHTML = `
    <div class="card">
      <h3>Opportunities</h3>
      <p class="muted">Volunteer, mentorship, events, and organization requests.</p>
      <div style="display:flex;gap:10px;">
        <select class="input" id="type-filter" style="flex:1;">
          <option value="">All types</option>
          <option value="volunteer">Volunteer</option>
          <option value="mentorship">Mentorship</option>
          <option value="event">Event</option>
          <option value="initiative">Initiative</option>
          <option value="project">Project</option>
          <option value="organization_request">Organization request</option>
        </select>
        <button class="btn" id="refresh">Filter</button>
      </div>
    </div>
    ${Store.isLoggedIn() ? `
    <div class="card">
      <h3>Post an opportunity</h3>
      <div id="create-msg"></div>
      <select class="input" id="new-type">
        <option value="volunteer">Volunteer</option>
        <option value="mentorship">Mentorship</option>
        <option value="event">Event</option>
        <option value="initiative">Initiative</option>
        <option value="project">Project</option>
      </select>
      <input class="input" id="new-title" placeholder="Title" />
      <textarea class="input" id="new-desc" rows="2" placeholder="Description (skills are auto-extracted)"></textarea>
      <button class="btn btn-primary" id="create">Post</button>
    </div>` : ''}
    <div id="list" class="grid"><div class="loading-line"><span class="spinner"></span> Loading…</div></div>
  `;

  async function load(type) {
    const list = root.querySelector('#list');
    list.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading…</div>`;
    const { opportunities } = await Api.listOpportunities(type ? { type } : {});
    if (!opportunities.length) {
      list.innerHTML = `<p class="muted">No open opportunities.</p>`;
      return;
    }
    list.innerHTML = opportunities.map((o) => `
      <div class="card">
        <span class="badge">${o.type}</span>
        <h3>${o.title}</h3>
        <p class="muted">${o.description || ''}</p>
        <div>${(o.skillsNeeded || []).map((s) => `<span class="badge badge-skill">${s}</span>`).join(' ')}</div>
        <p class="muted">${o.applicantCount || 0} applicants${o.matchCount ? ` · ${o.matchCount} skill match` : ''}</p>
        <button class="btn" data-view="${o.id}">View</button>
        ${Store.isLoggedIn() ? `<button class="btn btn-primary" data-apply="${o.id}">Apply</button>` : ''}
      </div>
    `).join('');
    list.querySelectorAll('[data-view]').forEach((btn) => {
      btn.onclick = () => App.navigate('opportunity', { id: btn.getAttribute('data-view') });
    });
    list.querySelectorAll('[data-apply]').forEach((btn) => {
      btn.onclick = async () => {
        await Api.applyOpportunity(btn.getAttribute('data-apply'), 'Happy to help!');
        App.navigate('opportunity', { id: btn.getAttribute('data-apply') });
      };
    });
  }

  root.querySelector('#refresh').onclick = () => load(root.querySelector('#type-filter').value);
  if (Store.isLoggedIn()) {
    root.querySelector('#create').onclick = async () => {
      const type = root.querySelector('#new-type').value;
      const title = root.querySelector('#new-title').value.trim();
      const description = root.querySelector('#new-desc').value.trim();
      const msg = root.querySelector('#create-msg');
      if (!title) return;
      try {
        const { opportunity } = await Api.createOpportunity({ type, title, description });
        App.navigate('opportunity', { id: opportunity.id });
      } catch (e) {
        msg.innerHTML = `<div class="error-box">${e.message}</div>`;
      }
    };
  }
  load();
};

Views.opportunity = async function (root, params) {
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading…</div>`;
  try {
    const { opportunity, applications } = await Api.getOpportunity(params.id);
    const me = Store.getUser();
    const isCreator = me && opportunity.creatorId === me.id;
    root.innerHTML = `
      <div class="card">
        <span class="badge">${opportunity.type}</span>
        <h3>${opportunity.title}</h3>
        <p class="muted">${opportunity.description || ''}</p>
        <p class="muted">By ${opportunity.creator ? opportunity.creator.name : '—'} · ${opportunity.status}</p>
        <div>${(opportunity.skillsNeeded || []).map((s) => `<span class="badge badge-skill">${s}</span>`).join(' ')}</div>
        ${Store.isLoggedIn() && opportunity.status === 'open' && !isCreator ? `<button class="btn btn-primary" id="apply" style="margin-top:12px;">Apply</button>` : ''}
      </div>
      <div class="card">
        <h3>Applicants (${applications.length})</h3>
        ${applications.map((a) => `
          <div class="result-row">
            <div class="result-main">
              <div>
                <strong>${a.user ? a.user.name : '?'}</strong>
                <p class="muted">${a.status} · trust ${a.trustScore}${a.message ? ` · "${a.message}"` : ''}</p>
              </div>
            </div>
            ${isCreator && a.status === 'pending' ? `
              <button class="btn btn-primary" data-accept="${a.id}">Accept</button>
              <button class="btn" data-reject="${a.id}">Reject</button>
            ` : ''}
          </div>
        `).join('') || '<p class="muted">No applicants yet.</p>'}
      </div>
    `;
    if (root.querySelector('#apply')) {
      root.querySelector('#apply').onclick = async () => {
        await Api.applyOpportunity(opportunity.id, 'I would like to help.');
        App.navigate('opportunity', { id: opportunity.id });
      };
    }
    root.querySelectorAll('[data-accept]').forEach((btn) => {
      btn.onclick = async () => {
        await Api.decideOpportunity(opportunity.id, { applicationId: btn.getAttribute('data-accept'), accept: true });
        App.navigate('opportunity', { id: opportunity.id });
      };
    });
    root.querySelectorAll('[data-reject]').forEach((btn) => {
      btn.onclick = async () => {
        await Api.decideOpportunity(opportunity.id, { applicationId: btn.getAttribute('data-reject'), accept: false });
        App.navigate('opportunity', { id: opportunity.id });
      };
    });
  } catch (e) {
    root.innerHTML = `<div class="error-box">${e.message}</div>`;
  }
};

// ---------- Messages & notifications ----------
Views.messages = async function (root) {
  if (!Store.isLoggedIn()) {
    root.innerHTML = `<div class="error-box">Log in to view messages and notifications.</div>`;
    return;
  }
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading inbox & notifications…</div>`;

  try {
    const [{ notifications, unread }, { messages }, { activity }] = await Promise.all([
      Api.notifications(),
      Api.inbox(),
      Api.activity(),
    ]);

    // Helper: Relative time formatter
    const formatRelativeTime = (dateInput) => {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return 'Recently';
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString();
    };

    // Helper: Time Group Header assignment (Today, Yesterday, Earlier This Week)
    const getTimeGroupHeader = (dateInput) => {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return 'Today';
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();

      if (isToday) return 'Today';
      if (isYesterday) return 'Yesterday';
      return 'Earlier This Week';
    };

    // Normalizing all items into unified inbox cards with tab categories
    let allInboxItems = [];

    // 1. Direct Messages & Team Invites -> Primary
    messages.forEach((m) => {
      const senderName = m.from ? m.from.name : 'System';
      allInboxItems.push({
        id: `msg-${m.id}`,
        type: 'message',
        category: 'primary', // Primary / Direct
        sender: senderName,
        avatar: senderName.charAt(0).toUpperCase(),
        title: m.from ? `Message from ${senderName}` : 'Direct Message',
        preview: m.body || '',
        createdAt: m.createdAt || new Date(),
        read: true,
        starred: false,
        raw: m,
      });
    });

    // 2. Notifications & System Announcements -> Updates
    notifications.forEach((n) => {
      const isAnnouncement = n.title && n.title.toLowerCase().includes('announcement');
      allInboxItems.push({
        id: `notif-${n.id}`,
        type: 'notification',
        category: isAnnouncement ? 'updates' : 'updates', // Updates / Announcements
        sender: isAnnouncement ? '📢 System' : '🔔 Alert',
        avatar: isAnnouncement ? '📢' : '🔔',
        title: n.title || 'System Notification',
        preview: n.body || '',
        createdAt: n.createdAt || new Date(),
        read: !!n.read,
        starred: false,
        raw: n,
      });
    });

    // 3. Activity Feed, Endorsements, Community Alerts -> Social
    activity.forEach((a) => {
      allInboxItems.push({
        id: `act-${a.id}`,
        type: 'activity',
        category: 'social', // Promotions / Social
        sender: '🌱 Community',
        avatar: '🤝',
        title: 'Community Activity & Social',
        preview: a.summary || '',
        createdAt: a.createdAt || new Date(),
        read: true,
        starred: false,
        raw: a,
      });
    });

    // Default tab state & active filters
    let currentTab = 'primary'; // 'primary', 'updates', 'social'
    let currentFilter = 'all'; // 'all', 'unread', 'starred'
    let searchQuery = '';
    let selectedItemIds = new Set();

    const renderInbox = () => {
      // Filter by active category tab
      let items = allInboxItems.filter((item) => item.category === currentTab);

      // Filter by quick chip (All, Unread, Starred)
      if (currentFilter === 'unread') {
        items = items.filter((item) => !item.read);
      } else if (currentFilter === 'starred') {
        items = items.filter((item) => item.starred);
      }

      // Filter by keyword search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        items = items.filter((item) =>
          item.title.toLowerCase().includes(q) ||
          item.preview.toLowerCase().includes(q) ||
          item.sender.toLowerCase().includes(q)
        );
      }

      // Calculate tab counts
      const primaryCount = allInboxItems.filter((i) => i.category === 'primary' && !i.read).length;
      const updatesCount = allInboxItems.filter((i) => i.category === 'updates' && !i.read).length;
      const socialCount = allInboxItems.filter((i) => i.category === 'social' && !i.read).length;

      // Group items by time blocks: Today, Yesterday, Earlier This Week
      const timeGroups = {
        'Today': [],
        'Yesterday': [],
        'Earlier This Week': [],
      };

      items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      items.forEach((item) => {
        const group = getTimeGroupHeader(item.createdAt);
        timeGroups[group].push(item);
      });

      const unreadTotal = allInboxItems.filter((i) => !i.read).length;

      root.innerHTML = `
        <div class="card">
          <div class="inbox-header-bar">
            <div>
              <h2 style="margin:0;">Inbox & Notifications ${unreadTotal ? `<span class="badge badge-urgent">${unreadTotal} unread</span>` : ''}</h2>
              <p class="muted" style="margin:4px 0 0;">Manage direct communications, system announcements, and community activity.</p>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn btn-primary" id="mark-all-read-cta">✓ Mark All as Read</button>
            </div>
          </div>

          <!-- 1. Dedicated Tabs: Primary, Updates, Social -->
          <div class="inbox-tabs">
            <button class="inbox-tab ${currentTab === 'primary' ? 'active' : ''}" data-tab="primary">
              💬 Primary ${primaryCount ? `<span class="badge badge-urgent">${primaryCount}</span>` : ''}
            </button>
            <button class="inbox-tab ${currentTab === 'updates' ? 'active' : ''}" data-tab="updates">
              📢 Updates ${updatesCount ? `<span class="badge badge-urgent">${updatesCount}</span>` : ''}
            </button>
            <button class="inbox-tab ${currentTab === 'social' ? 'active' : ''}" data-tab="social">
              🤝 Social & Promo ${socialCount ? `<span class="badge badge-urgent">${socialCount}</span>` : ''}
            </button>
          </div>
        </div>

        <!-- 2. Quick Actions & Filtering Bar -->
        <div class="inbox-filter-bar">
          <div class="filter-chips">
            <button class="filter-chip ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
            <button class="filter-chip ${currentFilter === 'unread' ? 'active' : ''}" data-filter="unread">Unread</button>
            <button class="filter-chip ${currentFilter === 'starred' ? 'active' : ''}" data-filter="starred">⭐ Starred</button>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <input type="text" class="input inbox-search-input" id="inbox-search" placeholder="🔍 Search messages..." value="${searchQuery}" />
          </div>
        </div>

        ${selectedItemIds.size > 0 ? `
          <div class="bulk-actions-bar">
            <span><strong>${selectedItemIds.size}</strong> items selected</span>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-sm" id="bulk-mark-read">Mark Selected Read</button>
              <button class="btn btn-sm btn-danger" id="bulk-clear">Clear Selected</button>
            </div>
          </div>
        ` : ''}

        <!-- 3. Time Grouped Notification Stream -->
        <div id="inbox-stream">
          ${Object.keys(timeGroups).map((groupName) => {
            const groupItems = timeGroups[groupName];
            if (!groupItems.length) return '';
            return `
              <div class="inbox-time-group">
                <div class="time-group-header">${groupName}</div>
                ${groupItems.map((item) => `
                  <!-- Standardized Visual Card Template -->
                  <div class="inbox-card ${item.read ? '' : 'unread'}" data-id="${item.id}">
                    <input type="checkbox" class="inbox-checkbox" data-cb="${item.id}" ${selectedItemIds.has(item.id) ? 'checked' : ''} style="cursor:pointer;" />
                    
                    <!-- Left: Sender Icon / Avatar -->
                    <div class="card-sender-icon">${item.avatar}</div>
                    
                    <!-- Center: Subject & 1-line Text Preview -->
                    <div class="card-center-content">
                      <div class="card-title">
                        ${!item.read ? '<span class="unread-indicator-dot" title="Unread"></span>' : ''}
                        <span>${item.title}</span>
                        ${item.starred ? '<span style="color:var(--amber);">⭐</span>' : ''}
                      </div>
                      <p class="card-preview">${item.preview || 'No text preview available.'}</p>
                    </div>

                    <!-- Top Right: Relative Timestamp & Hover Action Bar -->
                    <div class="card-top-right">
                      <span class="card-timestamp">${formatRelativeTime(item.createdAt)}</span>
                      <div class="card-action-bar">
                        <button class="card-action-btn" data-act="star" data-id="${item.id}" title="Star/Unstar">${item.starred ? '★' : '☆'}</button>
                        <button class="card-action-btn" data-act="read" data-id="${item.id}" title="${item.read ? 'Mark Unread' : 'Mark Read'}">${item.read ? '✉️' : '📩'}</button>
                        <button class="card-action-btn" data-act="delete" data-id="${item.id}" title="Delete/Archive">🗑️</button>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `;
          }).join('') || `<div class="card"><p class="muted">No messages found in this category view.</p></div>`}
        </div>

        <!-- DM Direct Composer -->
        <div class="card" style="margin-top:24px;">
          <h3>Send Direct Message</h3>
          <div id="dm-msg"></div>
          <div class="field-row" style="margin-bottom:12px;">
            <input class="input" id="dm-to" placeholder="Recipient User ID e.g. 1" />
          </div>
          <textarea class="input" id="dm-body" rows="2" placeholder="Write your message here..."></textarea>
          <button class="btn btn-primary" id="dm-send">Send Direct Message</button>
        </div>
      `;

      // Event Binding for Tabs
      root.querySelectorAll('.inbox-tab').forEach((tabBtn) => {
        tabBtn.onclick = () => {
          currentTab = tabBtn.getAttribute('data-tab');
          renderInbox();
        };
      });

      // Event Binding for Filters
      root.querySelectorAll('.filter-chip').forEach((chipBtn) => {
        chipBtn.onclick = () => {
          currentFilter = chipBtn.getAttribute('data-filter');
          renderInbox();
        };
      });

      // Event Binding for Search
      const searchEl = root.querySelector('#inbox-search');
      if (searchEl) {
        searchEl.oninput = (e) => {
          searchQuery = e.target.value;
          renderInbox();
          // Maintain focus
          const updatedSearch = root.querySelector('#inbox-search');
          if (updatedSearch) {
            updatedSearch.focus();
            updatedSearch.setSelectionRange(searchQuery.length, searchQuery.length);
          }
        };
      }

      // Event Binding for Checkboxes & Bulk Selection
      root.querySelectorAll('.inbox-checkbox').forEach((cb) => {
        cb.onclick = (e) => {
          e.stopPropagation();
          const id = cb.getAttribute('data-cb');
          if (cb.checked) {
            selectedItemIds.add(id);
          } else {
            selectedItemIds.delete(id);
          }
          renderInbox();
        };
      });

      // Bulk Action Listeners
      if (root.querySelector('#bulk-mark-read')) {
        root.querySelector('#bulk-mark-read').onclick = () => {
          allInboxItems.forEach((i) => {
            if (selectedItemIds.has(i.id)) i.read = true;
          });
          selectedItemIds.clear();
          App.showToast('Selected items marked as read');
          renderInbox();
        };
      }
      if (root.querySelector('#bulk-clear')) {
        root.querySelector('#bulk-clear').onclick = () => {
          allInboxItems = allInboxItems.filter((i) => !selectedItemIds.has(i.id));
          selectedItemIds.clear();
          App.showToast('Selected items cleared');
          renderInbox();
        };
      }

      // Hover Card Action Listeners (Star, Read, Delete)
      root.querySelectorAll('[data-act]').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const act = btn.getAttribute('data-act');
          const id = btn.getAttribute('data-id');
          const targetItem = allInboxItems.find((i) => i.id === id);

          if (targetItem) {
            if (act === 'star') {
              targetItem.starred = !targetItem.starred;
            } else if (act === 'read') {
              targetItem.read = !targetItem.read;
            } else if (act === 'delete') {
              allInboxItems = allInboxItems.filter((i) => i.id !== id);
              App.showToast('Item deleted');
            }
            renderInbox();
          }
        };
      });

      // Task 2: "Mark All as Read" & Notification Bar Sync CTA
      const markAllBtn = root.querySelector('#mark-all-read-cta');
      if (markAllBtn) {
        markAllBtn.onclick = async () => {
          // Immediately convert active in-app indicators to read state
          allInboxItems.forEach((i) => (i.read = true));

          // Trigger OS native API to clear notifications from phone top bar and show Toast with 2s Undo
          await App.markAllNotificationsReadWithUndo();

          renderInbox();
        };
      }

      // DM Composer Listener
      const dmSendBtn = root.querySelector('#dm-send');
      if (dmSendBtn) {
        dmSendBtn.onclick = async () => {
          const toUserId = root.querySelector('#dm-to').value.trim();
          const body = root.querySelector('#dm-body').value.trim();
          const msg = root.querySelector('#dm-msg');
          if (!toUserId || !body) {
            msg.innerHTML = `<div class="error-box">Please provide recipient ID and message text.</div>`;
            return;
          }
          try {
            await Api.sendMessage({ toUserId, body });
            App.showToast('Message sent successfully!');
            App.navigate('messages');
          } catch (e) {
            msg.innerHTML = `<div class="error-box">${e.message}</div>`;
          }
        };
      }
    };

    renderInbox();
  } catch (e) {
    root.innerHTML = `<div class="error-box">${e.message}</div>`;
  }
};

// ---------- Organizations ----------
Views.organizations = async function (root) {
  root.innerHTML = `
    <div class="card">
      <h3>Organizations</h3>
      <p class="muted">NGO, school, college, club, and small-business workspaces.</p>
    </div>
    ${Store.isLoggedIn() ? `
    <div class="card">
      <h3>Create workspace</h3>
      <div id="create-msg"></div>
      <input class="input" id="name" placeholder="Organization name" />
      <select class="input" id="type">
        <option value="ngo">NGO</option>
        <option value="school">School</option>
        <option value="college">College</option>
        <option value="club">Club</option>
        <option value="small_business">Small business</option>
      </select>
      <textarea class="input" id="desc" rows="2" placeholder="Description"></textarea>
      <button class="btn btn-primary" id="create">Create</button>
    </div>` : ''}
    <div id="list" class="grid"><div class="loading-line"><span class="spinner"></span> Loading…</div></div>
  `;
  if (Store.isLoggedIn()) {
    root.querySelector('#create').onclick = async () => {
      const name = root.querySelector('#name').value.trim();
      const type = root.querySelector('#type').value;
      const description = root.querySelector('#desc').value.trim();
      const msg = root.querySelector('#create-msg');
      if (!name) return;
      try {
        const { organization } = await Api.createOrganization({ name, type, description });
        App.navigate('organization', { id: organization.id });
      } catch (e) {
        msg.innerHTML = `<div class="error-box">${e.message}</div>`;
      }
    };
  }
  try {
    const { organizations } = await Api.listOrganizations();
    const list = root.querySelector('#list');
    list.innerHTML = organizations.length ? organizations.map((o) => `
      <div class="card">
        <span class="badge">${o.type}</span>
        <h3>${o.name}</h3>
        <p class="muted">${o.description || ''}</p>
        <p class="muted">${o.memberCount} members</p>
        <button class="btn btn-primary" data-id="${o.id}">Open</button>
      </div>
    `).join('') : '<p class="muted">No organizations yet.</p>';
    list.querySelectorAll('[data-id]').forEach((btn) => {
      btn.onclick = () => App.navigate('organization', { id: btn.getAttribute('data-id') });
    });
  } catch (e) {
    root.querySelector('#list').innerHTML = `<div class="error-box">${e.message}</div>`;
  }
};

Views.organization = async function (root, params) {
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading…</div>`;
  try {
    const { organization, members, opportunities } = await Api.getOrganization(params.id);
    root.innerHTML = `
      <div class="card">
        <span class="badge">${organization.type}</span>
        <h3>${organization.name}</h3>
        <p class="muted">${organization.description || ''}</p>
        ${Store.isLoggedIn() ? `<button class="btn btn-primary" id="join">Join</button>` : ''}
      </div>
      <div class="card">
        <h3>Members</h3>
        ${members.map((m) => `<span class="badge">${m.name} <span class="muted">(${m.role})</span></span>`).join(' ')}
      </div>
      <div class="card">
        <h3>Open recruitments</h3>
        ${opportunities.length ? opportunities.map((o) => `
          <div class="result-row">
            <div><strong>${o.title}</strong> <span class="badge">${o.type}</span></div>
          </div>
        `).join('') : '<p class="muted">None yet.</p>'}
      </div>
      ${Store.isLoggedIn() ? `
      <div class="card">
        <h3>Recruit volunteers</h3>
        <div id="recruit-msg"></div>
        <input class="input" id="r-title" placeholder="Role / title" />
        <textarea class="input" id="r-desc" rows="2" placeholder="What you need"></textarea>
        <input class="input" id="r-skills" placeholder="Skills (comma-separated)" />
        <button class="btn btn-primary" id="recruit">Post recruitment</button>
      </div>` : ''}
    `;
    if (root.querySelector('#join')) {
      root.querySelector('#join').onclick = async () => {
        await Api.joinOrganization(organization.id);
        App.navigate('organization', { id: organization.id });
      };
    }
    if (root.querySelector('#recruit')) {
      root.querySelector('#recruit').onclick = async () => {
        const title = root.querySelector('#r-title').value.trim();
        const description = root.querySelector('#r-desc').value.trim();
        const skillsNeeded = root.querySelector('#r-skills').value.split(',').map((s) => s.trim()).filter(Boolean);
        const msg = root.querySelector('#recruit-msg');
        try {
          const { opportunity } = await Api.recruit(organization.id, { title, description, skillsNeeded });
          msg.innerHTML = `<div class="info-box">Posted. <a href="#opportunity?id=${opportunity.id}" style="color:var(--cyan);">View</a></div>`;
        } catch (e) {
          msg.innerHTML = `<div class="error-box">${e.message}</div>`;
        }
      };
    }
  } catch (e) {
    root.innerHTML = `<div class="error-box">${e.message}</div>`;
  }
};
