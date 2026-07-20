// Phase 6 — Autonomous agents, digital twin, collective memory, auto-collaboration

const crypto = require('crypto');
const { communityDashboard, skillGaps, predictNeeds, memberUsers } = require('./analytics');
const { buildTeam, findHiddenExperts } = require('./teamBuilder');
const { createEmergency } = require('./ecosystem');
const { extractSkills } = require('../nlp/skillExtractor');
const { notify, logActivity } = require('./notify');
const { awardPoints, grantAchievement } = require('./gamification');
const { addRelationship } = require('../graph/relationships');
const { recordContribution } = require('./trust');

const AGENT_TYPES = [
  'community_manager',
  'team_builder',
  'mentor',
  'volunteer',
  'event_coordinator',
  'emergency_response',
];

function ensureAgents(state, communityId) {
  const existing = state.agents.filter((a) => a.communityId === communityId);
  if (existing.length) return existing;
  const created = [];
  for (const type of AGENT_TYPES) {
    const agent = {
      id: crypto.randomUUID(),
      type,
      communityId,
      status: 'idle',
      lastRunAt: null,
      config: { auto: true },
      memory: [],
    };
    state.agents.push(agent);
    created.push(agent);
  }
  return created;
}

function remember(agent, note) {
  agent.memory.push({ note, at: new Date().toISOString() });
  if (agent.memory.length > 50) agent.memory = agent.memory.slice(-50);
}

