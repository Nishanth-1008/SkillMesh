// Phase 3 — Community Analytics, Skill Intelligence, Health, Predictions

const { getUserSkillNames, computeTrustScore } = require('./trust');

function communityMembers(state, communityId) {
  return state.communityMembers.filter((m) => m.communityId === communityId);
}

function memberUsers(state, communityId) {
  const ids = new Set(communityMembers(state, communityId).map((m) => m.userId));
  return state.users.filter((u) => ids.has(u.id));
}

function skillDistribution(state, communityId) {
  const members = memberUsers(state, communityId);
  const memberIds = new Set(members.map((m) => m.id));
  const counts = {};
  for (const us of state.userSkills) {
    if (!memberIds.has(us.userId)) continue;
    const skill = state.skills.find((s) => s.id === us.skillId);
    if (!skill) continue;
    if (!counts[skill.name]) counts[skill.name] = { skill: skill.name, count: 0, experts: 0 };
    counts[skill.name].count++;
    if (us.level === 'expert') counts[skill.name].experts++;
  }
  return Object.values(counts).sort((a, b) => b.count - a.count);
}

function skillGaps(state, communityId) {
  const dist = skillDistribution(state, communityId);
  const present = new Set(dist.map((d) => d.skill));

  // Demand from open opportunities + active projects in the community
  const demand = {};
  for (const opp of state.opportunities) {
    if (opp.communityId !== communityId || opp.status !== 'open') continue;
    for (const s of opp.skillsNeeded || []) {
      demand[s] = (demand[s] || 0) + 2;
    }
  }
  for (const p of state.projects) {
    if (p.communityId !== communityId || p.status !== 'active') continue;
    // infer from goal text tokens already stored as skills elsewhere — use endorsements/skills lightly
  }

  const HIGH_VALUE = [
    'first aid', 'electrical', 'plumbing', 'teaching', 'fundraising',
    'leadership', 'programming', 'design', 'event management', 'robotics',
  ];

  const gaps = [];
  for (const skill of HIGH_VALUE) {
    const supply = present.has(skill) ? dist.find((d) => d.skill === skill).count : 0;
    const need = demand[skill] || (present.has(skill) ? 0 : 1);
    if (supply === 0 || need > supply) {
      gaps.push({
        skill,
        supply,
        demand: Math.max(need, 1),
        severity: supply === 0 ? 'critical' : 'moderate',
        recommendation: supply === 0
          ? `Recruit or train someone in ${skill}`
          : `Increase ${skill} capacity (demand ${need} > supply ${supply})`,
      });
    }
  }

  // Underutilized talent: experts with low contribution count
  const underutilized = [];
  for (const user of memberUsers(state, communityId)) {
    const experts = state.userSkills.filter(
      (us) => us.userId === user.id && us.level === 'expert'
    );
    if (!experts.length) continue;
    const contribs = state.contributions.filter((c) => c.userId === user.id).length;
    if (contribs < 2) {
      underutilized.push({
        user: { id: user.id, name: user.name },
        expertSkills: experts.map((us) => {
          const sk = state.skills.find((s) => s.id === us.skillId);
          return sk ? sk.name : null;
        }).filter(Boolean),
        contributions: contribs,
        suggestion: 'Invite to mentor or lead a project',
      });
    }
  }

  // Emerging skills: recently added skills (by contribution/endorsement activity)
  const emerging = dist.filter((d) => d.count === 1).slice(0, 5).map((d) => ({
    skill: d.skill,
    holders: d.count,
    signal: 'rare_in_community',
  }));

  // High-demand: from open opportunities
  const highDemand = Object.entries(demand)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([skill, score]) => ({ skill, demandScore: score, supply: present.has(skill) ? (dist.find((d) => d.skill === skill) || {}).count || 0 : 0 }));

  return { gaps, underutilized, emerging, highDemand, distribution: dist };
}

