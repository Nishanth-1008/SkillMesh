// Postgres data layer (Neon-ready).
// Keeps the Phase 1–6 in-memory state shape so routes/services stay unchanged:
//   load()  → hydrate all tables into `state`
//   save()  → debounced full persist of `state` back to Postgres
//
// Configure via DATABASE_URL (see .env.example).

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { config, pgPoolConfig } = require('./config');

const SCHEMA_PATH = path.join(__dirname, 'db', 'schema.sql');
const SEMANTIC_SCHEMA_PATH = path.join(__dirname, 'db', 'semantic_vectors.sql');

function emptyState() {
  return {
    users: [],
    communities: [],
    communityMembers: [],
    skills: [],
    userSkills: [],
    relationships: [],
    projects: [],
    projectMembers: [],
    endorsements: [],
    contributions: [],
    badges: [],
    opportunities: [],
    opportunityApps: [],
    messages: [],
    notifications: [],
    activity: [],
    organizations: [],
    organizationMembers: [],
    events: [],
    eventAttendance: [],
    achievements: [],
    rewardPoints: [],
    moderationLogs: [],
    auditLogs: [],
    reports: [],
    partnerships: [],
    federationLinks: [],
    webhooks: [],
    webhookDeliveries: [],
    apiKeys: [],
    integrations: [],
    emergencies: [],
    emergencyResponses: [],
    plugins: [],
    skillPassports: [],
    credentials: [],
    impactRecords: [],
    researchDatasets: [],
    scenarios: [],
    agents: [],
    agentRuns: [],
    digitalTwins: [],
    communityMemory: [],
    autonomousTasks: [],
    refreshTokens: [],
    passwordResetTokens: [],
    feedback: [],
    semanticVectors: [],
  };
}

/** Ordered for FK-safe truncate (children first) and insert (parents first). */
const TABLE_ORDER_TRUNCATE = [
  'autonomous_tasks', 'community_memory', 'digital_twins', 'agent_runs', 'agents',
  'scenarios', 'research_datasets', 'impact_records', 'credentials', 'skill_passports',
  'plugins', 'emergency_responses', 'emergencies', 'integrations', 'api_keys',
  'webhook_deliveries', 'webhooks', 'federation_links', 'partnerships',
  'reports', 'audit_logs', 'moderation_logs', 'reward_points', 'achievements',
  'event_attendance', 'events',
  'organization_members', 'organizations',
  'activity', 'notifications', 'messages',
  'opportunity_apps', 'opportunities',
  'badges', 'contributions', 'endorsements',
  'project_members', 'projects',
  'relationships', 'user_skills', 'skills',
  'community_members', 'communities', 'refresh_tokens', 'password_reset_tokens', 'feedback', 'users',
  'semantic_vectors',
];

const TABLE_ORDER_INSERT = [...TABLE_ORDER_TRUNCATE].reverse();

/**
 * Map state key → { table, toRow(row), fromRow(pgRow) }
 * Dates stay ISO strings in memory (existing route code expects that).
 */
