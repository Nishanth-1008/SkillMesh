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
        <button class="btn btn-primary" id="cta-search"><i data-lucide="sparkles" style="width: 14px; height: 14px; margin-right: 4px;"></i> Try AI Search</button>
        <button class="btn" id="cta-teams">Build a Team</button>
        <button class="btn" id="cta-communities">Browse Communities</button>
      </div>
    </div>
    <div class="section-title">What makes SkillMesh different</div>
    <div class="grid">
      <div class="card">
        <div class="card-icon"><i data-lucide="message-square" style="width: 18px; height: 18px; vertical-align: middle;"></i></div>
        <h3>AI Community Search</h3>
        <p class="muted">Search using natural language instead of filters — describe the problem, not the profile.</p>
      </div>
      <div class="card">
        <div class="card-icon"><i data-lucide="users" style="width: 18px; height: 18px; vertical-align: middle;"></i></div>
        <h3>AI Team Builder</h3>
        <p class="muted">Describe a project goal. SkillMesh balances skills, availability, and prior collaborations.</p>
      </div>
      <div class="card">
        <div class="card-icon"><i data-lucide="star" style="width: 18px; height: 18px; vertical-align: middle;"></i></div>
        <h3>Trust &amp; Reputation</h3>
        <p class="muted">Endorsements, badges, and contribution history influence every recommendation.</p>
      </div>
      <div class="card">
        <div class="card-icon"><i data-lucide="target" style="width: 18px; height: 18px; vertical-align: middle;"></i></div>
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
      <div class="password-wrap">
        <input class="input" id="password" type="password" placeholder="password123" />
        <button type="button" class="pw-toggle" id="pw-toggle" title="Show password" aria-label="Show password"><i data-lucide="eye"></i></button>
      </div>
      <button class="btn btn-primary" id="submit" style="width:100%;">Log in</button>
      <p class="muted" style="margin-top:14px;">No account? <a href="#" id="go-register" style="color:var(--cyan);">Register</a></p>
      <p class="muted">Demo: raj@example.com / password123 (also sneha, arjun, priya, kabir @example.com)</p>
    </div>
  `;
  root.querySelector('#go-register').onclick = (e) => { e.preventDefault(); App.navigate('register'); };
  root.querySelector('#pw-toggle').onclick = (e) => {
    const input = root.querySelector('#password');
    const btn = e.currentTarget;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.innerHTML = show ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
    btn.title = show ? 'Hide password' : 'Show password';
    btn.setAttribute('aria-label', btn.title);
    input.focus();
    window.lucide?.createIcons();
  };
  root.querySelector('#submit').onclick = async () => {
    const email = root.querySelector('#email').value.trim();
    const password = root.querySelector('#password').value;
    const msg = root.querySelector('#msg');
    const btn = root.querySelector('#submit');
    // Double-submit lock: disable immediately so rapid clicks can't fire
    // duplicate login requests.
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Logging in…`;
    try {
      const { token, user } = await Api.login({ email, password });
      Store.setToken(token);
      Store.setUser(user);
      App.refreshNav();
      App.navigate('dashboard');
    } catch (e) {
      msg.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
      btn.disabled = false;
      btn.innerHTML = `Log in`;
    }
  };
};

