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
    leaderboard: Views.leaderboard,
    hub: Views.hub,
    emergency: Views.emergency,
    developers: Views.developers,
    intelligence: Views.intelligence,
    autonomy: Views.autonomy,
  },

  navigate(route, params = {}) {
    const query = new URLSearchParams(params).toString();
    window.location.hash = `#${route}${query ? `?${query}` : ''}`;
  },

  parseHash() {
    const raw = window.location.hash.slice(1) || 'home';
    const [route, queryStr] = raw.split('?');
    const params = Object.fromEntries(new URLSearchParams(queryStr || ''));
    return { route: this.routes[route] ? route : 'home', params };
  },

  refreshNav() {
    const nav = document.getElementById('navlinks');
    const { route } = this.parseHash();
    const loggedIn = Store.isLoggedIn();
    
    // Feature Locking: show all layout metadata regardless of login state.
    const items = [

      ['search', 'AI Search'],
      ['teams', 'Teams'],
      ['communities', 'Communities'],
      ['analytics', 'Intel'],
      ['events', 'Events'],
      ['hub', 'Hub'],
      ['emergency', 'Emergency'],
      ['intelligence', 'Global'],
      ['autonomy', 'Agents'],
      ['leaderboard', 'Rewards'],
      ['projects', 'Projects'],
      ['opportunities', 'Opps'],
      ['organizations', 'Orgs'],
      ['developers', 'Dev'],
      ['messages', 'Inbox (Locked)'],
      ['recommendations', 'For You (Locked)'],
      ['dashboard', 'Profile (Locked)'],
    ];

    const protectedRoutes = ['messages', 'recommendations', 'dashboard'];

    const user = Store.getUser();
    const userChip = loggedIn && user
      ? `<span class="avatar-chip">${(user.name || '?').charAt(0).toUpperCase()}</span>`
      : `<span class="avatar-chip" style="background:rgba(255,255,255,0.1);color:var(--text-dim);">👤</span>`;

    nav.innerHTML = items
      .map(([r, label]) => {
        // Strip "(Locked)" if user is logged in
        let displayLabel = label;
        if (loggedIn && label.includes('(Locked)')) {
          displayLabel = label.replace(' (Locked)', '');
        }

        if (r === 'dashboard') {
          return `<button data-route="${r}" class="profile-nav-link ${route === r ? 'active' : ''}">${userChip}<span>${displayLabel}</span></button>`;
        }

        return `<button data-route="${r}" class="${route === r ? 'active' : ''}">${displayLabel}</button>`;
      })
      .join('') + (loggedIn
        ? `<button class="btn-danger" id="logout" style="margin-top:10px;">Log out</button>`
        : `<button class="btn-primary" data-route="login" style="margin-top:10px;">Log in</button>`);

    nav.querySelectorAll('[data-route]').forEach((btn) => {
      btn.onclick = () => {
        const targetRoute = btn.getAttribute('data-route');
        if (protectedRoutes.includes(targetRoute) && !loggedIn) {
          // Trigger login modal/redirect if guest tries to use a locked feature
          this.navigate('login');
        } else {
          this.navigate(targetRoute);
        }
      };
    });
    
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        Store.clearToken();
        Store.setUser(null);
        this.refreshNav();
        this.navigate('home');
      };
    }
  },

  async render() {
    const { route, params } = this.parseHash();
    this.refreshNav();
    const root = document.getElementById('view');
    await this.routes[route](root, params);
  },

  async init() {
    window.addEventListener('hashchange', () => this.render());
    
    // Sidebar toggle logic
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('sidebar-toggle');
    
    const toggleSidebar = () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    };
    
    if (toggleBtn) toggleBtn.onclick = toggleSidebar;
    if (overlay) overlay.onclick = toggleSidebar;

    // Close sidebar on navigation (mobile friendly)
    window.addEventListener('hashchange', () => {
      if (sidebar && sidebar.classList.contains('open')) {
        toggleSidebar();
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