function communityHealth(state, communityId) {
  const members = memberUsers(state, communityId);
  const memberIds = new Set(members.map((m) => m.id));
  const n = members.length || 1;

  const available = members.filter((m) => m.availability === 'available').length;
  const projects = state.projects.filter((p) => p.communityId === communityId);
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const collabEdges = state.relationships.filter(
    (r) =>
      r.kind === 'collaborated' &&
      r.fromType === 'person' &&
      memberIds.has(r.fromId) &&
      memberIds.has(r.toId)
  ).length;
  const recentActivity = state.activity.filter(
    (a) => a.communityId === communityId
  ).length;
  const events = (state.events || []).filter((e) => e.communityId === communityId);
  const skillCount = skillDistribution(state, communityId).length;

  // Diversity: unique skills / members
  const diversityScore = Math.min(100, Math.round((skillCount / Math.max(n, 1)) * 40 + skillCount * 3));
  const engagementScore = Math.min(100, Math.round(
    (available / n) * 30 +
    Math.min(recentActivity, 20) * 2 +
    Math.min(events.length, 5) * 6
  ));
  const collaborationScore = Math.min(100, Math.round(
    (collabEdges / n) * 25 +
    activeProjects * 12 +
    Math.min(projects.length, 5) * 5
  ));

  const healthIndex = Math.round(
    engagementScore * 0.35 + collaborationScore * 0.35 + diversityScore * 0.3
  );

  // Activity heatmap: bucket activity by day-of-week (demo)
  const heatmap = [0, 0, 0, 0, 0, 0, 0];
  for (const a of state.activity.filter((x) => x.communityId === communityId)) {
    const day = new Date(a.createdAt).getDay();
    heatmap[day]++;
  }

  return {
    healthIndex,
    engagementScore,
    collaborationScore,
    diversityScore,
    metrics: {
      members: members.length,
      available,
      activeProjects,
      totalProjects: projects.length,
      collaborationEdges: collabEdges,
      uniqueSkills: skillCount,
      events: events.length,
      recentActivity,
    },
    heatmap: {
      labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      values: heatmap,
    },
    impact: {
      opportunitiesFilled: state.opportunityApps.filter((a) => {
        const opp = state.opportunities.find((o) => o.id === a.opportunityId);
        return opp && opp.communityId === communityId && a.status === 'accepted';
      }).length,
      endorsements: state.endorsements.filter((e) => memberIds.has(e.toUserId)).length,
    },
  };
}

function predictNeeds(state, communityId) {
  const { gaps, highDemand, underutilized } = skillGaps(state, communityId);
  const health = communityHealth(state, communityId);
  const members = memberUsers(state, communityId);

  // Leadership identification: high trust + leadership/event skills
  const leaders = members
    .map((u) => {
      const trust = computeTrustScore(state, u.id);
      const skills = getUserSkillNames(state, u.id);
      const leadBoost = skills.some((s) =>
        ['leadership', 'event management', 'teaching', 'fundraising'].includes(s)
      ) ? 15 : 0;
      return {
        user: { id: u.id, name: u.name },
        trustScore: trust.score,
        leadershipScore: Math.min(100, trust.score + leadBoost),
        skills,
      };
    })
    .sort((a, b) => b.leadershipScore - a.leadershipScore)
    .slice(0, 5);

  // Volunteer demand forecast from open opportunities
  const openVol = state.opportunities.filter(
    (o) => o.communityId === communityId && o.status === 'open' &&
      ['volunteer', 'event', 'organization_request'].includes(o.type)
  );

  // Collaboration success prediction for active projects
  const projectPredictions = state.projects
    .filter((p) => p.communityId === communityId && p.status === 'active')
    .map((p) => {
      const joined = state.projectMembers.filter(
        (m) => m.projectId === p.id && m.status === 'joined'
      );
      const avgTrust = joined.length
        ? joined.reduce((s, m) => s + computeTrustScore(state, m.userId).score, 0) / joined.length
        : 0;
      const available = joined.filter((m) => {
        const u = state.users.find((x) => x.id === m.userId);
        return u && u.availability === 'available';
      }).length;
      const successOdds = Math.min(100, Math.round(
        avgTrust * 0.5 + (available / Math.max(joined.length, 1)) * 30 + joined.length * 5
      ));
      return {
        project: { id: p.id, title: p.title },
        members: joined.length,
        avgTrust: Math.round(avgTrust),
        successOdds,
        risk: successOdds < 40 ? 'high' : successOdds < 65 ? 'medium' : 'low',
      };
    });

  const risks = [];
  if (health.healthIndex < 50) risks.push({ type: 'community_health', severity: 'high', detail: 'Overall health index below 50' });
  if (gaps.filter((g) => g.severity === 'critical').length >= 2) {
    risks.push({ type: 'skill_gaps', severity: 'high', detail: 'Multiple critical skill gaps detected' });
  }
  if (health.metrics.available / Math.max(health.metrics.members, 1) < 0.4) {
    risks.push({ type: 'availability', severity: 'medium', detail: 'Fewer than 40% of members currently available' });
  }

  return {
    skillGaps: gaps,
    highDemand,
    underutilized,
    volunteerDemand: {
      openRoles: openVol.length,
      forecast: openVol.length > 2 ? 'rising' : openVol.length > 0 ? 'steady' : 'low',
      roles: openVol.map((o) => ({ id: o.id, title: o.title, skills: o.skillsNeeded })),
    },
    emergingLeaders: leaders,
    projectPredictions,
    risks,
    resourcePlan: gaps.slice(0, 3).map((g) => ({
      action: g.recommendation,
      priority: g.severity,
      skill: g.skill,
    })),
  };
}