const COLLECTIONS = {
  users: {
    table: 'users',
    toRow: (r) => [
      r.id, r.name, r.email, r.passwordHash, r.salt, r.location || null,
      r.availability || 'available', r.bio || '', JSON.stringify(r.interests || []),
      r.createdAt || new Date().toISOString(),
    ],
    cols: '(id, name, email, password_hash, salt, location, availability, bio, interests, created_at)',
    placeholders: '($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)',
    fromRow: (r) => ({
      id: r.id, name: r.name, email: r.email,
      passwordHash: r.password_hash, salt: r.salt,
      location: r.location, availability: r.availability,
      bio: r.bio || '', interests: r.interests || [],
      createdAt: iso(r.created_at),
    }),
  },
  communities: {
    table: 'communities',
    toRow: (r) => [r.id, r.name, r.description || '', r.ownerId || null, r.createdAt || new Date().toISOString()],
    cols: '(id, name, description, owner_id, created_at)',
    placeholders: '($1,$2,$3,$4,$5)',
    fromRow: (r) => ({
      id: r.id, name: r.name, description: r.description || '',
      ownerId: r.owner_id, createdAt: iso(r.created_at),
    }),
  },
  communityMembers: {
    table: 'community_members',
    toRow: (r) => [r.id, r.communityId, r.userId, r.role || 'member', r.joinedAt || new Date().toISOString()],
    cols: '(id, community_id, user_id, role, joined_at)',
    placeholders: '($1,$2,$3,$4,$5)',
    fromRow: (r) => ({
      id: r.id, communityId: r.community_id, userId: r.user_id,
      role: r.role, joinedAt: iso(r.joined_at),
    }),
  },
  skills: {
    table: 'skills',
    toRow: (r) => [r.id, r.name],
    cols: '(id, name)',
    placeholders: '($1,$2)',
    fromRow: (r) => ({ id: r.id, name: r.name }),
  },
  userSkills: {
    table: 'user_skills',
    toRow: (r) => [r.id, r.userId, r.skillId, r.level || 'intermediate', r.source || 'stated'],
    cols: '(id, user_id, skill_id, level, source)',
    placeholders: '($1,$2,$3,$4,$5)',
    fromRow: (r) => ({
      id: r.id, userId: r.user_id, skillId: r.skill_id,
      level: r.level, source: r.source,
    }),
  },
  relationships: {
    table: 'relationships',
    toRow: (r) => [
      r.id, r.fromType, r.fromId, r.toType, r.toId, r.kind,
      r.weight ?? 1, r.createdAt || new Date().toISOString(),
    ],
    cols: '(id, from_type, from_id, to_type, to_id, kind, weight, created_at)',
    placeholders: '($1,$2,$3,$4,$5,$6,$7,$8)',
    fromRow: (r) => ({
      id: r.id, fromType: r.from_type, fromId: r.from_id,
      toType: r.to_type, toId: r.to_id, kind: r.kind,
      weight: Number(r.weight) || 1, createdAt: iso(r.created_at),
    }),
  },
  projects: {
    table: 'projects',
    toRow: (r) => [
      r.id, r.title, r.description || '', r.goal || null, r.communityId || null,
      r.ownerId || null, r.status || 'active', r.timeline || null,
      !!r.aiBuilt, !!r.autonomous, r.opportunityId || null,
      r.createdAt || new Date().toISOString(),
    ],
    cols: '(id, title, description, goal, community_id, owner_id, status, timeline, ai_built, autonomous, opportunity_id, created_at)',
    placeholders: '($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
    fromRow: (r) => ({
      id: r.id, title: r.title, description: r.description || '', goal: r.goal,
      communityId: r.community_id, ownerId: r.owner_id, status: r.status,
      timeline: r.timeline, aiBuilt: r.ai_built, autonomous: r.autonomous,
      opportunityId: r.opportunity_id, createdAt: iso(r.created_at),
    }),
  },
  projectMembers: {
    table: 'project_members',
    toRow: (r) => [r.id, r.projectId, r.userId, r.role || 'member', r.status || 'joined', r.joinedAt || null],
    cols: '(id, project_id, user_id, role, status, joined_at)',
    placeholders: '($1,$2,$3,$4,$5,$6)',
    fromRow: (r) => ({
      id: r.id, projectId: r.project_id, userId: r.user_id,
      role: r.role, status: r.status, joinedAt: r.joined_at ? iso(r.joined_at) : null,
    }),
  },
  endorsements: {
    table: 'endorsements',
    toRow: (r) => [r.id, r.fromUserId, r.toUserId, r.skillId, r.note || '', r.createdAt || new Date().toISOString()],
    cols: '(id, from_user_id, to_user_id, skill_id, note, created_at)',
    placeholders: '($1,$2,$3,$4,$5,$6)',
    fromRow: (r) => ({
      id: r.id, fromUserId: r.from_user_id, toUserId: r.to_user_id,
      skillId: r.skill_id, note: r.note || '', createdAt: iso(r.created_at),
    }),
  },
  contributions: {
    table: 'contributions',
    toRow: (r) => [
      r.id, r.userId, r.kind, r.refType || null, r.refId || null,
      r.points ?? 1, r.summary || null, r.createdAt || new Date().toISOString(),
    ],
    cols: '(id, user_id, kind, ref_type, ref_id, points, summary, created_at)',
    placeholders: '($1,$2,$3,$4,$5,$6,$7,$8)',
    fromRow: (r) => ({
      id: r.id, userId: r.user_id, kind: r.kind, refType: r.ref_type,
      refId: r.ref_id, points: r.points, summary: r.summary, createdAt: iso(r.created_at),
    }),
  },
  badges: {
    table: 'badges',
    toRow: (r) => [r.id, r.userId, r.badge, r.awardedAt || new Date().toISOString()],
    cols: '(id, user_id, badge, awarded_at)',
    placeholders: '($1,$2,$3,$4)',
    fromRow: (r) => ({
      id: r.id, userId: r.user_id, badge: r.badge, awardedAt: iso(r.awarded_at),
    }),
  },
  opportunities: {
    table: 'opportunities',
    toRow: (r) => [
      r.id, r.type, r.title, r.description || '', r.communityId || null, r.creatorId || null,
      JSON.stringify(r.skillsNeeded || []), r.location || null, r.status || 'open',
      r.organizationId || null, r.createdAt || new Date().toISOString(),
    ],
    cols: '(id, type, title, description, community_id, creator_id, skills_needed, location, status, organization_id, created_at)',
    placeholders: '($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11)',
    fromRow: (r) => ({
      id: r.id, type: r.type, title: r.title, description: r.description || '',
      communityId: r.community_id, creatorId: r.creator_id,
      skillsNeeded: r.skills_needed || [], location: r.location,
      status: r.status, organizationId: r.organization_id, createdAt: iso(r.created_at),
    }),
  },
  opportunityApps: {
    table: 'opportunity_apps',
    toRow: (r) => [r.id, r.opportunityId, r.userId, r.status || 'pending', r.message || '', r.createdAt || new Date().toISOString()],
    cols: '(id, opportunity_id, user_id, status, message, created_at)',
    placeholders: '($1,$2,$3,$4,$5,$6)',
    fromRow: (r) => ({
      id: r.id, opportunityId: r.opportunity_id, userId: r.user_id,
      status: r.status, message: r.message || '', createdAt: iso(r.created_at),
    }),
  },
  messages: {
    table: 'messages',
    toRow: (r) => [
      r.id, r.fromUserId, r.toUserId || null, r.projectId || null,
      r.body, !!r.announcement, r.createdAt || new Date().toISOString(),
    ],
    cols: '(id, from_user_id, to_user_id, project_id, body, announcement, created_at)',
    placeholders: '($1,$2,$3,$4,$5,$6,$7)',
    fromRow: (r) => ({
      id: r.id, fromUserId: r.from_user_id, toUserId: r.to_user_id,
      projectId: r.project_id, body: r.body, announcement: r.announcement,
      createdAt: iso(r.created_at),
    }),
  },
  notifications: {
    table: 'notifications',
    toRow: (r) => [
      r.id, r.userId, r.type || 'info', r.title, r.body || '',
      r.link || null, !!r.read, r.createdAt || new Date().toISOString(),
    ],
    cols: '(id, user_id, type, title, body, link, read, created_at)',
    placeholders: '($1,$2,$3,$4,$5,$6,$7,$8)',
    fromRow: (r) => ({
      id: r.id, userId: r.user_id, type: r.type, title: r.title,
      body: r.body || '', link: r.link, read: r.read, createdAt: iso(r.created_at),
    }),
  },
  activity: {
    table: 'activity',
    toRow: (r) => [r.id, r.communityId || null, r.actorId || null, r.type, r.summary, r.createdAt || new Date().toISOString()],
    cols: '(id, community_id, actor_id, type, summary, created_at)',
    placeholders: '($1,$2,$3,$4,$5,$6)',
    fromRow: (r) => ({
      id: r.id, communityId: r.community_id, actorId: r.actor_id,
      type: r.type, summary: r.summary, createdAt: iso(r.created_at),
    }),
  },
  organizations: {
    table: 'organizations',
    toRow: (r) => [
      r.id, r.name, r.type, r.description || '', r.ownerId || null,
      r.communityId || null, r.createdAt || new Date().toISOString(),
    ],
    cols: '(id, name, type, description, owner_id, community_id, created_at)',
    placeholders: '($1,$2,$3,$4,$5,$6,$7)',
    fromRow: (r) => ({
      id: r.id, name: r.name, type: r.type, description: r.description || '',
      ownerId: r.owner_id, communityId: r.community_id, createdAt: iso(r.created_at),
    }),
  },
  organizationMembers: {
    table: 'organization_members',
    toRow: (r) => [r.id, r.organizationId, r.userId, r.role || 'member', r.joinedAt || new Date().toISOString()],
    cols: '(id, organization_id, user_id, role, joined_at)',
    placeholders: '($1,$2,$3,$4,$5)',
    fromRow: (r) => ({
      id: r.id, organizationId: r.organization_id, userId: r.user_id,
      role: r.role, joinedAt: iso(r.joined_at),
    }),
  },
  events: {
    table: 'events',
    toRow: (r) => [
      r.id, r.communityId || null, r.title, r.description || '', r.type || 'community',
      r.startAt || null, r.endAt || null, r.location || null, r.creatorId || null,
      JSON.stringify(r.skillsNeeded || []), r.status || 'upcoming',
      r.impactReport ? JSON.stringify(r.impactReport) : null,
      r.createdAt || new Date().toISOString(),
    ],
    cols: '(id, community_id, title, description, type, start_at, end_at, location, creator_id, skills_needed, status, impact_report, created_at)',
    placeholders: '($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12::jsonb,$13)',
    fromRow: (r) => ({
      id: r.id, communityId: r.community_id, title: r.title, description: r.description || '',
      type: r.type, startAt: r.start_at ? iso(r.start_at) : null,
      endAt: r.end_at ? iso(r.end_at) : null, location: r.location,
      creatorId: r.creator_id, skillsNeeded: r.skills_needed || [],
      status: r.status, impactReport: r.impact_report, createdAt: iso(r.created_at),
    }),
  },
  eventAttendance: {
    table: 'event_attendance',
    toRow: (r) => [r.id, r.eventId, r.userId, r.status || 'registered', r.checkedInAt || null],
    cols: '(id, event_id, user_id, status, checked_in_at)',
    placeholders: '($1,$2,$3,$4,$5)',
    fromRow: (r) => ({
      id: r.id, eventId: r.event_id, userId: r.user_id, status: r.status,
      checkedInAt: r.checked_in_at ? iso(r.checked_in_at) : null,
    }),
  },
  achievements: {
    table: 'achievements',
    toRow: (r) => [
      r.id, r.userId, r.achievement, r.label || null, r.points || 0,
      r.awardedAt || new Date().toISOString(),
    ],
    cols: '(id, user_id, achievement, label, points, awarded_at)',
    placeholders: '($1,$2,$3,$4,$5,$6)',
    fromRow: (r) => ({
      id: r.id, userId: r.user_id, achievement: r.achievement,
      label: r.label, points: r.points, awardedAt: iso(r.awarded_at),
    }),
  },
  rewardPoints: {
    table: 'reward_points',
    toRow: (r) => [r.id, r.userId, r.balance || 0, JSON.stringify(r.history || [])],
    cols: '(id, user_id, balance, history)',
    placeholders: '($1,$2,$3,$4::jsonb)',
    fromRow: (r) => ({
      id: r.id, userId: r.user_id, balance: r.balance || 0, history: r.history || [],
    }),
  },
  moderationLogs: {
    table: 'moderation_logs',
    toRow: (r) => [r.id, r.actorId || null, r.targetType, r.targetId, r.action, r.reason || '', r.createdAt || new Date().toISOString()],
    cols: '(id, actor_id, target_type, target_id, action, reason, created_at)',
    placeholders: '($1,$2,$3,$4,$5,$6,$7)',
    fromRow: (r) => ({
      id: r.id, actorId: r.actor_id, targetType: r.target_type, targetId: r.target_id,
      action: r.action, reason: r.reason || '', createdAt: iso(r.created_at),
    }),
  },
  auditLogs: {
    table: 'audit_logs',
    toRow: (r) => [r.id, r.actorId || null, r.action, JSON.stringify(r.meta || {}), r.createdAt || new Date().toISOString()],
    cols: '(id, actor_id, action, meta, created_at)',
    placeholders: '($1,$2,$3,$4::jsonb,$5)',
    fromRow: (r) => ({
      id: r.id, actorId: r.actor_id, action: r.action, meta: r.meta || {}, createdAt: iso(r.created_at),
    }),
  },
  reports: {
    table: 'reports',
    toRow: (r) => [r.id, r.reporterId || null, r.targetType, r.targetId, r.reason, r.status || 'open', r.createdAt || new Date().toISOString()],
    cols: '(id, reporter_id, target_type, target_id, reason, status, created_at)',
    placeholders: '($1,$2,$3,$4,$5,$6,$7)',
    fromRow: (r) => ({
      id: r.id, reporterId: r.reporter_id, targetType: r.target_type, targetId: r.target_id,
      reason: r.reason, status: r.status, createdAt: iso(r.created_at),
    }),
  },
  partnerships: {
    table: 'partnerships',
    toRow: (r) => [r.id, r.fromCommunityId, r.toCommunityId, r.type || 'collaboration', r.status || 'pending', r.createdAt || new Date().toISOString()],
    cols: '(id, from_community_id, to_community_id, type, status, created_at)',
    placeholders: '($1,$2,$3,$4,$5,$6)',
    fromRow: (r) => ({
      id: r.id, fromCommunityId: r.from_community_id, toCommunityId: r.to_community_id,
      type: r.type, status: r.status, createdAt: iso(r.created_at),
    }),
  },
  federationLinks: {
    table: 'federation_links',
    toRow: (r) => [r.id, r.communityIds || [], r.name, r.region || 'local', r.createdAt || new Date().toISOString()],
    cols: '(id, community_ids, name, region, created_at)',
    placeholders: '($1,$2::uuid[],$3,$4,$5)',
    fromRow: (r) => ({
      id: r.id, communityIds: r.community_ids || [], name: r.name,
      region: r.region, createdAt: iso(r.created_at),
    }),
  },
  webhooks: {
    table: 'webhooks',
    toRow: (r) => [
      r.id, r.ownerId || null, r.url, JSON.stringify(r.events || []),
      r.secret || null, r.active !== false, r.createdAt || new Date().toISOString(),
    ],
    cols: '(id, owner_id, url, events, secret, active, created_at)',
    placeholders: '($1,$2,$3,$4::jsonb,$5,$6,$7)',
    fromRow: (r) => ({
      id: r.id, ownerId: r.owner_id, url: r.url, events: r.events || [],
      secret: r.secret, active: r.active, createdAt: iso(r.created_at),
    }),
  },
  webhookDeliveries: {
    table: 'webhook_deliveries',
    toRow: (r) => [
      r.id, r.webhookId || null, r.event, JSON.stringify(r.payload || {}),
      r.status || 'recorded_stub', r.createdAt || new Date().toISOString(),
    ],
    cols: '(id, webhook_id, event, payload, status, created_at)',
    placeholders: '($1,$2,$3,$4::jsonb,$5,$6)',
    fromRow: (r) => ({
      id: r.id, webhookId: r.webhook_id, event: r.event,
      payload: r.payload || {}, status: r.status, createdAt: iso(r.created_at),
    }),
  },
  apiKeys: {
    table: 'api_keys',
    toRow: (r) => [
      r.id, r.userId || null, r.key, r.name || 'default',
      JSON.stringify(r.scopes || []), r.createdAt || new Date().toISOString(), r.lastUsedAt || null,
    ],
    cols: '(id, user_id, key, name, scopes, created_at, last_used_at)',
    placeholders: '($1,$2,$3,$4,$5::jsonb,$6,$7)',
    fromRow: (r) => ({
      id: r.id, userId: r.user_id, key: r.key, name: r.name,
      scopes: r.scopes || [], createdAt: iso(r.created_at),
      lastUsedAt: r.last_used_at ? iso(r.last_used_at) : null,
    }),
  },
  integrations: {
    table: 'integrations',
    toRow: (r) => [
      r.id, r.userId || null, r.communityId || null, r.provider,
      JSON.stringify(r.config || {}), r.status || 'connected_stub',
      r.createdAt || new Date().toISOString(),
    ],
    cols: '(id, user_id, community_id, provider, config, status, created_at)',
    placeholders: '($1,$2,$3,$4,$5::jsonb,$6,$7)',
    fromRow: (r) => ({
      id: r.id, userId: r.user_id, communityId: r.community_id, provider: r.provider,
      config: r.config || {}, status: r.status, createdAt: iso(r.created_at),
    }),
  },
  emergencies: {
    table: 'emergencies',
    toRow: (r) => [
      r.id, r.communityId || null, r.title, r.severity || 'high',
      JSON.stringify(r.skillsNeeded || []), r.status || 'active', r.location || null,
      r.creatorId || null, r.createdAt || new Date().toISOString(), r.resolvedAt || null,
    ],
    cols: '(id, community_id, title, severity, skills_needed, status, location, creator_id, created_at, resolved_at)',
    placeholders: '($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10)',
    fromRow: (r) => ({
      id: r.id, communityId: r.community_id, title: r.title, severity: r.severity,
      skillsNeeded: r.skills_needed || [], status: r.status, location: r.location,
      creatorId: r.creator_id, createdAt: iso(r.created_at),
      resolvedAt: r.resolved_at ? iso(r.resolved_at) : null,
    }),
  },
  emergencyResponses: {
    table: 'emergency_responses',
    toRow: (r) => [r.id, r.emergencyId, r.userId, r.status || 'en_route', r.eta || 20, r.createdAt || new Date().toISOString()],
    cols: '(id, emergency_id, user_id, status, eta, created_at)',
    placeholders: '($1,$2,$3,$4,$5,$6)',
    fromRow: (r) => ({
      id: r.id, emergencyId: r.emergency_id, userId: r.user_id,
      status: r.status, eta: r.eta, createdAt: iso(r.created_at),
    }),
  },
  plugins: {
    table: 'plugins',
    toRow: (r) => [
      r.id, r.name, r.version || '1.0.0', r.enabled !== false,
      JSON.stringify(r.config || {}), r.installedAt || new Date().toISOString(),
      r.installedBy || null,
    ],
    cols: '(id, name, version, enabled, config, installed_at, installed_by)',
    placeholders: '($1,$2,$3,$4,$5::jsonb,$6,$7)',
    fromRow: (r) => ({
      id: r.id, name: r.name, version: r.version, enabled: r.enabled,
      config: r.config || {}, installedAt: iso(r.installed_at), installedBy: r.installed_by,
    }),
  },
  skillPassports: {
    table: 'skill_passports',
    toRow: (r) => [
      r.id, r.userId, JSON.stringify(r.credentials || []),
      JSON.stringify(r.verifications || {}), r.updatedAt || new Date().toISOString(),
    ],
    cols: '(id, user_id, credentials, verifications, updated_at)',
    placeholders: '($1,$2,$3::jsonb,$4::jsonb,$5)',
    fromRow: (r) => ({
      id: r.id, userId: r.user_id, credentials: r.credentials || [],
      verifications: r.verifications || {}, updatedAt: iso(r.updated_at),
    }),
  },
  credentials: {
    table: 'credentials',
    toRow: (r) => [
      r.id, r.userId, r.skill, r.issuer || null, !!r.verified,
      JSON.stringify(r.evidence || {}), r.issuedAt || new Date().toISOString(),
    ],
    cols: '(id, user_id, skill, issuer, verified, evidence, issued_at)',
    placeholders: '($1,$2,$3,$4,$5,$6::jsonb,$7)',
    fromRow: (r) => ({
      id: r.id, userId: r.user_id, skill: r.skill, issuer: r.issuer,
      verified: r.verified, evidence: r.evidence || {}, issuedAt: iso(r.issued_at),
    }),
  },
  impactRecords: {
    table: 'impact_records',
    toRow: (r) => [
      r.id, r.communityId || null, r.userId || null, r.projectId || null,
      JSON.stringify(r.sdgGoals || []), r.metric, r.value ?? 0, r.unit || 'count',
      r.createdAt || new Date().toISOString(),
    ],
    cols: '(id, community_id, user_id, project_id, sdg_goals, metric, value, unit, created_at)',
    placeholders: '($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9)',
    fromRow: (r) => ({
      id: r.id, communityId: r.community_id, userId: r.user_id, projectId: r.project_id,
      sdgGoals: r.sdg_goals || [], metric: r.metric, value: Number(r.value) || 0,
      unit: r.unit, createdAt: iso(r.created_at),
    }),
  },
  researchDatasets: {
    table: 'research_datasets',
    toRow: (r) => [
      r.id, r.title, r.description || '', r.open !== false,
      JSON.stringify(r.records || []), r.createdAt || new Date().toISOString(),
      r.createdBy || null,
    ],
    cols: '(id, title, description, open, records, created_at, created_by)',
    placeholders: '($1,$2,$3,$4,$5::jsonb,$6,$7)',
    fromRow: (r) => ({
      id: r.id, title: r.title, description: r.description || '', open: r.open,
      records: r.records || [], createdAt: iso(r.created_at), createdBy: r.created_by,
    }),
  },
  scenarios: {
    table: 'scenarios',
    toRow: (r) => [
      r.id, r.communityId || null, r.name,
      JSON.stringify(r.assumptions || {}), JSON.stringify(r.results || {}),
      r.createdAt || new Date().toISOString(),
    ],
    cols: '(id, community_id, name, assumptions, results, created_at)',
    placeholders: '($1,$2,$3,$4::jsonb,$5::jsonb,$6)',
    fromRow: (r) => ({
      id: r.id, communityId: r.community_id, name: r.name,
      assumptions: r.assumptions || {}, results: r.results || {}, createdAt: iso(r.created_at),
    }),
  },
  agents: {
    table: 'agents',
    toRow: (r) => [
      r.id, r.type, r.communityId || null, r.status || 'idle', r.lastRunAt || null,
      JSON.stringify(r.config || {}), JSON.stringify(r.memory || []),
    ],
    cols: '(id, type, community_id, status, last_run_at, config, memory)',
    placeholders: '($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)',
    fromRow: (r) => ({
      id: r.id, type: r.type, communityId: r.community_id, status: r.status,
      lastRunAt: r.last_run_at ? iso(r.last_run_at) : null,
      config: r.config || {}, memory: r.memory || [],
    }),
  },
  agentRuns: {
    table: 'agent_runs',
    toRow: (r) => [
      r.id, r.agentId || null, JSON.stringify(r.input || {}),
      JSON.stringify(r.output || {}), r.status || 'completed',
      r.createdAt || new Date().toISOString(),
    ],
    cols: '(id, agent_id, input, output, status, created_at)',
    placeholders: '($1,$2,$3::jsonb,$4::jsonb,$5,$6)',
    fromRow: (r) => ({
      id: r.id, agentId: r.agent_id, input: r.input || {}, output: r.output || {},
      status: r.status, createdAt: iso(r.created_at),
    }),
  },
  digitalTwins: {
    table: 'digital_twins',
    toRow: (r) => [
      r.id, r.communityId, JSON.stringify(r.snapshot || {}),
      r.updatedAt || new Date().toISOString(),
    ],
    cols: '(id, community_id, snapshot, updated_at)',
    placeholders: '($1,$2,$3::jsonb,$4)',
    fromRow: (r) => ({
      id: r.id, communityId: r.community_id, snapshot: r.snapshot || {},
      updatedAt: iso(r.updated_at),
    }),
  },
  communityMemory: {
    table: 'community_memory',
    toRow: (r) => [
      r.id, r.communityId || null, r.kind || 'note', r.content,
      JSON.stringify(r.tags || []), r.createdAt || new Date().toISOString(),
    ],
    cols: '(id, community_id, kind, content, tags, created_at)',
    placeholders: '($1,$2,$3,$4,$5::jsonb,$6)',
    fromRow: (r) => ({
      id: r.id, communityId: r.community_id, kind: r.kind, content: r.content,
      tags: r.tags || [], createdAt: iso(r.created_at),
    }),
  },
  autonomousTasks: {
    table: 'autonomous_tasks',
    toRow: (r) => [
      r.id, r.communityId || null, r.type, JSON.stringify(r.payload || {}),
      r.status || 'pending', r.assignedAgent || null,
      r.createdAt || new Date().toISOString(), r.completedAt || null,
    ],
    cols: '(id, community_id, type, payload, status, assigned_agent, created_at, completed_at)',
    placeholders: '($1,$2,$3,$4::jsonb,$5,$6,$7,$8)',
    fromRow: (r) => ({
      id: r.id, communityId: r.community_id, type: r.type, payload: r.payload || {},
      status: r.status, assignedAgent: r.assigned_agent,
      createdAt: iso(r.created_at),
      completedAt: r.completed_at ? iso(r.completed_at) : null,
    }),
  },
  refreshTokens: {
    table: 'refresh_tokens',
    toRow: (r) => [
      r.id, r.userId, r.tokenHash, r.expiresAt || new Date().toISOString(),
      r.createdAt || new Date().toISOString(), r.revokedAt || null,
    ],
    cols: '(id, user_id, token_hash, expires_at, created_at, revoked_at)',
    placeholders: '($1,$2,$3,$4,$5,$6)',
    fromRow: (r) => ({
      id: r.id, userId: r.user_id, tokenHash: r.token_hash,
      expiresAt: iso(r.expires_at), createdAt: iso(r.created_at),
      revokedAt: r.revoked_at ? iso(r.revoked_at) : null,
    }),
  },
  passwordResetTokens: {
    table: 'password_reset_tokens',
    toRow: (r) => [
      r.id, r.userId, r.tokenHash, r.expiresAt || new Date().toISOString(),
      r.createdAt || new Date().toISOString(), r.usedAt || null,
    ],
    cols: '(id, user_id, token_hash, expires_at, created_at, used_at)',
    placeholders: '($1,$2,$3,$4,$5,$6)',
    fromRow: (r) => ({
      id: r.id, userId: r.user_id, tokenHash: r.token_hash,
      expiresAt: iso(r.expires_at), createdAt: iso(r.created_at),
      usedAt: r.used_at ? iso(r.used_at) : null,
    }),
  },
  feedback: {
    table: 'feedback',
    toRow: (r) => [
      r.id, r.userId, r.targetType, r.targetId, r.rating,
      r.context || '', r.createdAt || new Date().toISOString(),
    ],
    cols: '(id, user_id, target_type, target_id, rating, context, created_at)',
    placeholders: '($1,$2,$3,$4,$5,$6,$7)',
    fromRow: (r) => ({
      id: r.id, userId: r.user_id, targetType: r.target_type, targetId: r.target_id,
      rating: r.rating, context: r.context || '', createdAt: iso(r.created_at),
    }),
  },
  semanticVectors: {
    table: 'semantic_vectors',
    toRow: (r) => [
      r.id, r.entityType, r.entityId, r.text,
      vectorToString(r.vector), r.createdAt || new Date().toISOString(),
      r.updatedAt || new Date().toISOString(),
    ],
    cols: '(id, entity_type, entity_id, text, vector, created_at, updated_at)',
    placeholders: '($1,$2,$3,$4,$5,$6,$7)',
    fromRow: (r) => ({
      id: r.id, entityType: r.entity_type, entityId: r.entity_id, text: r.text,
      vector: parseVector(r.vector), createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
    }),
  },
};