function runAgent(state, agent, input = {}) {
  const communityId = agent.communityId;
  let output = {};

  switch (agent.type) {
    case 'community_manager': {
      const dash = communityDashboard(state, communityId);
      const preds = dash.predictions;
      const actions = [];
      for (const gap of (preds.skillGaps || []).slice(0, 3)) {
        actions.push({
          type: 'recruit_or_train',
          skill: gap.skill,
          severity: gap.severity,
          suggestion: gap.recommendation,
        });
      }
      for (const risk of preds.risks || []) {
        actions.push({ type: 'mitigate_risk', risk });
      }
      // Auto-onboarding tip in community memory
      state.communityMemory.push({
        id: crypto.randomUUID(),
        communityId,
        kind: 'summary',
        content: `Health index ${dash.health.healthIndex}. Top action: ${actions[0] ? actions[0].suggestion || actions[0].type : 'maintain course'}.`,
        tags: ['auto', 'manager'],
        createdAt: new Date().toISOString(),
      });
      output = {
        healthIndex: dash.health.healthIndex,
        actions,
        summary: `Community Manager reviewed health (${dash.health.healthIndex}/100) and proposed ${actions.length} actions.`,
      };
      break;
    }
    case 'team_builder': {
      const goal = input.goal || 'Assemble a balanced project team';
      const understanding = extractSkills(goal);
      let skills = understanding.skills.filter((s) =>
        !['strengthen', 'readiness', 'improve', 'community', 'week', 'this'].includes(s)
      );
      if (skills.length < 2) skills = ['programming', 'design', 'leadership', 'first aid'];
      const team = buildTeam(state, {
        skills,
        communityId,
        size: input.size || 4,
      });
      let project = null;
      if (input.autoCreate && input.ownerId && team.team.length) {
        project = {
          id: crypto.randomUUID(),
          title: `Auto: ${goal.slice(0, 60)}`,
          description: goal,
          goal,
          communityId,
          ownerId: input.ownerId,
          status: 'active',
          timeline: null,
          createdAt: new Date().toISOString(),
          aiBuilt: true,
          autonomous: true,
        };
        state.projects.push(project);
        state.projectMembers.push({
          id: crypto.randomUUID(),
          projectId: project.id,
          userId: input.ownerId,
          role: 'owner',
          status: 'joined',
          joinedAt: new Date().toISOString(),
        });
        for (const m of team.team) {
          if (m.user.id === input.ownerId) continue;
          state.projectMembers.push({
            id: crypto.randomUUID(),
            projectId: project.id,
            userId: m.user.id,
            role: 'member',
            status: 'invited',
            joinedAt: null,
          });
          notify(state, {
            userId: m.user.id,
            type: 'invite',
            title: `Agent invited you: ${project.title}`,
            body: 'Team Builder Agent assembled this team automatically.',
            link: `#project?id=${project.id}`,
          });
        }
      }
      output = {
        goal,
        team,
        project: project ? { id: project.id, title: project.title } : null,
        summary: `Team Builder assembled ${team.team.length} people (${team.coverage}% coverage, success ${team.successPrediction}%).`,
      };
      break;
    }
    case 'mentor': {
      const gaps = skillGaps(state, communityId);
      const learners = gaps.gaps.slice(0, 3);
      const mentors = [];
      for (const gap of learners) {
        const experts = findHiddenExperts(state, { skills: [gap.skill], communityId, limit: 3 });
        const members = memberUsers(state, communityId).filter((u) =>
          require('./trust').getUserSkillNames(state, u.id).some((s) => s.includes(gap.skill) || gap.skill.includes(s))
        );
        mentors.push({
          skill: gap.skill,
          suggestedMentors: members.slice(0, 3).map((u) => ({ id: u.id, name: u.name })),
          hidden: experts.slice(0, 2),
        });
      }
      output = {
        mentorshipPlans: mentors,
        summary: `Mentor Agent proposed plans for ${mentors.length} skill gaps.`,
      };
      break;
    }
    case 'volunteer': {
      const open = state.opportunities.filter(
        (o) => o.communityId === communityId && o.status === 'open'
      );
      const matches = [];
      for (const opp of open) {
        const candidates = memberUsers(state, communityId)
          .filter((u) => u.availability === 'available')
          .map((u) => {
            const skills = require('./trust').getUserSkillNames(state, u.id);
            const hit = (opp.skillsNeeded || []).filter((ns) =>
              skills.some((s) => s.includes(ns) || ns.includes(s))
            );
            return hit.length || !(opp.skillsNeeded || []).length
              ? { user: { id: u.id, name: u.name }, matched: hit, opportunityId: opp.id }
              : null;
          })
          .filter(Boolean)
          .slice(0, 3);
        if (candidates.length) {
          matches.push({ opportunity: { id: opp.id, title: opp.title }, candidates });
          for (const c of candidates.slice(0, 2)) {
            notify(state, {
              userId: c.user.id,
              type: 'opportunity',
              title: `Volunteer match: ${opp.title}`,
              body: 'Volunteer Agent thinks you are a strong fit.',
              link: `#opportunity?id=${opp.id}`,
            });
          }
        }
      }
      output = {
        matches,
        summary: `Volunteer Agent matched candidates to ${matches.length} opportunities.`,
      };
      break;
    }
    case 'event_coordinator': {
      const upcoming = (state.events || []).filter(
        (e) => e.communityId === communityId && ['upcoming', 'open'].includes(e.status)
      );
      const reminders = [];
      for (const event of upcoming) {
        const registered = state.eventAttendance.filter(
          (a) => a.eventId === event.id && a.status === 'registered'
        );
        for (const r of registered) {
          notify(state, {
            userId: r.userId,
            type: 'reminder',
            title: `Reminder: ${event.title}`,
            body: `Starts ${event.startAt || 'soon'}.`,
            link: `#events`,
          });
          reminders.push(r.userId);
        }
        // Suggest staffing gaps
      }
      const preds = predictNeeds(state, communityId);
      output = {
        upcoming: upcoming.length,
        remindersSent: reminders.length,
        suggestedEvents: preds.skillGaps.slice(0, 2).map((g) => ({
          title: `${g.skill} workshop`,
          reason: g.recommendation,
        })),
        summary: `Event Coordinator sent ${reminders.length} reminders and suggested ${Math.min(2, preds.skillGaps.length)} workshops.`,
      };
      break;
    }
    case 'emergency_response': {
      if (input.title) {
        const result = createEmergency(state, {
          communityId,
          title: input.title,
          severity: input.severity || 'critical',
          skillsNeeded: input.skillsNeeded || extractSkills(input.title).skills,
          location: input.location,
          creatorId: input.creatorId,
        });
        for (const r of result.recommendedResponders.slice(0, 5)) {
          notify(state, {
            userId: r.user.id,
            type: 'emergency',
            title: `EMERGENCY: ${result.emergency.title}`,
            body: `You matched (${r.matchedSkills.join(', ')}). ETA ~${r.etaMinutes}m.`,
            link: `#emergency?id=${result.emergency.id}`,
          });
          grantAchievement(state, r.user.id, 'emergency_responder');
        }
        output = {
          emergency: result.emergency,
          alerted: result.recommendedResponders.slice(0, 5).length,
          summary: `Emergency Response Agent opened incident and alerted ${Math.min(5, result.recommendedResponders.length)} people.`,
        };
      } else {
        const active = state.emergencies.filter(
          (e) => e.communityId === communityId && e.status === 'active'
        );
        output = {
          activeIncidents: active.length,
          summary: `Monitoring ${active.length} active incidents.`,
        };
      }
      break;
    }
    default:
      output = { summary: `Unknown agent type ${agent.type}` };
  }

  agent.status = 'idle';
  agent.lastRunAt = new Date().toISOString();
  remember(agent, output.summary);

  const run = {
    id: crypto.randomUUID(),
    agentId: agent.id,
    input,
    output,
    status: 'completed',
    createdAt: new Date().toISOString(),
  };
  state.agentRuns.push(run);

  logActivity(state, {
    communityId,
    actorId: input.ownerId || input.creatorId || null,
    type: 'agent_run',
    summary: `${agent.type} agent: ${output.summary}`,
  });

  return { agent, run, output };
}

