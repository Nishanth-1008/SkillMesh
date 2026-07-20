const App = {
  routes: {
    home: Views.home,
    login: Views.login,
    register: Views.register,
    dashboard: Views.dashboard,
    communities: Views.communities,
    community: Views.community,
    search: Views.search,
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
    const items = [
      ['home', 'Home'],
      ['search', 'AI Search'],
      ['communities', 'Communities'],
    ];
    if (loggedIn) items.push(['dashboard', 'My Profile']);

    const user = Store.getUser();
    const userChip = loggedIn && user
      ? `<span class="avatar-chip">${(user.name || '?').charAt(0).toUpperCase()}</span>`
      : '';

    nav.innerHTML = items
      .map(([r, label]) => `<button data-route="${r}" class="${route === r ? 'active' : ''}">${label}</button>`)
      .join('') + (loggedIn
        ? `${userChip}<button class="btn-danger" id="logout">Log out</button>`
        : `<button class="btn-primary" data-route="login">Log in</button>`);

    nav.querySelectorAll('[data-route]').forEach((btn) => {
      btn.onclick = () => this.navigate(btn.getAttribute('data-route'));
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
