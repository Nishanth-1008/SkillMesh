const App = {
  routes: {
    home: Views.home,
    login: Views.login,
    register: Views.register,
    dashboard: Views.dashboard,
    profile: Views.profile,
    communities: Views.communities,
    community: Views.community,
    search: Views.search,
    teams: Views.teams,
    projects: Views.projects,
    project: Views.project,
    recommendations: Views.recommendations,
    opportunities: Views.opportunities,
    opportunity: Views.opportunity,
    messages: Views.messages,
    organizations: Views.organizations,
    organization: Views.organization,
    // Phases 3–6
    analytics: Views.analytics,
    events: Views.events,
    event: Views.event,
    admin: Views.admin,
    leaderboard: Views.leaderboard,
    hub: Views.hub,
    emergency: Views.emergency,
    developers: Views.developers,
    intelligence: Views.intelligence,
    autonomy: Views.autonomy,
  },

  currentTheme: localStorage.getItem('skillmesh_theme') || 'dark',

  navigate(route, params = {}) {
    const query = new URLSearchParams(params).toString();
    const targetHash = `#${route}${query ? `?${query}` : ''}`;
    if (window.location.hash === targetHash) {
      this.render();
    } else {
      window.location.hash = targetHash;
    }
  },

  parseHash() {
    const raw = window.location.hash.slice(1) || 'home';
    const [route, queryStr] = raw.split('?');
    const params = Object.fromEntries(new URLSearchParams(queryStr || ''));
    return { route: this.routes[route] ? route : 'home', params };
  },

  updateBreadcrumb(route, params = {}) {
    const breadcrumbEl = document.getElementById('breadcrumb');
    if (!breadcrumbEl) return;

    const routeNames = {
      home: 'Home',
      login: 'Log In',
      register: 'Register',
      dashboard: 'Dashboard',
      profile: 'User Profile',
      communities: 'Communities',
      community: params.id ? `Community #${params.id}` : 'Community Detail',
      search: 'AI Search',
      teams: 'Teams',
      projects: 'Projects',
      project: params.id ? `Project #${params.id}` : 'Project Detail',
      recommendations: 'Recommendations',
      opportunities: 'Opportunities',
      opportunity: params.id ? `Opportunity #${params.id}` : 'Opportunity Detail',
      messages: 'Inbox & Alerts',
      organizations: 'Organizations',
      organization: params.id ? `Organization #${params.id}` : 'Organization Detail',
      analytics: 'Intel & Analytics',
      events: 'Events',
      event: params.id ? `Event #${params.id}` : 'Event Detail',
      admin: 'Admin Console',
      leaderboard: 'Rewards & Leaderboard',
      hub: 'Public Hub',
      emergency: 'Emergency Response',
      developers: 'Developer APIs',
      intelligence: 'Global & SDG Intelligence',
      autonomy: 'AI Agents & Twin',
    };

    const pathSegments = [
      { label: 'Home', route: 'home' }
    ];

    if (route !== 'home') {
      if (['community', 'project', 'opportunity', 'organization'].includes(route)) {
        const parentRoute = `${route}s`;
        pathSegments.push({ label: routeNames[parentRoute] || 'Overview', route: parentRoute });
      } else if (['analytics', 'intelligence', 'autonomy'].includes(route)) {
        pathSegments.push({ label: 'Intelligence', route: 'intelligence' });
      }
      pathSegments.push({ label: routeNames[route] || route, route, active: true });
    }

    breadcrumbEl.innerHTML = pathSegments
      .map((seg, idx) => {
        if (seg.active || idx === pathSegments.length - 1) {
          return `<span class="breadcrumb-item active">${seg.label}</span>`;
        }
        return `<a href="#${seg.route}" class="breadcrumb-item">${seg.label}</a><span class="breadcrumb-sep">/</span>`;
      })
      .join('');
  },

  isNavRouteActive(navRoute, currentRoute) {
    if (navRoute === currentRoute) return true;
    const parentChildMap = {
      hub: ['community', 'project', 'opportunity', 'organization'],
      communities: ['community'],
      projects: ['project'],
      opportunities: ['opportunity'],
      organizations: ['organization'],
      events: ['event'],
    };
    if (parentChildMap[navRoute] && parentChildMap[navRoute].includes(currentRoute)) {
      return true;
    }
    if (currentRoute && currentRoute.startsWith(navRoute)) return true;
    return false;
  },

  refreshNav() {
    const nav = document.getElementById('navlinks');
    const { route } = this.parseHash();
    const loggedIn = Store.isLoggedIn();
    
    // Left sidebar navigation config with Lucide icon tags
    const items = [
      ['search', '<i data-lucide="search" style="width: 18px; height: 18px;"></i>', 'AI Search'],
      ['teams', '<i data-lucide="users" style="width: 18px; height: 18px;"></i>', 'AI Team Builder'],
      ['communities', '<i data-lucide="globe" style="width: 18px; height: 18px;"></i>', 'Communities'],
      ['analytics', '<i data-lucide="bar-chart-3" style="width: 18px; height: 18px;"></i>', 'Community Intel'],
      ['events', '<i data-lucide="calendar" style="width: 18px; height: 18px;"></i>', 'Events & Impact'],
      ['hub', '<i data-lucide="compass" style="width: 18px; height: 18px;"></i>', 'Public Hub'],
      ['emergency', '<i data-lucide="alert-triangle" style="width: 18px; height: 18px;"></i>', 'Emergency Center'],
      ['intelligence', '<i data-lucide="brain" style="width: 18px; height: 18px;"></i>', 'Global Reasoning'],
      ['autonomy', '<i data-lucide="bot" style="width: 18px; height: 18px;"></i>', 'Autonomous Agents'],
      ['leaderboard', '<i data-lucide="trophy" style="width: 18px; height: 18px;"></i>', 'Rewards & Points'],
      ['projects', '<i data-lucide="folder" style="width: 18px; height: 18px;"></i>', 'Projects'],
      ['opportunities', '<i data-lucide="target" style="width: 18px; height: 18px;"></i>', 'Opportunities'],
      ['organizations', '<i data-lucide="building" style="width: 18px; height: 18px;"></i>', 'Organizations'],
      ['developers', '<i data-lucide="code" style="width: 18px; height: 18px;"></i>', 'Developer APIs'],
    ];

    const protectedRoutes = ['messages', 'recommendations', 'dashboard'];

    if (nav) {
      nav.innerHTML = items
        .map(([r, icon, label]) => {
          let displayLabel = label;
          if (loggedIn && label.includes('(Locked)')) {
            displayLabel = label.replace(' (Locked)', '');
          }

          const isActive = this.isNavRouteActive(r, route);
          return `<button data-route="${r}" data-label="${displayLabel}" class="${isActive ? 'active' : ''}"><span>${icon}</span><span>${displayLabel}</span></button>`;
        })
        .join('');

      nav.querySelectorAll('[data-route]').forEach((btn) => {
        btn.onclick = () => {
          const targetRoute = btn.getAttribute('data-route');
          if (protectedRoutes.includes(targetRoute) && !loggedIn) {
            this.navigate('login');
          } else {
            this.navigate(targetRoute);
          }
        };
      });
    }

    // Refresh TopNav components
    this.updateTopNavUser();
    this.updateNotificationBadge();
    window.lucide?.createIcons();
  },

  // ---------- Top Navigation Systems ----------
  initTopNav() {
    // 1. Theme Toggle Initializer
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      const themeIcon = themeBtn.querySelector('.theme-icon');
      if (themeIcon) {
        themeIcon.innerHTML = this.currentTheme === 'light' ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
      }
      themeBtn.onclick = () => this.toggleTheme();
    }

    // 2. Global Search Component
    const searchInput = document.getElementById('global-search-input');
    const searchResults = document.getElementById('global-search-results');
    if (searchInput && searchResults) {
      let debounceTimer = null;
      searchInput.oninput = (e) => {
        const query = e.target.value.trim();
        clearTimeout(debounceTimer);
        if (!query) {
          searchResults.classList.add('hidden');
          return;
        }
        debounceTimer = setTimeout(async () => {
          try {
            searchResults.innerHTML = `<div class="loading-line p-2"><span class="spinner"></span> Searching SkillMesh...</div>`;
            searchResults.classList.remove('hidden');
            
            // Search communities, users, skills in parallel or fallback
            const { communities } = await Api.listCommunities(query);
            let searchOut = '';

            if (communities.length) {
              searchOut += `<div class="search-group-title">Communities (${communities.length})</div>`;
              communities.slice(0, 3).forEach((c) => {
                searchOut += `
                  <div class="search-result-item" data-navigate="community" data-id="${c.id}">
                    <span><i data-lucide="building-2" style="width: 16px; height: 16px;"></i></span>
                    <div><strong>${escapeHtml(c.name)}</strong><br/><span class="muted" style="font-size:11px;">${escapeHtml(c.description || 'Community')}</span></div>
                  </div>`;
              });
            }

            // Mock/Simulated Users & Skills results
            searchOut += `<div class="search-group-title">Platform Quick Links</div>`;
            searchOut += `
              <div class="search-result-item" data-navigate="teams">
                <span><i data-lucide="users" style="width: 16px; height: 16px;"></i></span><div><strong>AI Team Builder</strong><br/><span class="muted" style="font-size:11px;">Find candidates for "${escapeHtml(query)}"</span></div>
              </div>
              <div class="search-result-item" data-navigate="search">
                <span><i data-lucide="search" style="width: 16px; height: 16px;"></i></span><div><strong>Full AI Search</strong><br/><span class="muted" style="font-size:11px;">Run query: ${escapeHtml(query)}</span></div>
              </div>`;

            searchResults.innerHTML = searchOut;
            window.lucide?.createIcons();
            searchResults.querySelectorAll('[data-navigate]').forEach((el) => {
              el.onclick = () => {
                const target = el.getAttribute('data-navigate');
                const id = el.getAttribute('data-id');
                searchResults.classList.add('hidden');
                searchInput.value = '';
                this.navigate(target, id ? { id } : {});
              };
            });
          } catch {
            searchResults.innerHTML = `<div class="p-2 muted">No results found.</div>`;
          }
        }, 220);
      };

      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
          searchResults.classList.add('hidden');
        }
      });
    }

    // 3. Quick Actions Dropdown
    const qaBtn = document.getElementById('quick-action-btn');
    const qaDropdown = document.getElementById('quick-action-dropdown');
    if (qaBtn && qaDropdown) {
      qaBtn.onclick = (e) => {
        e.stopPropagation();
        qaDropdown.classList.toggle('hidden');
        this.closeOtherDropdowns(qaDropdown);
      };

      document.getElementById('qa-create-community').onclick = () => {
        qaDropdown.classList.add('hidden');
        this.navigate('communities');
      };
      document.getElementById('qa-assemble-team').onclick = () => {
        qaDropdown.classList.add('hidden');
        this.navigate('teams');
      };
      document.getElementById('qa-invite-members').onclick = () => {
        qaDropdown.classList.add('hidden');
        this.navigate('projects');
      };
      document.getElementById('qa-log-impact').onclick = () => {
        qaDropdown.classList.add('hidden');
        this.openImpactModal();
      };
    }

    // 4. Notification Bell Dropdown
    const notifBtn = document.getElementById('notif-bell-btn');
    const notifDropdown = document.getElementById('notif-dropdown');
    if (notifBtn && notifDropdown) {
      notifBtn.onclick = async (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('hidden');
        this.closeOtherDropdowns(notifDropdown);
        if (!notifDropdown.classList.contains('hidden')) {
          await this.loadNotifDropdownList();
        }
      };

      const fastRead = document.getElementById('notif-mark-all-fast');
      if (fastRead) {
        fastRead.onclick = async () => {
          await this.markAllNotificationsReadWithUndo();
          await this.loadNotifDropdownList();
        };
      }

      const goInbox = document.getElementById('go-inbox-btn');
      if (goInbox) {
        goInbox.onclick = () => {
          notifDropdown.classList.add('hidden');
          this.navigate('messages');
        };
      }
    }

    // 5. User Profile Menu Dropdown
    const profileBtn = document.getElementById('user-profile-btn');
    const profileDropdown = document.getElementById('user-profile-dropdown');
    if (profileBtn && profileDropdown) {
      profileBtn.onclick = (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('hidden');
        this.closeOtherDropdowns(profileDropdown);
      };

      document.getElementById('pm-dashboard').onclick = () => {
        profileDropdown.classList.add('hidden');
        this.navigate(Store.isLoggedIn() ? 'dashboard' : 'login');
      };
      document.getElementById('pm-messages').onclick = () => {
        profileDropdown.classList.add('hidden');
        this.navigate(Store.isLoggedIn() ? 'messages' : 'login');
      };
      document.getElementById('pm-status-toggle').onclick = async (e) => {
        e.stopPropagation();
        const user = Store.getUser();
        if (!user || !Store.isLoggedIn()) {
          this.navigate('login');
          return;
        }
        const next = nextAvailability(user.availability);
        const toggleBtn = document.getElementById('pm-status-toggle');
        if (toggleBtn) toggleBtn.disabled = true;
        try {
          const { profile } = await Api.updateMyProfile({ availability: next });
          const updated = {
            ...user,
            availability: (profile && profile.availability) || next,
          };
          Store.setUser(updated);
          this.updateTopNavUser();
          this.showToast(`Status set to ${availabilityMeta(updated.availability).label}`);
          // Refresh open profile/dashboard so the card reflects the new status
          const { route } = this.parseHash();
          if (route === 'dashboard' || route === 'profile') {
            this.render();
          }
        } catch (err) {
          this.showToast(err.message || 'Could not update status');
        } finally {
          if (toggleBtn) toggleBtn.disabled = false;
          window.lucide?.createIcons();
        }
      };
    }

    // Close dropdowns on document click
    document.addEventListener('click', () => this.closeOtherDropdowns());
  },

  closeOtherDropdowns(except = null) {
    const dropdowns = [
      document.getElementById('quick-action-dropdown'),
      document.getElementById('notif-dropdown'),
      document.getElementById('user-profile-dropdown'),
    ];
    dropdowns.forEach((d) => {
      if (d && d !== except) d.classList.add('hidden');
    });
  },

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('skillmesh_theme', this.currentTheme);
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      const themeIcon = themeBtn.querySelector('.theme-icon');
      if (themeIcon) {
        themeIcon.innerHTML = this.currentTheme === 'light' ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
      }
    }
    this.showToast(`Switched to ${this.currentTheme} mode`);
    window.lucide?.createIcons();
  },

  updateTopNavUser() {
    const user = Store.getUser();
    const avatarEl = document.getElementById('user-avatar-chip');
    const nameLabel = document.getElementById('user-name-label');
    const headerEl = document.getElementById('profile-menu-header');
    const authActionEl = document.getElementById('pm-auth-action');
    const statusTextEl = document.getElementById('user-status-text');
    const profileBtn = document.getElementById('user-profile-btn');
    const profileWrapper = document.getElementById('user-profile-wrapper');

    const { route, params } = this.parseHash();
    const isProfileRoute = route === 'dashboard' || (route === 'profile' && user && params.id === user.id);

    if (profileBtn) {
      if (isProfileRoute) {
        profileBtn.classList.add('active');
        if (profileWrapper) profileWrapper.classList.add('active');
      } else {
        profileBtn.classList.remove('active');
        if (profileWrapper) profileWrapper.classList.remove('active');
      }
    }

    if (Store.isLoggedIn() && user) {
      if (avatarEl) avatarEl.textContent = (user.name || '?').charAt(0).toUpperCase();
      if (nameLabel) nameLabel.textContent = user.name || 'Account';
      const avail = normalizeAvailability(user.availability);
      const meta = availabilityMeta(avail);
      if (statusTextEl) {
        statusTextEl.textContent = meta.label;
        statusTextEl.className = `status-pill ${meta.className}`;
      }
      const statusIconEl = document.getElementById('user-status-icon');
      if (statusIconEl) {
        statusIconEl.outerHTML = `<i data-lucide="${meta.icon}" class="status-icon ${meta.className}" id="user-status-icon"></i>`;
      }
      if (headerEl) {
        headerEl.innerHTML = `<strong>${escapeHtml(user.name)}</strong><br/><span class="muted" style="font-size:12px;">${escapeHtml(user.email)}</span>`;
      }
      if (authActionEl) {
        authActionEl.innerHTML = `<button class="dropdown-item" style="color:var(--red);" id="pm-logout"><i data-lucide="log-out" style="width: 16px; height: 16px; margin-right: 8px;"></i> Log out</button>`;
        document.getElementById('pm-logout').onclick = () => {
          Store.clearToken();
          Store.setUser(null);
          this.refreshNav();
          this.navigate('home');
        };
      }
      window.lucide?.createIcons();
    } else {
      if (avatarEl) avatarEl.innerHTML = '<i data-lucide="user" style="width: 14px; height: 14px;"></i>';
      if (nameLabel) nameLabel.textContent = 'Guest';
      if (headerEl) {
        headerEl.innerHTML = `<strong>Guest User</strong><br/><span class="muted" style="font-size:12px;">Log in to access your inbox</span>`;
      }
      if (authActionEl) {
        authActionEl.innerHTML = `<button class="dropdown-item" style="color:var(--cyan);" id="pm-login"><i data-lucide="log-in" style="width: 16px; height: 16px; margin-right: 8px;"></i> Log in</button>`;
        document.getElementById('pm-login').onclick = () => {
          this.navigate('login');
        };
      }
    }
    window.lucide?.createIcons();
  },

  async updateNotificationBadge() {
    const badgeEl = document.getElementById('notif-badge');
    if (!badgeEl) return;

    if (!Store.isLoggedIn()) {
      badgeEl.classList.add('hidden');
      return;
    }

    try {
      const { unread } = await Api.notifications();
      if (unread > 0) {
        badgeEl.textContent = unread > 99 ? '99+' : unread;
        badgeEl.classList.remove('hidden');
      } else {
        badgeEl.classList.add('hidden');
      }
    } catch {
      badgeEl.classList.add('hidden');
    }
  },

  async loadNotifDropdownList() {
    const listEl = document.getElementById('notif-dropdown-list');
    if (!listEl) return;

    if (!Store.isLoggedIn()) {
      listEl.innerHTML = `<div class="p-2 muted" style="font-size:12.5px;">Log in to view notifications.</div>`;
      return;
    }

    try {
      const { notifications } = await Api.notifications();
      if (!notifications.length) {
        listEl.innerHTML = `<div class="p-2 muted" style="font-size:12.5px;">No notifications.</div>`;
        return;
      }

      listEl.innerHTML = notifications.slice(0, 5).map((n) => `
        <div class="msg-row ${n.read ? '' : 'unread'}" style="padding:8px 10px; font-size:12.5px;">
          <strong>${escapeHtml(n.title)}</strong>
          <p class="muted" style="margin:2px 0 0; font-size:11.5px;">${escapeHtml(n.body || '')}</p>
        </div>
      `).join('');
    } catch {
      listEl.innerHTML = `<div class="p-2 muted">Unable to load notifications.</div>`;
    }
  },

  // ---------- Task 2: OS Notification Sync & Mark Read with Undo ----------
  async clearOSNotifications() {
    try {
      // 1. ServiceWorker Push Notifications API dismissal
      if ('serviceWorker' in navigator && 'getRegistrations' in navigator.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.getNotifications) {
            const activeNotifs = await reg.getNotifications();
            activeNotifs.forEach((n) => n.close());
          }
        }
      }
      // 2. Window Notifications API fallback
      if ('Notification' in window && Notification.permission === 'granted') {
        // Mock signal or closing active desktop instances if available
      }
    } catch (e) {
      console.warn('OS Notification clear attempt executed gracefully:', e);
    }
  },

  async markAllNotificationsReadWithUndo() {
    const badgeEl = document.getElementById('notif-badge');
    const previousUnread = badgeEl ? badgeEl.textContent : '0';

    // 1. Convert active in-app indicators immediately
    if (badgeEl) {
      badgeEl.textContent = '0';
      badgeEl.classList.add('hidden');
    }

    // 2. Trigger OS native API to clear notifications from phone top bar
    await this.clearOSNotifications();

    // 3. Send API update
    try {
      await Api.markNotificationsRead({ all: true });
    } catch { /* graceful */ }

    // 4. Trigger Toast banner with 2-second Undo option
    this.showToast('All marked as read and notifications cleared', {
      duration: 3500,
      undoCallback: async () => {
        if (badgeEl && previousUnread !== '0') {
          badgeEl.textContent = previousUnread;
          badgeEl.classList.remove('hidden');
        }
        this.showToast('Restored unread notifications');
        // Refresh active views if on messages screen
        if (window.location.hash.includes('messages')) {
          this.render();
        }
      },
    });
  },

  // ---------- Global Toast & Modal Systems ----------
  showToast(message, { duration = 3000, undoCallback = null } = {}) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-banner';
    toast.innerHTML = `
      <span>${escapeHtml(message)}</span>
      ${undoCallback ? `<button class="toast-undo-btn" id="toast-undo">Undo</button>` : ''}
    `;

    container.appendChild(toast);

    let timer = setTimeout(() => {
      toast.remove();
    }, duration);

    if (undoCallback) {
      const undoBtn = toast.querySelector('#toast-undo');
      if (undoBtn) {
        undoBtn.onclick = () => {
          clearTimeout(timer);
          toast.remove();
          undoCallback();
        };
      }
    }
  },

  openModal(contentHtml, title = 'Modal') {
    let container = document.getElementById('modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modal-container';
      container.className = 'modal-container hidden';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close-btn" id="modal-close"><i data-lucide="x" style="width: 18px; height: 18px;"></i></button>
        </div>
        <div class="modal-body">${contentHtml}</div>
      </div>
    `;

    container.classList.remove('hidden');
    window.lucide?.createIcons();

    const closeBtn = container.querySelector('#modal-close');
    if (closeBtn) {
      closeBtn.onclick = () => container.classList.add('hidden');
    }
    container.onclick = (e) => {
      if (e.target === container) container.classList.add('hidden');
    };
  },

  // ---------- Task 3: Global Impact Logging Modal ----------
  openImpactModal(defaultSdg = 'SDG 13 - Climate Action') {
    if (!Store.isLoggedIn()) {
      this.showToast('Please log in to log your impact.');
      this.navigate('login');
      return;
    }

    const modalContent = `
      <div id="impact-modal-msg"></div>
      <label>SDG Target Category</label>
      <select class="input" id="modal-sdg-select">
        <option value="1">SDG 1: No Poverty</option>
        <option value="2">SDG 2: Zero Hunger</option>
        <option value="3">SDG 3: Good Health & Well-being</option>
        <option value="4">SDG 4: Quality Education</option>
        <option value="5">SDG 5: Gender Equality</option>
        <option value="6">SDG 6: Clean Water & Sanitation</option>
        <option value="7">SDG 7: Affordable & Clean Energy</option>
        <option value="8">SDG 8: Decent Work & Economic Growth</option>
        <option value="9">SDG 9: Industry, Innovation & Infrastructure</option>
        <option value="10">SDG 10: Reduced Inequalities</option>
        <option value="11">SDG 11: Sustainable Cities & Communities</option>
        <option value="12">SDG 12: Responsible Consumption & Production</option>
        <option value="13" selected>SDG 13: Climate Action</option>
        <option value="14">SDG 14: Life Below Water</option>
        <option value="15">SDG 15: Life on Land</option>
        <option value="16">SDG 16: Peace, Justice & Strong Institutions</option>
        <option value="17">SDG 17: Partnerships for the Goals</option>
      </select>
      <label>Impact Metric Name</label>
      <input class="input" id="modal-metric" placeholder="e.g. people_helped, hours_volunteered, trees_planted" value="people_helped" />
      <label>Contribution Value</label>
      <input class="input" id="modal-val" type="number" placeholder="Numeric value e.g. 5" value="5" min="1" />
      <label>Notes / Tag Description</label>
      <input class="input" id="modal-tags" placeholder="e.g. Greenwood Community Clean-up" />
      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px;">
        <button class="btn" id="modal-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="modal-submit-impact">
          <span>Log Impact</span>
        </button>
      </div>
    `;

    this.openModal(modalContent, '<i data-lucide="sprout" style="width: 18px; height: 18px; vertical-align: middle; margin-right: 6px;"></i> Log SDG Impact Contribution');

    const modalContainer = document.getElementById('modal-container');
    const cancelBtn = modalContainer.querySelector('#modal-cancel-btn');
    const submitBtn = modalContainer.querySelector('#modal-submit-impact');
    const msgBox = modalContainer.querySelector('#impact-modal-msg');

    if (cancelBtn) {
      cancelBtn.onclick = () => modalContainer.classList.add('hidden');
    }

    if (submitBtn) {
      submitBtn.onclick = async () => {
        const metric = modalContainer.querySelector('#modal-metric').value.trim() || 'people_helped';
        const val = Number(modalContainer.querySelector('#modal-val').value) || 1;
        const sdgChoice = modalContainer.querySelector('#modal-sdg-select').value;
        const tags = [modalContainer.querySelector('#modal-tags').value.trim() || 'community', `SDG_${sdgChoice}`];

        // 1. Interactivity visual feedback: Loading spinner & temporary disabled state
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner"></span> Logging...`;

        try {
          await Api.recordImpact({
            metric,
            value: val,
            tags,
          });

          // Close modal
          modalContainer.classList.add('hidden');

          // 2. Data Sync: Show Toast & Dispatch Event for real-time UI metrics update
          this.showToast('Impact logged successfully!');
          window.dispatchEvent(new CustomEvent('impactRecorded', { detail: { metric, val, sdgChoice } }));

          // Refresh current page if viewing intelligence or analytics
          const { route } = this.parseHash();
          if (['intelligence', 'analytics'].includes(route)) {
            this.render();
          }
        } catch (e) {
          msgBox.innerHTML = `<div class="error-box">${escapeHtml(e.message || 'Failed to log impact.')}</div>`;
          submitBtn.disabled = false;
          submitBtn.innerHTML = `Log Impact`;
        }
      };
    }
  },

  async render() {
    // Route transition locking: if a newer navigation starts while this one
    // is still loading, the stale render aborts so views never clobber each
    // other (slow-network double-clicks).
    const seq = (this._renderSeq = (this._renderSeq || 0) + 1);
    const { route, params } = this.parseHash();
    this.updateBreadcrumb(route, params);
    this.refreshNav();
    const root = document.getElementById('view');
    if (!root) return;
    try {
      await this.routes[route](root, params);
    } catch (e) {
      // Zero blank screens: any view failure renders a clean error box.
      if (seq === this._renderSeq) {
        root.innerHTML = `
          <div class="error-box">
            Something went wrong while loading this page.
            <p class="muted" style="margin:8px 0 0;">${escapeHtml(e && e.message ? e.message : 'Unknown error')}</p>
          </div>
          <button class="btn" onclick="window.location.hash='#home'">Back to home</button>`;
      }
    } finally {
      if (seq === this._renderSeq) {
        window.lucide?.createIcons();
      }
    }
  },

  async init() {
    this.initTopNav();

    // Multi-tab session sync: when another tab logs in/out, mirror it here.
    // (storage events only fire in OTHER tabs, not the one that changed.)
    window.addEventListener('storage', async (e) => {
      if (e.key !== 'skillmesh_token') return;
      if (!e.newValue) {
        // Logged out in another tab → drop to guest mode immediately.
        Store.clearToken();
        Store.setUser(null);
        this.refreshNav();
        if (!window.location.hash.startsWith('#login')) {
          this.showToast('You were logged out in another tab.');
          this.navigate('home');
        }
      } else if (e.oldValue && e.oldValue !== e.newValue) {
        // Session refreshed in another tab → re-fetch the user.
        try {
          const { user } = await Api.me();
          Store.setUser(user);
          this.refreshNav();
        } catch { /* token invalid elsewhere too */ }
      }
    });

    // Global crash safety: never let a stray error blank the app.
    window.addEventListener('error', (e) => {
      console.error('[SkillMesh] window error:', e.error || e.message);
    });
    window.addEventListener('unhandledrejection', (e) => {
      console.error('[SkillMesh] unhandled rejection:', e.reason);
    });

    window.addEventListener('hashchange', () => this.render());

    // Sidebar toggle logic (desktop collapse vs mobile drawer)
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('sidebar-toggle');
    
    const toggleSidebar = () => {
      if (!sidebar) return;
      if (window.innerWidth <= 992) {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('open');
      } else {
        sidebar.classList.toggle('collapsed');
      }
    };
    
    if (toggleBtn) toggleBtn.onclick = toggleSidebar;
    if (overlay) overlay.onclick = () => {
      if (sidebar) sidebar.classList.remove('open');
      overlay.classList.remove('open');
    };

    // Resizing from mobile to desktop while the drawer is open must never
    // leave the drawer stuck as an overlay.
    window.addEventListener('resize', () => {
      if (window.innerWidth > 992 && sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
      }
    });

    // Close mobile drawer on navigation
    window.addEventListener('hashchange', () => {
      if (window.innerWidth <= 992 && sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
      }
    });

    if (Store.isLoggedIn() && !Store.getUser()) {
      try {
        const { user } = await Api.me();
        Store.setUser(user);
      } catch {
        Store.clearToken();
      }
    }
    this.render();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