function runAllAgents(state, communityId, input = {}) {
  const agents = ensureAgents(state, communityId);
  return agents.map((a) => runAgent(state, a, input));
}

function buildDigitalTwin(state, communityId) {
  const dash = communityDashboard(state, communityId);
  if (!dash) return null;

  const members = memberUsers(state, communityId);
  const snapshot = {
    timestamp: new Date().toISOString(),
    community: dash.community,
    health: dash.health,
    people: members.map((u) => ({
      id: u.id,
      name: u.name,
      location: u.location,
      availability: u.availability,
      skills: require('./trust').getUserSkillNames(state, u.id),
    })),
    infrastructure: {
      projects: state.projects.filter((p) => p.communityId === communityId).map((p) => ({
        id: p.id, title: p.title, status: p.status,
      })),
      organizations: state.organizations.filter((o) => o.communityId === communityId).map((o) => ({
        id: o.id, name: o.name, type: o.type,
      })),
      events: (state.events || []).filter((e) => e.communityId === communityId).map((e) => ({
        id: e.id, title: e.title, status: e.status, startAt: e.startAt,
      })),
      emergencies: state.emergencies.filter((e) => e.communityId === communityId && e.status === 'active'),
    },
    resources: {
      skillSlots: dash.skills.distribution,
      openOpportunities: state.opportunities.filter(
        (o) => o.communityId === communityId && o.status === 'open'
      ).length,
    },
    predictions: dash.predictions,
  };

  let twin = state.digitalTwins.find((t) => t.communityId === communityId);
  if (!twin) {
    twin = { id: crypto.randomUUID(), communityId, snapshot, updatedAt: snapshot.timestamp };
    state.digitalTwins.push(twin);
  } else {
    twin.snapshot = snapshot;
    twin.updatedAt = snapshot.timestamp;
  }
  return twin;
}

function addCommunityMemory(state, { communityId, kind, content, tags }) {
  const entry = {
    id: crypto.randomUUID(),
    communityId,
    kind: kind || 'note',
    content,
    tags: tags || [],
    createdAt: new Date().toISOString(),
  };
  state.communityMemory.push(entry);
  return entry;
}