function vectorToString(vector) {
  if (!Array.isArray(vector)) return null;
  return `[${vector.map((v) => Number(v).toFixed(6)).join(',')}]`;
}

function parseVector(value) {
  if (!value) return null;
  const s = String(value).trim().replace(/^\[|\]$/g, '');
  if (!s) return [];
  return s.split(',').map((n) => parseFloat(n)).filter((n) => !Number.isNaN(n));
}

/** True when Postgres is active AND the pgvector table exists. Cached. */
let semanticTableCached = null;
async function semanticTableAvailable() {
  if (!usePostgres) return false;
  if (semanticTableCached !== null) return semanticTableCached;
  try {
    const { rows } = await poolQuery("SELECT to_regclass('public.semantic_vectors') AS t");
    semanticTableCached = Boolean(rows[0] && rows[0].t);
  } catch {
    semanticTableCached = false;
  }
  return semanticTableCached;
}

function iso(v) {
  if (!v) return null;
  if (typeof v === 'string') return v;
  return new Date(v).toISOString();
}

let state = null;
let writeQueued = false;
let persistInFlight = null;
let dirty = false;

const JSON_DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
const usePostgres = !!(config.DATABASE_URL || config.PGHOST);

let pool = null;
let poolBroken = false;

function resetPool() {
  if (pool) {
    try {
      pool.end();
    } catch { /* already ended */ }
  }
  pool = null;
  poolBroken = false;
}