function communityDashboard(state, communityId) {
  const community = state.communities.find((c) => c.id === communityId);
  if (!community) return null;
  return {
    community: { id: community.id, name: community.name, description: community.description },
    health: communityHealth(state, communityId),
    skills: skillGaps(state, communityId),
    predictions: predictNeeds(state, communityId),
    activeMembers: memberUsers(state, communityId).map((u) => ({
      id: u.id,
      name: u.name,
      availability: u.availability,
      trust: computeTrustScore(state, u.id).score,
      skills: getUserSkillNames(state, u.id),
    })),
  };
}

function organizationInsights(state, organizationId) {
  const org = state.organizations.find((o) => o.id === organizationId);
  if (!org) return null;
  const members = state.organizationMembers
    .filter((m) => m.organizationId === organizationId)
    .map((m) => {
      const user = state.users.find((u) => u.id === m.userId);
      return user ? { id: user.id, name: user.name, role: m.role, trust: computeTrustScore(state, user.id).score } : null;
    })
    .filter(Boolean);

  const memberIds = new Set(members.map((m) => m.id));
  const opps = state.opportunities.filter(
    (o) => o.organizationId === organizationId || (memberIds.has(o.creatorId) && o.type === 'organization_request')
  );
  const events = (state.events || []).filter(
    (e) => e.communityId === org.communityId && memberIds.has(e.creatorId)
  );
  const apps = state.opportunityApps.filter((a) => opps.some((o) => o.id === a.opportunityId));

  return {
    organization: { id: org.id, name: org.name, type: org.type },
    members,
    volunteerAnalytics: {
      posted: opps.length,
      applications: apps.length,
      accepted: apps.filter((a) => a.status === 'accepted').length,
      fillRate: opps.length ? Math.round((apps.filter((a) => a.status === 'accepted').length / Math.max(opps.length, 1)) * 100) : 0,
    },
    eventAnalytics: {
      total: events.length,
      upcoming: events.filter((e) => e.status === 'upcoming' || e.status === 'open').length,
    },
    resourceUtilization: {
      avgMemberTrust: members.length
        ? Math.round(members.reduce((s, m) => s + m.trust, 0) / members.length)
        : 0,
      activeRecruitments: opps.filter((o) => o.status === 'open').length,
    },
  };
}

function personalizedInsights(state, userId) {
  const user = state.users.find((u) => u.id === userId);
  if (!user) return null;
  const memberships = state.communityMembers.filter((m) => m.userId === userId);
  const skills = getUserSkillNames(state, userId);
  const trust = computeTrustScore(state, userId);

  const insights = [];
  for (const m of memberships) {
    const gaps = skillGaps(state, m.communityId);
    const canFill = gaps.gaps.filter((g) => skills.some((s) => s.includes(g.skill) || g.skill.includes(s)));
    if (canFill.length) {
      insights.push({
        type: 'skill_match',
        communityId: m.communityId,
        message: `Your skills can help fill gaps: ${canFill.map((g) => g.skill).join(', ')}`,
      });
    }
    const leaders = predictNeeds(state, m.communityId).emergingLeaders;
    if (leaders[0] && leaders[0].user.id === userId) {
      insights.push({
        type: 'leadership',
        communityId: m.communityId,
        message: 'You are identified as an emerging leader in this community',
      });
    }
  }

  const openOpps = state.opportunities.filter((o) => o.status === 'open');
  const matches = openOpps.filter((o) =>
    (o.skillsNeeded || []).some((ns) => skills.some((s) => s.includes(ns) || ns.includes(s)))
  ).slice(0, 5);

  if (matches.length) {
    insights.push({
      type: 'opportunity',
      message: `${matches.length} open opportunities match your skills`,
      opportunities: matches.map((o) => ({ id: o.id, title: o.title, type: o.type })),
    });
  }

  return {
    user: { id: user.id, name: user.name },
    trustScore: trust.score,
    insights,
    learningRecommendations: skillGaps(
      state,
      memberships[0] ? memberships[0].communityId : null
    ).highDemand
      .filter((h) => !skills.includes(h.skill))
      .slice(0, 3)
      .map((h) => ({ skill: h.skill, reason: 'High demand in your community' })),
  };
}

module.exports = {
  communityDashboard,
  communityHealth,
  skillDistribution,
  skillGaps,
  predictNeeds,
  organizationInsights,
  personalizedInsights,
  memberUsers,
};