Views.register = function (root) {
  root.innerHTML = `
    <div class="card" style="max-width:420px;margin:40px auto;">
      <h3>Create your profile</h3>
      <div id="msg"></div>
      <label>Name</label>
      <input class="input" id="name" placeholder="Your name" autocomplete="name" />
      <label>Email</label>
      <input class="input" id="email" type="email" placeholder="you@example.com" autocomplete="email" />
      <label>Password</label>
      <div class="password-wrap">
        <input class="input" id="password" type="password" placeholder="8+ characters with a number &amp; symbol" autocomplete="new-password" />
        <button type="button" class="pw-toggle" id="pw-toggle" title="Show password" aria-label="Show password"><i data-lucide="eye"></i></button>
      </div>
      <div class="pwd-rules" id="pwd-rules" hidden>
        <div class="pwd-rule" data-rule="length"><span class="pwd-rule-icon">○</span> At least 8 characters</div>
        <div class="pwd-rule" data-rule="upper"><span class="pwd-rule-icon">○</span> One uppercase letter</div>
        <div class="pwd-rule" data-rule="lower"><span class="pwd-rule-icon">○</span> One lowercase letter</div>
        <div class="pwd-rule" data-rule="number"><span class="pwd-rule-icon">○</span> One number</div>
        <div class="pwd-rule" data-rule="special"><span class="pwd-rule-icon">○</span> One special character (e.g. ! @ # $)</div>
      </div>
      <div class="pwd-meter" id="pwd-meter" hidden><div class="pwd-meter-fill" id="pwd-meter-fill"></div></div>
      <p class="pwd-meter-label" id="pwd-meter-label" hidden></p>
      <label>Location (optional)</label>
      <input class="input" id="location" placeholder="e.g. Greenwood Sector 4" autocomplete="address-level2" />
      <button class="btn btn-primary" id="submit" style="width:100%;" disabled>Register</button>
      <p class="muted" style="margin-top:14px;">Already have an account? <a href="#" id="go-login" style="color:var(--cyan);">Log in</a></p>
    </div>
  `;
  root.querySelector('#go-login').onclick = (e) => { e.preventDefault(); App.navigate('login'); };
  root.querySelector('#pw-toggle').onclick = (e) => {
    const input = root.querySelector('#password');
    const btn = e.currentTarget;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.innerHTML = show ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
    btn.title = show ? 'Hide password' : 'Show password';
    btn.setAttribute('aria-label', btn.title);
    input.focus();
    window.lucide?.createIcons();
  };

  const pwd = root.querySelector('#password');
  const rulesEl = root.querySelector('#pwd-rules');
  const meterEl = root.querySelector('#pwd-meter');
  const meterFill = root.querySelector('#pwd-meter-fill');
  const meterLabel = root.querySelector('#pwd-meter-label');
  const btn = root.querySelector('#submit');
  const checks = [
    { rule: 'length', test: (v) => v.length >= 8 },
    { rule: 'upper', test: (v) => /[A-Z]/.test(v) },
    { rule: 'lower', test: (v) => /[a-z]/.test(v) },
    { rule: 'number', test: (v) => /[0-9]/.test(v) },
    { rule: 'special', test: (v) => /[^A-Za-z0-9]/.test(v) },
  ];
  const strength = (met) => (met <= 1 ? 0 : met <= 3 ? 1 : met === 4 ? 2 : 3);
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
  const validate = () => {
    const v = pwd.value;
    const met = {};
    checks.forEach((c) => { met[c.rule] = c.test(v); });
    checks.forEach((c) => {
      const row = rulesEl.querySelector(`[data-rule="${c.rule}"]`);
      row.classList.toggle('ok', met[c.rule]);
      row.querySelector('.pwd-rule-icon').textContent = met[c.rule] ? '✓' : '○';
    });
    const total = checks.filter((c) => met[c.rule]).length;
    const lv = strength(total);
    meterFill.className = `pwd-meter-fill lv${lv}`;
    meterFill.style.width = `${25 + lv * 25}%`;
    meterLabel.textContent = `Strength: ${strengthLabels[lv]}`;
    btn.disabled = total !== checks.length;
    return total === checks.length;
  };
  pwd.onfocus = () => {
    rulesEl.hidden = false;
    meterEl.hidden = false;
    meterLabel.hidden = false;
    validate();
  };
  pwd.oninput = validate;
  pwd.onblur = () => {
    if (!pwd.value) {
      rulesEl.hidden = true;
      meterEl.hidden = true;
      meterLabel.hidden = true;
    }
  };

  root.querySelector('#submit').onclick = async () => {
    const name = root.querySelector('#name').value.trim();
    const email = root.querySelector('#email').value.trim();
    const password = root.querySelector('#password').value;
    const location = root.querySelector('#location').value.trim();
    const msg = root.querySelector('#msg');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Creating account…`;
    try {
      const { token, user } = await Api.register({ name, email, password, location: location || undefined });
      Store.setToken(token);
      Store.setUser(user);
      App.refreshNav();
      App.navigate('dashboard');
    } catch (e) {
      msg.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
      btn.innerHTML = `Register`;
      btn.disabled = !validate();
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
    root.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
  }
};

function renderProfile(root, profile, editable) {
  const skillBadges = profile.skills.length
    ? profile.skills.map((s) => `<span class="badge badge-skill">${escapeHtml(s.skill)} <span class="muted">(${escapeHtml(s.level)})</span>${editable ? ` <a href="#" data-remove="${s.id}" style="color:#ff8a8a;"><i data-lucide="x" style="width: 12px; height: 12px; vertical-align: middle;"></i></a>` : ''}</span>`).join(' ')
    : `<span class="muted">No skills listed yet.</span>`;
  const communityBadges = profile.communities.length
    ? profile.communities.map((c) => `<span class="badge">${escapeHtml(c.name)} <span class="muted">(${escapeHtml(c.role)})</span></span>`).join(' ')
    : `<span class="muted">Not a member of any community yet.</span>`;
  const trustScore = profile.trust ? profile.trust.score : 0;
  const badges = (profile.badges || []).map((b) => `<span class="badge badge-matched">${escapeHtml(b.badge)}</span>`).join(' ') || '<span class="muted">No badges yet</span>';
  const endorsements = (profile.endorsements || []).length
    ? profile.endorsements.map((e) => `<li><strong>${escapeHtml(e.skill)}</strong> — ${e.from ? escapeHtml(e.from.name) : 'someone'}${e.note ? `: "${escapeHtml(e.note)}"` : ''}</li>`).join('')
    : '<li class="muted">No endorsements yet</li>';

  root.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
        <div>
          <h3 style="margin-bottom:4px;"><span class="avatar-chip">${escapeHtml((profile.name || '?').charAt(0).toUpperCase())}</span>${escapeHtml(profile.name)}</h3>
          <p class="muted" style="margin:0; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span><i data-lucide="map-pin" style="width: 14px; height: 14px; vertical-align: middle;"></i> ${escapeHtml(profile.location || 'No location set')}</span>
            ${availabilityBadgeHtml(profile.availability)}
          </p>
        </div>
        ${editable ? `
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="btn btn-primary" id="open-edit-profile-modal"><i data-lucide="edit-3" style="width: 14px; height: 14px; vertical-align: middle;"></i> Edit Profile</button>
          <button class="btn" id="profile-inbox-btn"><i data-lucide="inbox" style="width: 14px; height: 14px; vertical-align: middle;"></i> Inbox & Alerts</button>
          <button class="btn btn-danger" id="profile-logout-btn"><i data-lucide="log-out" style="width: 14px; height: 14px; vertical-align: middle;"></i> Log out</button>
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
      <h3>Endorse someone</h3>
      <div id="endorse-msg"></div>
      <input class="input" id="endorse-user" placeholder="User ID (from a profile or search result)" />
      <input class="input" id="endorse-skill" placeholder="Skill to endorse" />
      <input class="input" id="endorse-note" placeholder="Optional note" />
      <button class="btn btn-primary" id="endorse-btn">Endorse</button>
    </div>` : `
    ${Store.isLoggedIn() && Store.getUser() && Store.getUser().id !== profile.id ? `
    <div class="card">
      <h3>Endorse ${escapeHtml(profile.name)}</h3>
      <div id="endorse-msg"></div>
      <input class="input" id="endorse-skill" placeholder="Skill to endorse" />
      <input class="input" id="endorse-note" placeholder="Optional note" />
      <button class="btn btn-primary" id="endorse-btn">Endorse</button>
    </div>` : ''}`}
  `;

  if (editable) {
    const inboxBtn = root.querySelector('#profile-inbox-btn');
    if (inboxBtn) inboxBtn.onclick = () => App.navigate('messages');
    
    const logoutBtn = root.querySelector('#profile-logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        Store.clearToken();
        Store.setUser(null);
        App.refreshNav();
        App.navigate('home');
      };
    }

    const editBtn = root.querySelector('#open-edit-profile-modal');
    if (editBtn) {
      editBtn.onclick = () => {
        const modalHtml = `
          <div id="profile-modal-msg"></div>
          <label class="muted">Name</label>
          <input class="input" id="edit-name" value="${escapeAttr(profile.name || '')}" />
          <label class="muted">Location</label>
          <input class="input" id="edit-location" value="${escapeAttr(profile.location || '')}" placeholder="e.g. Greenwood Sector 4" />
          <label class="muted">Availability</label>
          <select class="input" id="edit-availability">
            <option value="available" ${normalizeAvailability(profile.availability) === 'available' ? 'selected' : ''}>Available</option>
            <option value="busy" ${normalizeAvailability(profile.availability) === 'busy' ? 'selected' : ''}>Busy</option>
            <option value="away" ${normalizeAvailability(profile.availability) === 'away' ? 'selected' : ''}>Away</option>
          </select>
          <label class="muted">Bio</label>
          <textarea class="input" id="edit-bio" rows="2" placeholder="Short bio">${escapeHtml(profile.bio || '')}</textarea>
          <label class="muted">Interests (comma-separated)</label>
          <input class="input" id="edit-interests" value="${escapeAttr(Array.isArray(profile.interests) ? profile.interests.join(', ') : (profile.interests || ''))}" />
          
          <hr class="divider" style="margin:16px 0;" />
          <h4 style="margin:0 0 10px;">Add a Skill</h4>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
            <input class="input" id="modal-skill-name" placeholder="e.g. robotics, first aid, design" style="flex:2;min-width:160px;" />
            <select class="input" id="modal-skill-level" style="flex:1;min-width:120px;">
              <option value="beginner">beginner</option>
              <option value="intermediate" selected>intermediate</option>
              <option value="expert">expert</option>
            </select>
            <button class="btn btn-sm" id="modal-add-skill-btn">+ Add Skill</button>
          </div>
          <div id="modal-skill-msg"></div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
            <button class="btn" id="cancel-edit-profile">Cancel</button>
            <button class="btn btn-primary" id="save-edit-profile">Save Profile</button>
          </div>
        `;

        App.openModal(modalHtml, '<i data-lucide="edit-3" style="width: 14px; height: 14px; vertical-align: middle;"></i> Edit Your Profile');

        const modalContainer = document.getElementById('modal-container');
        const cancelBtn = modalContainer.querySelector('#cancel-edit-profile');
        const saveBtn = modalContainer.querySelector('#save-edit-profile');
        const addSkillBtn = modalContainer.querySelector('#modal-add-skill-btn');
        const msgEl = modalContainer.querySelector('#profile-modal-msg');
        const skillMsgEl = modalContainer.querySelector('#modal-skill-msg');

        if (cancelBtn) cancelBtn.onclick = () => modalContainer.classList.add('hidden');

        if (addSkillBtn) {
          addSkillBtn.onclick = async () => {
            const skill = modalContainer.querySelector('#modal-skill-name').value.trim();
            const level = modalContainer.querySelector('#modal-skill-level').value;
            if (!skill) return;
            try {
              await Api.addMySkill({ skill, level });
              modalContainer.querySelector('#modal-skill-name').value = '';
              skillMsgEl.innerHTML = `<div class="info-box" style="padding:6px 12px;font-size:12px;">Skill added!</div>`;
            } catch (err) {
              skillMsgEl.innerHTML = `<div class="error-box" style="padding:6px 12px;font-size:12px;">${escapeHtml(err.message)}</div>`;
            }
          };
        }

        if (saveBtn) {
          saveBtn.onclick = async () => {
            const name = modalContainer.querySelector('#edit-name').value.trim();
            const location = modalContainer.querySelector('#edit-location').value.trim();
            const availability = modalContainer.querySelector('#edit-availability').value;
            const bio = modalContainer.querySelector('#edit-bio').value.trim();
            const interestsRaw = modalContainer.querySelector('#edit-interests').value.trim();
            const interests = interestsRaw ? interestsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];

            saveBtn.disabled = true;
            saveBtn.innerHTML = `<span class="spinner"></span> Saving…`;

            try {
              const { profile: updated } = await Api.updateMyProfile({ name, location, availability, bio, interests });
              const current = Store.getUser() || {};
              Store.setUser({
                ...current,
                name: updated.name,
                location: updated.location,
                availability: updated.availability,
                bio: updated.bio,
                interests: updated.interests,
              });
              modalContainer.classList.add('hidden');
              App.showToast('Profile updated successfully!');
              App.refreshNav();
              App.navigate('dashboard');
            } catch (err) {
              msgEl.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
              saveBtn.disabled = false;
              saveBtn.innerHTML = `Save Profile`;
            }
          };
        }
      };
    }

    const endorseBtn = root.querySelector('#endorse-btn');
    if (endorseBtn) {
      endorseBtn.onclick = async () => {
        const toUserId = root.querySelector('#endorse-user').value.trim();
        const skill = root.querySelector('#endorse-skill').value.trim();
        const note = root.querySelector('#endorse-note').value.trim();
        const msg = root.querySelector('#endorse-msg');
        try {
          await Api.endorse({ toUserId, skill, note });
          msg.innerHTML = `<div class="info-box">Endorsement sent.</div>`;
        } catch (e) {
          msg.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
        }
      };
    }
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
        msg.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
      }
    };
  }

  root.querySelectorAll('[data-remove]').forEach((el) => {
    el.onclick = async (ev) => {
      ev.preventDefault();
      await Api.removeMySkill(el.getAttribute('data-remove'));
      App.navigate('dashboard');
    };
  });

  window.lucide?.createIcons();
}

