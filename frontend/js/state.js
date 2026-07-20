const Store = {
  getToken() { return localStorage.getItem('skillmesh_token'); },
  setToken(t) { localStorage.setItem('skillmesh_token', t); },
  clearToken() { localStorage.removeItem('skillmesh_token'); },

  _user: null,
  getUser() { return this._user; },
  setUser(u) { this._user = u; },

  isLoggedIn() { return !!this.getToken(); },
};
