// AI Team Builder + hidden expert discovery endpoints (Phase 2).

const crypto = require('crypto');
const { Router } = require('../utils/router');
const { getState, save } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/requireAuth');
const { extractSkills } = require('../nlp/skillExtractor');
const { buildTeam, findHiddenExperts } = require('../services/teamBuilder');
const { addRelationship } = require('../graph/relationships');
const { recordContribution } = require('../services/trust');
const { notify, logActivity } = require('../services/notify');

const router = new Router();

// POST /api/teams/build — natural language goal → balanced team suggestion
router.post('/build', optionalAuth, (req, res, next) => {
  try {
    const { goal, communityId, size, skills: explicitSkills, createProject } = req.body;
    if (!goal && !(explicitSkills && explicitSkills.length)) {
      const err = new Error('goal (natural language) or skills[] is required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const understanding = goal
      ? extractSkills(goal)
      : { intent: 'build_team', skills: explicitSkills || [], urgent: false, locationHint: false };

    const neededSkills = (explicitSkills && explicitSkills.length)
      ? explicitSkills
      : understanding.skills;

    const result = buildTeam(state, {
      skills: neededSkills,
      communityId,
      size: size || 4,
      excludeUserIds: req.user ? [] : [],
    });

    let project = null;
    if (createProject && req.user && result.team.length) {
      project = {
        id: crypto.randomUUID(),
        title: goal ? goal.slice(0, 80) : `Team for ${neededSkills.join(', ')}`,
        description: goal || '',
        goal: goal || neededSkills.join(', '),
        communityId: communityId || null,
        ownerId: req.user.id,
        status: 'active',
        timeline: null,
        createdAt: new Date().toISOString(),
        aiBuilt: true,
      };
      state.projects.push(project);
      state.projectMembers.push({
        id: crypto.randomUUID(),
        projectId: project.id,
        userId: req.user.id,
        role: 'owner',
        status: 'joined',
        joinedAt: new Date().toISOString(),
      });
      for (const member of result.team) {
        if (member.user.id === req.user.id) continue;
        state.projectMembers.push({
          id: crypto.randomUUID(),
          projectId: project.id,
          userId: member.user.id,
          role: 'member',
          status: 'invited',
          joinedAt: null,
        });
        notify(state, {
          userId: member.user.id,
          type: 'invite',
          title: `AI team invite: ${project.title}`,
          body: 'SkillMesh suggested you for this team based on skills and compatibility.',
          link: `#project?id=${project.id}`,
        });
      }
      addRelationship(state, {
        fromType: 'person', fromId: req.user.id,
        toType: 'project', toId: project.id,
        kind: 'owns', weight: 1,
      });
      recordContribution(state, {
        userId: req.user.id, kind: 'ai_team',
        refType: 'project', refId: project.id, points: 4,
        summary: `AI-built team for "${project.title}"`,
      });
      logActivity(state, {
        communityId: communityId || null,
        actorId: req.user.id,
        type: 'ai_team',
        summary: `${req.user.name} AI-built a team for "${project.title}"`,
      });
      save();
    }

    res.json({
      goal: goal || null,
      understanding,
      ...result,
      project: project ? { id: project.id, title: project.title } : null,
    });
  } catch (e) { next(e); }
});

// POST /api/teams/hidden-experts
router.post('/hidden-experts', optionalAuth, (req, res, next) => {
  try {
    const { query, skills, communityId } = req.body;
    const state = getState();
    const understanding = query ? extractSkills(query) : { skills: skills || [] };
    const needed = (skills && skills.length) ? skills : understanding.skills;
    const experts = findHiddenExperts(state, { skills: needed, communityId });
    res.json({ understanding, skills: needed, experts, count: experts.length });
  } catch (e) { next(e); }
});

module.exports = router;