async function handleJoinCommunity(communityId, communityName, onSuccess) {
  try {
    const res = await Api.joinCommunity(communityId);
    if (res.requiresSwitch) {
      const modalContent = `
        <div class="info-box" style="margin-bottom:14px; border-color:var(--amber);">
          <i data-lucide="alert-triangle" style="width: 14px; height: 14px; color: var(--amber); vertical-align: middle;"></i> You are currently an active member of <strong>${escapeHtml(res.currentCommunity.name)}</strong>.
        </div>
        <p>SkillMesh enforces <strong>1 active community</strong> per user. Joining <strong>${escapeHtml(res.targetCommunity.name)}</strong> will automatically switch your membership.</p>
        <p class="muted" style="font-size:12.5px;">Note: If your previous community has 0 remaining members, it will be automatically dissolved.</p>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:18px;">
          <button class="btn" id="cancel-switch-btn">Cancel</button>
          <button class="btn btn-primary" id="confirm-switch-btn">Switch Community</button>
        </div>
      `;
      App.openModal(modalContent, '<i data-lucide="refresh-cw" style="width: 14px; height: 14px; vertical-align: middle;"></i> Switch Active Community');

      const modalContainer = document.getElementById('modal-container');
      const cancelBtn = modalContainer.querySelector('#cancel-switch-btn');
      const confirmBtn = modalContainer.querySelector('#confirm-switch-btn');

      if (cancelBtn) {
        cancelBtn.onclick = () => modalContainer.classList.add('hidden');
      }
      if (confirmBtn) {
        confirmBtn.onclick = async () => {
          confirmBtn.disabled = true;
          confirmBtn.innerHTML = `<span class="spinner"></span> Switching…`;
          try {
            await Api.joinCommunity(communityId, { confirmSwitch: true });
            modalContainer.classList.add('hidden');
            App.showToast(`Switched active community to ${res.targetCommunity.name}!`);
            if (onSuccess) onSuccess();
          } catch (err) {
            App.showToast(err.message || 'Failed to switch community.');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = `Switch Community`;
          }
        };
      }
      return;
    }

    App.showToast(`Joined ${communityName || 'community'} successfully!`);
    if (onSuccess) onSuccess();
  } catch (err) {
    App.showToast(err.message || 'Failed to join community.');
  }
}