function getPool() {
  if (!usePostgres) {
    return null;
  }
  if (!pool) {
    pool = new Pool(pgPoolConfig());
    pool.on('error', (err) => {
      console.error('[db] pool error:', err.message);
      // A fatal connection error leaves the pool unusable — recreate it so the
      // next query gets a fresh connection (automatic reconnection).
      if (!poolBroken) {
        poolBroken = true;
        setImmediate(() => {
          if (poolBroken) resetPool();
        });
      }
    });
  }
  return pool;
}

// Postgres error codes / Node socket codes treated as transient (retryable).
function isTransient(err) {
  if (!err) return false;
  const codes = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE', 'ECONNABORTED', '57P01', '57P02', '57P03'];
  return codes.includes(err.code) || codes.some((c) => String(err.message || '').includes(c));
}

// Query with bounded retry for transient failures. On retry the broken pool is
// discarded so the connection attempt starts clean.
async function poolQuery(text, params, { retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const p = getPool();
      if (!p) throw new Error('Postgres is not enabled');
      const result = await p.query(text, params);
      poolBroken = false;
      return result;
    } catch (err) {
      lastErr = err;
      if (!isTransient(err)) throw err;
      if (poolBroken) resetPool();
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// Liveness probe for health checks.
async function ping() {
  if (!usePostgres) return { ok: false, mode: 'json' };
  await poolQuery('SELECT 1');
  return { ok: true, mode: 'postgres' };
}

async function migrate() {
  if (!usePostgres) {
    const dir = path.dirname(JSON_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    console.log('[db] JSON store folder verified');
    return;
  }
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await poolQuery(sql);
  console.log('[db] schema applied');

  // pgvector is optional: if the extension/table can't be created (managed
  // Postgres without vector support), degrade to in-memory cosine search.
  semanticTableCached = null;
  try {
    const semanticSql = fs.readFileSync(SEMANTIC_SCHEMA_PATH, 'utf8');
    await poolQuery(semanticSql);
    if (await semanticTableAvailable()) {
      console.log('[db] pgvector ready (semantic_vectors + hnsw)');
    }
  } catch (e) {
    semanticTableCached = false;
    console.warn(`[db] pgvector unavailable, semantic search uses in-memory cosine: ${e.message}`);
  }
}

async function hydrate() {
  if (!usePostgres) {
    if (fs.existsSync(JSON_DB_PATH)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf8'));
        state = { ...emptyState(), ...parsed };
        console.log('[db] hydrated state from JSON file');
      } catch (err) {
        console.error('[db] error parsing db.json, starting with empty state:', err.message);
        state = emptyState();
      }
    } else {
      state = emptyState();
    }
    return state;
  }

  const next = emptyState();
  for (const [key, meta] of Object.entries(COLLECTIONS)) {
    if (key === 'semanticVectors' && !(await semanticTableAvailable())) continue;
    const { rows } = await poolQuery(`SELECT * FROM ${meta.table}`);
    next[key] = rows.map(meta.fromRow);
  }
  state = next;
  return state;
}

async function persist() {
  if (!state) return;
  if (!usePostgres) {
    try {
      fs.writeFileSync(JSON_DB_PATH, JSON.stringify(state, null, 2), 'utf8');
    } catch (err) {
      console.error('[db] failed to write JSON file:', err.message);
      throw err;
    }
    return;
  }

  // Serialize concurrent writes: if a persist is already running, wait for it.
  // A failed persist must never wedge the write path, so the in-flight slot is
  // always cleared (see the outer `.finally`).
  if (persistInFlight) return persistInFlight;

  const p = getPool();
  persistInFlight = p.connect().then(async (client) => {
    try {
      const semanticOk = await semanticTableAvailable();
      await client.query('BEGIN');
      for (const table of TABLE_ORDER_TRUNCATE) {
        if (table === 'semantic_vectors' && !semanticOk) continue;
        await client.query(`DELETE FROM ${table}`);
      }
      for (const table of TABLE_ORDER_INSERT) {
        const entry = Object.entries(COLLECTIONS).find(([, m]) => m.table === table);
        if (!entry) continue;
        const [key, meta] = entry;
        if (key === 'semanticVectors' && !semanticOk) continue;
        const rows = state[key] || [];
        for (const row of rows) {
          await client.query(
            `INSERT INTO ${meta.table} ${meta.cols} VALUES ${meta.placeholders}`,
            meta.toRow(row)
          );
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch { /* connection already dead */ }
      console.error('[db] persist failed:', e.message);
      throw e;
    } finally {
      client.release();
    }
  }).finally(() => {
    persistInFlight = null;
  });

  return persistInFlight;
}

async function load() {
  await migrate();
  await hydrate();
  console.log(`[db] loaded from ${usePostgres ? 'Postgres' : 'JSON file'}`);
  return state;
}

function save() {
  dirty = true;
  if (writeQueued) return;
  writeQueued = true;
  setImmediate(() => {
    writeQueued = false;
    flush().catch((e) => console.error('[db] save error:', e.message));
  });
}

// Coalesces rapid saves (e.g. several requests in the same tick or while a
// Postgres persist is mid-flight) so the FINAL state always reaches disk:
// any change made while a persist runs marks dirty again and triggers a
// follow-up write once the current one finishes.
async function flush() {
  while (dirty) {
    dirty = false;
    await persist();
  }
}

function getState() {
  if (!state) {
    throw new Error('Database not loaded — call await load() before handling requests');
  }
  return state;
}

async function resetAllData() {
  if (!usePostgres) {
    state = emptyState();
    await persist();
    return state;
  }

  const p = getPool();
  const client = await p.connect();
  try {
    const semanticOk = await semanticTableAvailable();
    await client.query('BEGIN');
    for (const table of TABLE_ORDER_TRUNCATE) {
      if (table === 'semantic_vectors' && !semanticOk) continue;
      await client.query(`DELETE FROM ${table}`);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  state = emptyState();
  return state;
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getState,
  save,
  load,
  persist,
  migrate,
  hydrate,
  resetAllData,
  close,
  emptyState,
  getPool,
  poolQuery,
  ping,
  semanticTableAvailable,
  isPostgres: () => usePostgres,
  // legacy name kept so old seed imports don't explode during transition
  DB_FILE: JSON_DB_PATH,
};
