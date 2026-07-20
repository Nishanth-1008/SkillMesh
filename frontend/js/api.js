// Thin wrapper around fetch() for talking to the SkillMesh backend.
// Change API_BASE if the backend isn't on localhost:4000.
const API_BASE = window.SKILLMESH_API_BASE || 'http://localhost:4000/api';

const Api = {
  async _request(method, path, { body, auth = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = Store.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch { /* no body */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  },

  register: (payload) => Api._request('POST', '/auth/register', { body: payload }),
  login: (payload) => Api._request('POST', '/auth/login', { body: payload }),
  me: () => Api._request('GET', '/auth/me', { auth: true }),

  listCommunities: (q) => Api._request('GET', `/communities${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getCommunity: (id) => Api._request('GET', `/communities/${id}`),
  createCommunity: (payload) => Api._request('POST', '/communities', { body: payload, auth: true }),
  joinCommunity: (id) => Api._request('POST', `/communities/${id}/join`, { auth: true }),
  leaveCommunity: (id) => Api._request('POST', `/communities/${id}/leave`, { auth: true }),

  getProfile: (id) => Api._request('GET', `/profiles/${id}`),
  updateMyProfile: (payload) => Api._request('PUT', '/profiles/me', { body: payload, auth: true }),
  addMySkill: (payload) => Api._request('POST', '/profiles/me/skills', { body: payload, auth: true }),
  removeMySkill: (userSkillId) => Api._request('DELETE', `/profiles/me/skills/${userSkillId}`, { auth: true }),

  search: (payload) => Api._request('POST', '/search', { body: payload, auth: true }),

  graph: (communityId) => Api._request('GET', `/graph${communityId ? `?communityId=${communityId}` : ''}`),
};