Views.profile = async function (root, params) {
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading…</div>`;
  try {
    const { profile } = await Api.getProfile(params.id);
    renderProfile(root, profile, false);
  } catch (e) {
    root.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
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
        <h3>${escapeHtml(c.name)}</h3>
        <p class="muted">${escapeHtml(c.description || 'No description.')}</p>
        <p class="muted">${c.memberCount} member${c.memberCount === 1 ? '' : 's'}</p>
        <div class="card-actions">
          <button class="btn" data-view="${c.id}">View</button>
          ${Store.isLoggedIn() ? `<button class="btn btn-primary" data-join="${c.id}" data-name="${escapeAttr(c.name)}">Join</button>` : ''}
        </div>
      </div>
    `).join('');
    list.querySelectorAll('[data-view]').forEach((btn) => {
      btn.onclick = () => App.navigate('community', { id: btn.getAttribute('data-view') });
    });
    list.querySelectorAll('[data-join]').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-join');
        const name = btn.getAttribute('data-name');
        handleJoinCommunity(id, name, () => App.navigate('community', { id }));
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
        msg.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
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
        <h3>${escapeHtml(community.name)}</h3>
        <p class="muted">${escapeHtml(community.description || '')}</p>
        <p class="muted">${community.memberCount} members</p>
        ${Store.isLoggedIn() ? `
          <div class="card-actions">
            ${!myMembership ? `<button class="btn btn-primary" id="join">Join</button>` : ''}
            ${myMembership ? `<button class="btn btn-danger" id="leave">Leave Community</button>` : ''}
            <button class="btn" id="search-here">AI search here</button>
            <button class="btn" id="team-here">Build team here</button>
            <button class="btn" id="analytics-here">Community intel</button>
          </div>
        ` : ''}
      </div>
      <div class="card">
        <h3>Members</h3>
        ${members.map((m) => `<span class="badge" style="cursor:pointer;" data-profile="${m.id}">${escapeHtml(m.name)} <span class="muted">(${escapeHtml(m.role)})</span></span>`).join(' ') || '<span class="muted">No members yet.</span>'}
      </div>
      <div class="card">
        <h3>Knowledge graph</h3>
        <div id="graph-container"><div class="loading-line"><span class="spinner"></span> Loading graph…</div></div>
      </div>
    `;
    if (Store.isLoggedIn()) {
      if (root.querySelector('#join')) {
        root.querySelector('#join').onclick = () => {
          handleJoinCommunity(community.id, community.name, () => App.navigate('community', { id: community.id }));
        };
      }
      if (root.querySelector('#leave')) {
        root.querySelector('#leave').onclick = async () => {
          const res = await Api.leaveCommunity(community.id);
          if (res.dissolved) {
            App.showToast(`Community "${community.name}" dissolved as member count hit 0.`);
          } else {
            App.showToast(`Left community "${community.name}".`);
          }
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
    root.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
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
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <label class="muted" title="Semantic search ranks by meaning, not just keywords — e.g. 'school STEM club' finds robotics/teaching mentors."><input type="checkbox" id="magic" /> Semantic (magic search)</label>
        <button class="btn btn-primary" id="run" ${!Store.isLoggedIn() ? 'disabled' : ''}>Search</button>
      </div>
    </div>
    <div id="results"></div>
  `;
  const runSearch = async (query, magic) => {
    const results = root.querySelector('#results');
    results.innerHTML = `<div class="loading-line"><span class="spinner"></span> Reasoning over the community graph…</div>`;
    try {
      const payload = { query, communityId: params && params.communityId };
      if (magic) {
        const data = await Api.semanticSearch(payload);
        renderSemanticResults(results, data);
      } else {
        const data = await Api.search(payload);
        renderSearchResults(results, data);
      }
    } catch (e) {
      results.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
    }
  };
  root.querySelector('#run').onclick = () => {
    const query = root.querySelector('#query').value.trim();
    if (!query) return;
    runSearch(query, root.querySelector('#magic').checked);
  };
  const prefilled = params && params.q ? String(params.q) : '';
  if (prefilled) {
    root.querySelector('#query').value = prefilled;
    if (Store.isLoggedIn()) runSearch(prefilled, false);
  }
};

