// Thin wrapper around fetch() for talking to the SkillMesh backend.
const API_BASE =
  window.SKILLMESH_API_BASE ||
  (window.SKILLMESH_CONFIG && window.SKILLMESH_CONFIG.API_BASE) ||
  'http://localhost:4000/api';


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

  // Phase 2
  buildTeam: (payload) => Api._request('POST', '/teams/build', { body: payload, auth: true }),
  hiddenExperts: (payload) => Api._request('POST', '/teams/hidden-experts', { body: payload, auth: true }),

  listProjects: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return Api._request('GET', `/projects${qs ? `?${qs}` : ''}`, { auth: true });
  },
  getProject: (id) => Api._request('GET', `/projects/${id}`),
  createProject: (payload) => Api._request('POST', '/projects', { body: payload, auth: true }),
  inviteToProject: (id, payload) => Api._request('POST', `/projects/${id}/invite`, { body: payload, auth: true }),
  respondInvite: (id, accept) => Api._request('POST', `/projects/${id}/respond`, { body: { accept }, auth: true }),
  requestJoinProject: (id) => Api._request('POST', `/projects/${id}/request`, { auth: true }),
  approveJoin: (id, payload) => Api._request('POST', `/projects/${id}/approve`, { body: payload, auth: true }),

  recommendations: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return Api._request('GET', `/recommendations${qs ? `?${qs}` : ''}`, { auth: true });
  },
  askRecommendations: (payload) => Api._request('POST', '/recommendations/ask', { body: payload, auth: true }),

  getTrust: (userId, communityId) =>
    Api._request('GET', `/trust/${userId}${communityId ? `?communityId=${communityId}` : ''}`),
  endorse: (payload) => Api._request('POST', '/trust/endorse', { body: payload, auth: true }),

  listOpportunities: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return Api._request('GET', `/opportunities${qs ? `?${qs}` : ''}`, { auth: true });
  },
  getOpportunity: (id) => Api._request('GET', `/opportunities/${id}`),
  createOpportunity: (payload) => Api._request('POST', '/opportunities', { body: payload, auth: true }),
  applyOpportunity: (id, message) =>
    Api._request('POST', `/opportunities/${id}/apply`, { body: { message }, auth: true }),

  inbox: () => Api._request('GET', '/messages/inbox', { auth: true }),
  sendMessage: (payload) => Api._request('POST', '/messages', { body: payload, auth: true }),
  projectMessages: (projectId) => Api._request('GET', `/messages/project/${projectId}`, { auth: true }),
  notifications: () => Api._request('GET', '/messages/notifications', { auth: true }),
  markNotificationsRead: (payload) =>
    Api._request('POST', '/messages/notifications/read', { body: payload, auth: true }),
  activity: (communityId) =>
    Api._request('GET', `/messages/activity${communityId ? `?communityId=${communityId}` : ''}`, { auth: true }),

  listOrganizations: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return Api._request('GET', `/organizations${qs ? `?${qs}` : ''}`);
  },
  getOrganization: (id) => Api._request('GET', `/organizations/${id}`),
  createOrganization: (payload) => Api._request('POST', '/organizations', { body: payload, auth: true }),
  joinOrganization: (id) => Api._request('POST', `/organizations/${id}/join`, { auth: true }),
  recruit: (id, payload) => Api._request('POST', `/organizations/${id}/recruit`, { body: payload, auth: true }),

  // Phase 3
  communityAnalytics: (id) => Api._request('GET', `/analytics/community/${id}`),
  communityHealth: (id) => Api._request('GET', `/analytics/community/${id}/health`),
  myInsights: () => Api._request('GET', '/analytics/me', { auth: true }),
  listEvents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return Api._request('GET', `/events${qs ? `?${qs}` : ''}`);
  },
  createEvent: (payload) => Api._request('POST', '/events', { body: payload, auth: true }),
  getEvent: (id) => Api._request('GET', `/events/${id}`),
  registerEvent: (id) => Api._request('POST', `/events/${id}/register`, { auth: true }),
  checkinEvent: (id, userId) =>
    Api._request('POST', `/events/${id}/checkin`, { body: { userId }, auth: true }),
  eventImpact: (id, payload) =>
    Api._request('POST', `/events/${id}/impact`, { body: payload, auth: true }),
  leaderboard: (communityId) =>
    Api._request('GET', `/gamification/leaderboard${communityId ? `?communityId=${communityId}` : ''}`),
  milestones: (communityId) => Api._request('GET', `/gamification/milestones/${communityId}`),
  myGamification: () => Api._request('GET', '/gamification/me', { auth: true }),
  adminUsers: () => Api._request('GET', '/gamification/admin/users', { auth: true }),
  adminAudit: () => Api._request('GET', '/gamification/admin/audit', { auth: true }),
  adminModerate: (payload) =>
    Api._request('POST', '/gamification/admin/moderate', { body: payload, auth: true }),
  adminReport: (payload) =>
    Api._request('POST', '/gamification/admin/report', { body: payload, auth: true }),
  orgAnalytics: (id) => Api._request('GET', `/analytics/organization/${id}`),

  // Phase 4
  publicHub: () => Api._request('GET', '/ecosystem/hub'),
  listEmergencies: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return Api._request('GET', `/ecosystem/emergencies${qs ? `?${qs}` : ''}`);
  },
  createEmergency: (payload) => Api._request('POST', '/ecosystem/emergencies', { body: payload, auth: true }),
  respondEmergency: (id, eta) =>
    Api._request('POST', `/ecosystem/emergencies/${id}/respond`, { body: { eta }, auth: true }),
  resolveEmergency: (id) =>
    Api._request('POST', `/ecosystem/emergencies/${id}/resolve`, { auth: true }),
  partnerships: (communityId) =>
    Api._request('GET', `/ecosystem/partnerships${communityId ? `?communityId=${communityId}` : ''}`),
  proposePartnership: (payload) =>
    Api._request('POST', '/ecosystem/partnerships', { body: payload, auth: true }),
  acceptPartnership: (id) =>
    Api._request('POST', `/ecosystem/partnerships/${id}/accept`, { auth: true }),
  sharedTalent: (a, b) =>
    Api._request('GET', `/ecosystem/shared-talent?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`),
  integrations: () => Api._request('GET', '/ecosystem/integrations', { auth: true }),
  connectIntegration: (payload) => Api._request('POST', '/ecosystem/integrations', { body: payload, auth: true }),
  createApiKey: (payload) => Api._request('POST', '/ecosystem/api-keys', { body: payload, auth: true }),
  listApiKeys: () => Api._request('GET', '/ecosystem/api-keys', { auth: true }),
  createWebhook: (payload) => Api._request('POST', '/ecosystem/webhooks', { body: payload, auth: true }),
  testWebhooks: () => Api._request('POST', '/ecosystem/webhooks/test', { auth: true }),
  listPlugins: () => Api._request('GET', '/ecosystem/plugins'),
  installPlugin: (payload) => Api._request('POST', '/ecosystem/plugins', { body: payload, auth: true }),

  // Phase 5
  globalNetwork: () => Api._request('GET', '/intelligence/network'),
  reason: (payload) => Api._request('POST', '/intelligence/reason', { body: payload, auth: true }),
  forecast: (communityId) => Api._request('GET', `/intelligence/forecast/${communityId}`),
  syncPassport: () => Api._request('POST', '/intelligence/passport/sync', { auth: true }),
  getPassport: (userId) => Api._request('GET', `/intelligence/passport/${userId}`),
  impact: (communityId) =>
    Api._request('GET', `/intelligence/impact${communityId ? `?communityId=${communityId}` : ''}`),
  recordImpact: (payload) => Api._request('POST', '/intelligence/impact', { body: payload, auth: true }),
  runScenario: (payload) => Api._request('POST', '/intelligence/scenarios', { body: payload, auth: true }),
  listScenarios: (communityId) =>
    Api._request('GET', `/intelligence/scenarios${communityId ? `?communityId=${communityId}` : ''}`),
  research: () => Api._request('GET', '/intelligence/research'),
  createResearch: (payload) => Api._request('POST', '/intelligence/research', { body: payload, auth: true }),

  // Phase 6
  listAgents: (communityId) => Api._request('GET', `/autonomy/agents/${communityId}`),
  runAgents: (communityId, payload) =>
    Api._request('POST', `/autonomy/agents/${communityId}/run`, { body: payload, auth: true }),
  digitalTwin: (communityId) => Api._request('GET', `/autonomy/twin/${communityId}`),
  communityMemory: (communityId) => Api._request('GET', `/autonomy/memory/${communityId}`),
  brainstorm: (communityId, prompt) =>
    Api._request('POST', `/autonomy/brainstorm/${communityId}`, { body: { prompt }, auth: true }),
  autoTeams: (communityId) =>
    Api._request('POST', `/autonomy/auto-teams/${communityId}`, { auth: true }),
  osPulse: (communityId, goal) =>
    Api._request('POST', `/autonomy/os/${communityId}/pulse`, { body: { goal }, auth: true }),
};

Api.decideOpportunity = (id, payload) =>
  Api._request('POST', `/opportunities/${id}/decide`, { body: payload, auth: true });
