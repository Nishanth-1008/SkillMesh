const Views = {};

function h(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

// ---------- Home ----------
Views.home = function (root) {
  root.innerHTML = `
    <div class="hero">
      <h1>Every Community Already Has the People It Needs</h1>
      <p>Describe your problem in plain language. SkillMesh discovers the right people to solve it —
      by reasoning over a living community knowledge graph instead of keyword search.</p>
      <button class="btn btn-primary" id="cta-search">Try AI Search</button>
      <button class="btn" id="cta-communities">Browse Communities</button>
    </div>
    <div class="grid">
      <div class="card"><h3>AI Community Search</h3><p class="muted">Search using natural language instead of filters.</p></div>
      <div class="card"><h3>Hidden Expert Discovery</h3><p class="muted">Find skilled people even if they never listed those skills.</p></div>
      <div class="card"><h3>Living Knowledge Graph</h3><p class="muted">Every person, skill, and community becomes a connected node.</p></div>
    </div>
  `;
  root.querySelector('#cta-search').onclick = () => App.navigate('search');
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
      <p class="muted">Demo accounts (seeded): raj@example.com / password123, sneha@example.com, arjun@example.com, priya@example.com, kabir@example.com — all use password123.</p>
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
  root.innerHTML = `<p class="muted">Loading your profile…</p>`;
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

  root.innerHTML = `
    <div class="card">
      <h3>${profile.name}</h3>
      <p class="muted">${profile.location || 'No location set'} · availability: ${profile.availability || 'unknown'}</p>
      <p><strong>Skills:</strong><br/>${skillBadges}</p>
      <p><strong>Communities:</strong><br/>${communityBadges}</p>
    </div>
    ${editable ? `
    <div class="card">
      <h3>Add a skill</h3>
      <div id="msg"></div>
      <div style="display:flex;gap:10px;">
        <input class="input" id="skill-name" placeholder="e.g. robotics, first aid, design" style="flex:2;" />
        <select class="input" id="skill-level" style="flex:1;">
          <option value="beginner">beginner</option>
          <option value="intermediate" selected>intermediate</option>
          <option value="expert">expert</option>
        </select>
        <button class="btn btn-primary" id="add-skill">Add</button>
      </div>
    </div>` : ''}
  `;

  if (editable) {
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
  }
}

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
    list.innerHTML = `<p class="muted">Loading…</p>`;
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
  root.innerHTML = `<p class="muted">Loading…</p>`;
  try {
    const { community, members } = await Api.getCommunity(params.id);
    root.innerHTML = `
      <div class="card">
        <h3>${community.name}</h3>
        <p class="muted">${community.description || ''}</p>
        <p class="muted">${community.memberCount} members</p>
        ${Store.isLoggedIn() ? `<button class="btn btn-primary" id="join">Join</button> <button class="btn" id="search-here">AI search within this community</button>` : ''}
      </div>
      <div class="card">
        <h3>Members</h3>
        ${members.map((m) => `<span class="badge">${m.name} <span class="muted">(${m.role})</span></span>`).join(' ') || '<span class="muted">No members yet.</span>'}
      </div>
      <div class="card">
        <h3>Knowledge graph</h3>
        <div id="graph-container"><p class="muted">Loading graph…</p></div>
      </div>
    `;
    if (Store.isLoggedIn()) {
      root.querySelector('#join').onclick = async () => { await Api.joinCommunity(community.id); App.navigate('community', { id: community.id }); };
      root.querySelector('#search-here').onclick = () => App.navigate('search', { communityId: community.id });
    }
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
      <p class="muted">Natural language in, ranked people out. Try: "I need someone to teach robotics", "emergency electrician needed now", or "build me a hackathon team".</p>
      ${!Store.isLoggedIn() ? '<div class="error-box">Log in to run a search (search is scoped to your account).</div>' : ''}
      <textarea class="input" id="query" rows="2" placeholder="I need someone to teach robotics"></textarea>
      <button class="btn btn-primary" id="run" ${!Store.isLoggedIn() ? 'disabled' : ''}>Search</button>
    </div>
    <div id="results"></div>
  `;
  root.querySelector('#run').onclick = async () => {
    const query = root.querySelector('#query').value.trim();
    const results = root.querySelector('#results');
    if (!query) return;
    results.innerHTML = `<p class="muted">Thinking…</p>`;
    try {
      const data = await Api.search({ query, communityId: params && params.communityId });
      renderSearchResults(results, data);
    } catch (e) {
      results.innerHTML = `<div class="error-box">${e.message}</div>`;
    }
  };
};

function renderSearchResults(container, data) {
  const { understanding, results } = data;
  const skillBadges = understanding.skills.map((s) => `<span class="badge badge-skill">${s}</span>`).join(' ') || '<span class="muted">none detected</span>';
  container.innerHTML = `
    <div class="card">
      <p class="muted">Intent: <strong>${understanding.intent.replace('_', ' ')}</strong>
        ${understanding.urgent ? '<span class="badge badge-urgent">urgent</span>' : ''}
      </p>
      <p class="muted">Detected skills: ${skillBadges}</p>
    </div>
    <div class="card">
      <h3>${results.length} match${results.length === 1 ? '' : 'es'}</h3>
      ${results.length === 0 ? '<p class="muted">No matches yet — try adding skills to some profiles, or rephrase your request.</p>' : ''}
      ${results.map((r) => `
        <div class="result-row">
          <div>
            <strong>${r.user.name}</strong>
            <p class="muted" style="margin:4px 0;">${r.user.location || 'Location unknown'} · ${r.user.availability}</p>
            <div>${r.skills.map((s) => `<span class="badge ${r.matchedSkills.includes(s) ? 'badge-matched' : 'badge-skill'}">${s}</span>`).join(' ')}</div>
          </div>
          <div class="score-pill">score ${r.score}</div>
        </div>
      `).join('')}
    </div>
  `;
}