function renderSemanticResults(container, data) {
  const { understanding, people, opportunities, skills, projects } = data;
  const badge = data.pgVectorAvailable
    ? '<span class="badge badge-matched" title="Postgres pgvector">pgvector</span>'
    : '<span class="badge">memory cosine</span>';
  container.innerHTML = `
    <div class="card">
      <p class="muted">Intent: <strong>${escapeHtml(understanding.intent.replace('_', ' '))}</strong>
        ${badge}
        <span class="muted">· embeddings (${data.embeddingDim}-dim) · source ${escapeHtml(understanding.source || 'heuristic')}</span>
      </p>
    </div>
    <div class="card">
      <h3>People · ${people.length}</h3>
      ${!people.length ? '<div class="info-box">No semantic matches yet.</div>' : people.map((r, i) => `
        <div class="result-row">
          <div class="result-main">
            <div class="result-rank">${i + 1}</div>
            <div>
              <strong style="cursor:pointer;" data-profile="${r.user.id}">${escapeHtml(r.user.name)}</strong>
              <p class="muted" style="margin:4px 0; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span><i data-lucide="map-pin" style="width: 14px; height: 14px; vertical-align: middle;"></i> ${escapeHtml(r.user.location || 'Location unknown')}</span>
                ${availabilityBadgeHtml(r.user.availability)}
                <span class="muted">· trust ${r.trustScore}</span>
                ${r.relevant ? '' : '<span class="muted">· low relevance</span>'}
              </p>
              ${explainHtml(r, 'search')}
            </div>
          </div>
          <div class="score-pill">${r.similarity}%</div>
        </div>
      `).join('')}
    </div>
    ${opportunities.length ? `
    <div class="card">
      <h3>Opportunities · ${opportunities.length}</h3>
      ${opportunities.map((o) => `
        <div class="result-row">
          <div class="result-main">
            <div>
              <strong style="cursor:pointer;" data-opportunity="${o.opportunity.id}">${escapeHtml(o.opportunity.title)}</strong>
              <div>${(o.opportunity.skillsNeeded || []).map((s) => `<span class="badge badge-skill">${escapeHtml(s)}</span>`).join(' ')}</div>
            </div>
          </div>
          <div class="score-pill">${o.similarity}%</div>
        </div>
      `).join('')}
    </div>` : ''}
    ${skills.length ? `
    <div class="card">
      <h3>Related skills</h3>
      ${skills.map((s) => `<span class="badge badge-matched">${escapeHtml(s.skill)} <span class="muted">(${s.similarity}%)</span></span>`).join(' ')}
    </div>` : ''}
    ${projects.length ? `
    <div class="card">
      <h3>Projects · ${projects.length}</h3>
      ${projects.map((p) => `
        <div class="result-row">
          <div class="result-main">
            <strong style="cursor:pointer;" data-project="${p.project.id}">${escapeHtml(p.project.title)}</strong>
          </div>
          <div class="score-pill">${p.similarity}%</div>
        </div>
      `).join('')}
    </div>` : ''}
  `;
  container.querySelectorAll('[data-profile]').forEach((el) => {
    el.onclick = () => App.navigate('profile', { id: el.getAttribute('data-profile') });
  });
  container.querySelectorAll('[data-opportunity]').forEach((el) => {
    el.onclick = () => App.navigate('opportunity', { id: el.getAttribute('data-opportunity') });
  });
  container.querySelectorAll('[data-project]').forEach((el) => {
    el.onclick = () => App.navigate('project', { id: el.getAttribute('data-project') });
  });
  bindFeedback(container, 'search');
}

// ---------- Phase 2: explainability & feedback controls ----------
function explainHtml(r) {
  const lines = Array.isArray(r.explain) && r.explain.length ? r.explain : [];
  const details = lines.length
    ? `
      <details class="explain">
        <summary>Why this match?</summary>
        <ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
      </details>`
    : '';
  const feedback = Store.isLoggedIn()
    ? `
      <div class="feedback-row" data-target="${r.user.id}">
        <button class="btn btn-sm" data-thumb="up">Good match</button>
        <button class="btn btn-sm" data-thumb="down">Poor match</button>
        <span class="muted feedback-msg"></span>
      </div>`
    : '';
  return details + feedback;
}

