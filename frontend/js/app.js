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
    analytics: Views.analytics,
    events: Views.events,
    event: Views.event,
    leaderboard: Views.leaderboard,
    admin: Views.admin,
    hub: Views.hub,
    emergency: Views.emergency,
    developers: Views.developers,
    intelligence: Views.intelligence,
    autonomy: Views.autonomy,
  },

  currentTheme: localStorage.getItem('skillmesh_theme') || 'dark',

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

  refreshNav() {
    const nav = document.getElementById('navlinks');
    const { route } = this.parseHash();
    const loggedIn = Store.isLoggedIn();

    const primary = [
      ['home', 'Home'],
      ['search', 'Search'],
      ['teams', 'Teams'],
      ['communities', 'Communities'],
      ['projects', 'Projects'],
      ['opportunities', 'Opps'],
    ];
    const more = [
      ['analytics', 'Intel'],
      ['events', 'Events'],
      ['hub', 'Hub'],
      ['emergency', 'Emergency'],
      ['intelligence', 'Global'],
      ['autonomy', 'Agents'],
      ['leaderboard', 'Rewards'],
      ['organizations', 'Orgs'],
      ['developers', 'Dev'],
      ['admin', 'Admin'],
    ];
    if (loggedIn) {
      primary.push(['messages', 'Inbox']);
      primary.push(['recommendations', 'For You']);
      primary.push(['dashboard', 'Profile']);
    }

    const user = Store.getUser();
    const userChip = loggedIn && user
      ? `<span class="avatar-chip">${(user.name || '?').charAt(0).toUpperCase()}</span>`
      : '';

    const btn = ([r, label]) =>
      `<button data-route="${r}" class="${route === r ? 'active' : ''}">${label}</button>`;

    nav.innerHTML =
      primary.map(btn).join('') +
      `<details class="nav-more"><summary>More</summary><div class="nav-more-panel">${more.map(btn).join('')}</div></details>` +
      (loggedIn
        ? `${userChip}<button class="btn-danger" id="logout">Log out</button>`
        : `<button class="btn-primary" data-route="login">Log in</button>`);

    nav.querySelectorAll('[data-route]').forEach((el) => {
      el.onclick = () => this.navigate(el.getAttribute('data-route'));
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
    this.updateBreadcrumb(route, params);
    this.refreshNav();
    const root = document.getElementById('view');
    await this.routes[route](root, params);
  },

  async init() {
    this.initTopNav();
    window.addEventListener('hashchange', () => this.render());
    if (Store.isLoggedIn() && !Store.getUser()) {
      try {
        const { user } = await Api.me();
        Store.setUser(user);
      } catch {
        Store.clearToken();
      }
    }
    this.render();
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());