function collectiveBrainstorm(state, { communityId, prompt }) {
  const understanding = extractSkills(prompt || '');
  const members = memberUsers(state, communityId);
  const ideas = [];

  // Gather related memory
  const memory = state.communityMemory
    .filter((m) => m.communityId === communityId)
    .slice(-10);

  ideas.push({
    source: 'memory',
    text: memory.length
      ? `Prior community knowledge: ${memory.map((m) => m.content).slice(0, 3).join(' | ')}`
      : 'No prior memory — this is a fresh brainstorm.',
  });

  const relevant = members.filter((u) => {
    const skills = require('./trust').getUserSkillNames(state, u.id);
    return understanding.skills.some((qs) =>
      skills.some((s) => s.includes(qs) || qs.includes(s))
    );
  });

  for (const u of relevant.slice(0, 5)) {
    const skills = require('./trust').getUserSkillNames(state, u.id);
    ideas.push({
      source: 'member',
      user: { id: u.id, name: u.name },
      text: `${u.name} (${skills.slice(0, 3).join(', ')}) could contribute expertise to: ${prompt}`,
    });
  }

  const gaps = skillGaps(state, communityId).gaps;
  ideas.push({
    source: 'gap_analysis',
    text: gaps.length
      ? `Watch skill gaps while pursuing this: ${gaps.slice(0, 3).map((g) => g.skill).join(', ')}`
      : 'No critical skill gaps blocking this idea.',
  });

  const entry = addCommunityMemory(state, {
    communityId,
    kind: 'brainstorm',
    content: `Brainstorm on "${prompt}": ${ideas.length} ideas generated.`,
    tags: ['brainstorm', ...understanding.skills],
  });

  return { prompt, understanding, ideas, memoryId: entry.id };
}

function autoFormTeams(state, communityId, ownerId) {
  const openOpps = state.opportunities.filter(
    (o) => o.communityId === communityId && o.status === 'open'
  );
  const formed = [];
  for (const opp of openOpps.slice(0, 3)) {
    const skills = opp.skillsNeeded && opp.skillsNeeded.length
      ? opp.skillsNeeded
      : extractSkills(opp.title + ' ' + (opp.description || '')).skills;
    const team = buildTeam(state, { skills, communityId, size: 3 });
    if (team.team.length < 2) continue;

    const project = {
      id: crypto.randomUUID(),
      title: `Auto-team: ${opp.title}`,
      description: `Autonomously formed for opportunity: ${opp.title}`,
      goal: opp.title,
      communityId,
      ownerId: ownerId || opp.creatorId,
      status: 'active',
      timeline: null,
      createdAt: new Date().toISOString(),
      autonomous: true,
      opportunityId: opp.id,
    };
    state.projects.push(project);
    const oid = project.ownerId;
    state.projectMembers.push({
      id: crypto.randomUUID(),
      projectId: project.id,
      userId: oid,
      role: 'owner',
      status: 'joined',
      joinedAt: new Date().toISOString(),
    });
    for (const m of team.team) {
      if (m.user.id === oid) continue;
      state.projectMembers.push({
        id: crypto.randomUUID(),
        projectId: project.id,
        userId: m.user.id,
        role: 'member',
        status: 'invited',
        joinedAt: null,
      });
      notify(state, {
        userId: m.user.id,
        type: 'invite',
        title: `Auto-formed team: ${project.title}`,
        body: 'SkillMesh autonomously matched you to this opportunity.',
        link: `#project?id=${project.id}`,
      });
    }
    addRelationship(state, {
      fromType: 'person', fromId: oid,
      toType: 'project', toId: project.id,
      kind: 'owns',
    });
    formed.push({ project: { id: project.id, title: project.title }, team, opportunity: { id: opp.id, title: opp.title } });
  }

  state.autonomousTasks.push({
    id: crypto.randomUUID(),
    communityId,
    type: 'auto_form_teams',
    payload: { formed: formed.length },
    status: 'completed',
    assignedAgent: 'team_builder',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  });

  return { formed, count: formed.length };
}

module.exports = {
  AGENT_TYPES,
  ensureAgents,
  runAgent,
  runAllAgents,
  buildDigitalTwin,
  addCommunityMemory,
  collectiveBrainstorm,
  autoFormTeams,
};