function bindFeedback(rootEl, context) {
  rootEl.querySelectorAll('[data-thumb]').forEach((btn) => {
    btn.onclick = async () => {
      const row = btn.closest('[data-target]');
      if (!row) return;
      const targetId = row.getAttribute('data-target');
      const rating = btn.getAttribute('data-thumb');
      const msg = row.querySelector('.feedback-msg');
      try {
        const res = await Api.feedback({ targetType: 'user', targetId, rating, context: context || 'search' });
        row.querySelectorAll('[data-thumb]').forEach((b) => b.classList.remove('btn-primary'));
        btn.classList.add('btn-primary');
        msg.textContent = res.rating === 'up'
          ? 'Thanks — we will surface them more.'
          : 'Thanks — we will show fewer like this.';
      } catch (e) {
        msg.textContent = e.message;
      }
    };
  });
}

function renderSearchResults(container, data) {
  const { understanding, results, mode, team, hiddenExperts } = data;
  const skillBadges = understanding.skills.map((s) => `<span class="badge badge-skill">${escapeHtml(s)}</span>`).join(' ') || '<span class="muted">none detected</span>';

  let teamBlock = '';
  if (mode === 'team_builder' && team) {
    teamBlock = `
      <div class="card">
        <h3>AI Team · ${team.coverage}% skill coverage · success prediction ${team.successPrediction}%</h3>
        <p class="muted">Needed: ${escapeHtml((team.neededSkills || []).join(', ')) || '—'}
          ${team.uncoveredSkills.length ? ` · Gaps: ${escapeHtml(team.uncoveredSkills.join(', '))}` : ''}</p>
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
                <strong style="cursor:pointer;" data-profile="${h.user.id}">${escapeHtml(h.user.name)}</strong>
                <p class="muted" style="margin:4px 0;">${escapeHtml(h.reason)}</p>
                <div>${(h.inferredHits || []).map((s) => `<span class="badge badge-matched">${escapeHtml(s)}</span>`).join(' ')}</div>
              </div>
            </div>
            <div class="score-pill">trust ${h.trustScore}</div>
          </div>
        `).join('')}
      </div>`;
  }

  container.innerHTML = `
    <div class="card">
      <p class="muted">Intent: <strong>${escapeHtml(understanding.intent.replace('_', ' '))}</strong>
        ${understanding.urgent ? '<span class="badge badge-urgent">urgent</span>' : ''}
        ${mode ? `<span class="badge">${escapeHtml(mode)}</span>` : ''}
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
              <strong style="cursor:pointer;" data-profile="${r.user.id}">${escapeHtml(r.user.name)}</strong>
              <p class="muted" style="margin:4px 0; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span><i data-lucide="map-pin" style="width: 14px; height: 14px; vertical-align: middle;"></i> ${escapeHtml(r.user.location || 'Location unknown')}</span>
                ${availabilityBadgeHtml(r.user.availability)}
                ${r.trustScore != null ? `<span class="muted">· trust ${r.trustScore}</span>` : ''}
              </p>
              <div>${r.skills.map((s) => `<span class="badge ${(r.matchedSkills || []).includes(s) ? 'badge-matched' : 'badge-skill'}">${escapeHtml(s)}</span>`).join(' ')}</div>
              ${explainHtml(r, 'search')}
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
  bindFeedback(container, 'search');
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
          <p class="muted">Skills needed: ${escapeHtml((data.neededSkills || []).join(', '))}
            ${data.uncoveredSkills.length ? ` · Gaps: ${escapeHtml(data.uncoveredSkills.join(', '))}` : ''}</p>
          ${data.project ? `<p class="info-box">Project created: <a href="#project?id=${data.project.id}" style="color:var(--cyan);">${escapeHtml(data.project.title)}</a> — invites sent.</p>` : ''}
          ${data.team.map((m, i) => `
            <div class="result-row">
              <div class="result-main">
                <div class="result-rank">${i + 1}</div>
                <div>
                  <strong style="cursor:pointer;" data-profile="${m.user.id}">${escapeHtml(m.user.name)}</strong>
                  <p class="muted" style="margin:4px 0;">${escapeHtml(m.user.availability)} · trust ${m.trustScore} · covers ${escapeHtml((m.covers || []).join(', ')) || '—'}</p>
                  <div>${m.skills.map((s) => `<span class="badge badge-skill">${escapeHtml(s)}</span>`).join(' ')}</div>
                  ${explainHtml(m, 'team')}
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
      bindFeedback(results, 'team');
    } catch (e) {
      results.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
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
        msg.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
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
        <h3>${escapeHtml(p.title)}</h3>
        <p class="muted">${escapeHtml(p.description || p.goal || '')}</p>
        <p class="muted">${p.memberCount} joined · ${escapeHtml(p.status)}${p.timeline ? ` · ${escapeHtml(p.timeline)}` : ''}</p>
        <button class="btn btn-primary" data-id="${p.id}">Open</button>
      </div>
    `).join('');
    list.querySelectorAll('[data-id]').forEach((btn) => {
      btn.onclick = () => App.navigate('project', { id: btn.getAttribute('data-id') });
    });
  } catch (e) {
    root.querySelector('#list').innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
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
            <strong>${escapeHtml(m.from ? m.from.name : '?')}</strong>
            ${m.announcement ? '<span class="badge badge-urgent">announcement</span>' : ''}
            <p>${escapeHtml(m.body)}</p>
            <p class="muted" style="font-size:12px;">${new Date(m.createdAt).toLocaleString()}</p>
          </div>
        `).join('') || '<p class="muted">No messages yet.</p>';
      } catch {
        discussionHtml = '<p class="muted">Could not load discussion.</p>';
      }
    }

    root.innerHTML = `
      <div class="card">
        <h3>${escapeHtml(project.title)}</h3>
        <p class="muted">${escapeHtml(project.description || '')}</p>
        <p class="muted">Goal: ${escapeHtml(project.goal || '—')} · Status: ${escapeHtml(project.status)}${project.timeline ? ` · ${escapeHtml(project.timeline)}` : ''}</p>
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
          <span class="badge" style="cursor:pointer;" data-profile="${m.userId}">${escapeHtml(m.name)} <span class="muted">(${escapeHtml(m.role)} · ${escapeHtml(m.status)})</span></span>
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
          msg.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
        }
      };
    }
    if (root.querySelector('#send-msg')) {
      root.querySelector('#send-msg').onclick = async () => {
        const body = root.querySelector('#msg-body').value.trim();
        const announcement = root.querySelector('#announce').checked;
        if (!body) return;
        const btn = root.querySelector('#send-msg');
        btn.disabled = true;
        try {
          await Api.sendMessage({ projectId: project.id, body, announcement });
          App.navigate('project', { id: project.id });
        } catch (e) {
          btn.disabled = false;
          App.showToast(e.message || 'Failed to send message.');
        }
      };
    }
  } catch (e) {
    root.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
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
                <strong style="cursor:pointer;" data-profile="${r.user.id}">${escapeHtml(r.user.name)}</strong>
                <p class="muted" style="margin:4px 0;"><i data-lucide="map-pin" style="width: 14px; height: 14px; vertical-align: middle;"></i> ${escapeHtml(r.user.location || '—')} · trust ${r.trustScore}</p>
                <div>${(r.skills || r.matchedSkills || r.teachable || []).slice(0, 6).map((s) => `<span class="badge badge-skill">${escapeHtml(s)}</span>`).join(' ')}</div>
                ${explainHtml(r, 'recs')}
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
    bindFeedback(root, 'recs');
  } catch (e) {
    root.querySelector('#recs').innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
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
        <span class="badge">${escapeHtml(o.type)}</span>
        <h3>${escapeHtml(o.title)}</h3>
        <p class="muted">${escapeHtml(o.description || '')}</p>
        <div>${(o.skillsNeeded || []).map((s) => `<span class="badge badge-skill">${escapeHtml(s)}</span>`).join(' ')}</div>
        <p class="muted">${o.applicantCount || 0} applicants${o.matchCount ? ` · ${o.matchCount} skill match` : ''}</p>
        <div class="card-actions">
          <button class="btn" data-view="${o.id}">View</button>
          ${Store.isLoggedIn() ? `<button class="btn btn-primary" data-apply="${o.id}">Apply</button>` : ''}
        </div>
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
        msg.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
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
        <span class="badge">${escapeHtml(opportunity.type)}</span>
        <h3>${escapeHtml(opportunity.title)}</h3>
        <p class="muted">${escapeHtml(opportunity.description || '')}</p>
        <p class="muted">By ${escapeHtml(opportunity.creator ? opportunity.creator.name : '—')} · ${escapeHtml(opportunity.status)}</p>
        <div>${(opportunity.skillsNeeded || []).map((s) => `<span class="badge badge-skill">${escapeHtml(s)}</span>`).join(' ')}</div>
        ${Store.isLoggedIn() && opportunity.status === 'open' && !isCreator ? `<button class="btn btn-primary" id="apply" style="margin-top:12px;">Apply</button>` : ''}
      </div>
      <div class="card">
        <h3>Applicants (${applications.length})</h3>
        ${applications.map((a) => `
          <div class="result-row">
            <div class="result-main">
              <div>
                <strong>${escapeHtml(a.user ? a.user.name : '?')}</strong>
                <p class="muted">${escapeHtml(a.status)} · trust ${a.trustScore}${a.message ? ` · "${escapeHtml(a.message)}"` : ''}</p>
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
    root.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
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
        sender: isAnnouncement ? '<i data-lucide="megaphone" style="width: 14px; height: 14px; vertical-align: middle;"></i> System' : '<i data-lucide="bell" style="width: 14px; height: 14px; vertical-align: middle;"></i> Alert',
        avatar: isAnnouncement ? '<i data-lucide="megaphone" style="width: 14px; height: 14px; vertical-align: middle;"></i>' : '<i data-lucide="bell" style="width: 14px; height: 14px; vertical-align: middle;"></i>',
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
        sender: '<i data-lucide="sprout" style="width: 14px; height: 14px; vertical-align: middle;"></i> Community',
        avatar: '<i data-lucide="users" style="width: 14px; height: 14px; vertical-align: middle;"></i>',
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
    let currentFilter = 'all'; // 'all', 'unread', 'read'
    let searchQuery = '';
    let selectedItemIds = new Set();

    const renderInbox = () => {
      // Filter by active category tab
      let items = allInboxItems.filter((item) => item.category === currentTab);

      // Filter by quick chip (All, Unread, Read)
      if (currentFilter === 'unread') {
        items = items.filter((item) => !item.read);
      } else if (currentFilter === 'read') {
        items = items.filter((item) => item.read);
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
              <button class="btn btn-primary" id="mark-all-read-cta"><i data-lucide="check-check" style="width: 14px; height: 14px; margin-right: 4px;"></i> Mark All as Read</button>
            </div>
          </div>

          <!-- 1. Dedicated Tabs: Primary, Updates, Social -->
          <div class="inbox-tabs">
            <button class="inbox-tab ${currentTab === 'primary' ? 'active' : ''}" data-tab="primary">
              <i data-lucide="message-circle" style="width: 14px; height: 14px; vertical-align: middle;"></i> Primary ${primaryCount ? `<span class="badge badge-urgent">${primaryCount}</span>` : ''}
            </button>
            <button class="inbox-tab ${currentTab === 'updates' ? 'active' : ''}" data-tab="updates">
              <i data-lucide="megaphone" style="width: 14px; height: 14px; vertical-align: middle;"></i> Updates ${updatesCount ? `<span class="badge badge-urgent">${updatesCount}</span>` : ''}
            </button>
            <button class="inbox-tab ${currentTab === 'social' ? 'active' : ''}" data-tab="social">
              <i data-lucide="users" style="width: 14px; height: 14px; vertical-align: middle;"></i> Social & Promo ${socialCount ? `<span class="badge badge-urgent">${socialCount}</span>` : ''}
            </button>
          </div>
        </div>

        <!-- 2. Quick Actions & Filtering Bar -->
        <div class="inbox-filter-bar">
          <div class="filter-chips" role="tablist" aria-label="Message status filters">
            <button type="button" class="filter-chip ${currentFilter === 'all' ? 'active' : ''}" data-filter="all" role="tab" aria-selected="${currentFilter === 'all'}">All</button>
            <button type="button" class="filter-chip ${currentFilter === 'unread' ? 'active' : ''}" data-filter="unread" role="tab" aria-selected="${currentFilter === 'unread'}">Unread</button>
            <button type="button" class="filter-chip ${currentFilter === 'read' ? 'active' : ''}" data-filter="read" role="tab" aria-selected="${currentFilter === 'read'}">Read</button>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <input type="text" class="input inbox-search-input" id="inbox-search" placeholder="Search messages..." value="${escapeAttr(searchQuery)}" />
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
                        <span>${escapeHtml(item.title)}</span>
                        ${item.starred ? '<span style="color:var(--amber);"><i data-lucide="star" style="width: 18px; height: 18px; vertical-align: middle;"></i></span>' : ''}
                      </div>
                      <p class="card-preview">${escapeHtml(item.preview || 'No text preview available.')}</p>
                    </div>

                    <!-- Top Right: Relative Timestamp & Hover Action Bar -->
                    <div class="card-top-right">
                      <span class="card-timestamp">${formatRelativeTime(item.createdAt)}</span>
                      <div class="card-action-bar">
                        <button class="card-action-btn" data-act="star" data-id="${item.id}" title="Star/Unstar">${item.starred ? '<i data-lucide="star" style="width: 14px; height: 14px; fill: var(--amber); color: var(--amber); vertical-align: middle;"></i>' : '<i data-lucide="star" style="width: 14px; height: 14px; vertical-align: middle;"></i>'}</button>
                        <button class="card-action-btn" data-act="read" data-id="${item.id}" title="${item.read ? 'Mark Unread' : 'Mark Read'}">${item.read ? '<i data-lucide="mail-open" style="width: 14px; height: 14px; vertical-align: middle;"></i>' : '<i data-lucide="mail" style="width: 14px; height: 14px; vertical-align: middle;"></i>'}</button>
                        <button class="card-action-btn" data-act="delete" data-id="${item.id}" title="Delete/Archive"><i data-lucide="trash-2" style="width: 14px; height: 14px; vertical-align: middle;"></i></button>
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
            msg.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
          }
        };
      }

      window.lucide?.createIcons();
    };

    renderInbox();
  } catch (e) {
    root.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
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
        msg.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
      }
    };
  }
  try {
    const { organizations } = await Api.listOrganizations();
    const list = root.querySelector('#list');
    list.innerHTML = organizations.length ? organizations.map((o) => `
      <div class="card">
        <span class="badge">${escapeHtml(o.type)}</span>
        <h3>${escapeHtml(o.name)}</h3>
        <p class="muted">${escapeHtml(o.description || '')}</p>
        <p class="muted">${o.memberCount} members</p>
        <button class="btn btn-primary" data-id="${o.id}">Open</button>
      </div>
    `).join('') : '<p class="muted">No organizations yet.</p>';
    list.querySelectorAll('[data-id]').forEach((btn) => {
      btn.onclick = () => App.navigate('organization', { id: btn.getAttribute('data-id') });
    });
  } catch (e) {
    root.querySelector('#list').innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
  }
};

Views.organization = async function (root, params) {
  root.innerHTML = `<div class="loading-line"><span class="spinner"></span> Loading…</div>`;
  try {
    const { organization, members, opportunities } = await Api.getOrganization(params.id);
    root.innerHTML = `
      <div class="card">
        <span class="badge">${escapeHtml(organization.type)}</span>
        <h3>${escapeHtml(organization.name)}</h3>
        <p class="muted">${escapeHtml(organization.description || '')}</p>
        ${Store.isLoggedIn() ? `<button class="btn btn-primary" id="join">Join</button>` : ''}
      </div>
      <div class="card">
        <h3>Members</h3>
        ${members.map((m) => `<span class="badge">${escapeHtml(m.name)} <span class="muted">(${escapeHtml(m.role)})</span></span>`).join(' ')}
      </div>
      <div class="card">
        <h3>Open recruitments</h3>
        ${opportunities.length ? opportunities.map((o) => `
          <div class="result-row">
            <div><strong>${escapeHtml(o.title)}</strong> <span class="badge">${escapeHtml(o.type)}</span></div>
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
          msg.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
        }
      };
    }
  } catch (e) {
    root.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
  }
};
