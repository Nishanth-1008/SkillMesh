// Opportunity Matching — volunteer, mentorship, events, initiatives (Phase 2).

const crypto = require('crypto');
const { Router } = require('../utils/router');
const { getState, save } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/requireAuth');
const { extractSkills } = require('../nlp/skillExtractor');
const { getUserSkillNames, recordContribution, computeTrustScore } = require('../services/trust');
const { skillMatches } = require('../services/teamBuilder');
const { notify, logActivity } = require('../services/notify');

const VALID_TYPES = [
  'volunteer', 'mentorship', 'project', 'event', 'initiative', 'organization_request',
];

const router = new Router();

function serializeOpp(state, opp) {
  const apps = state.opportunityApps.filter((a) => a.opportunityId === opp.id);
  const creator = state.users.find((u) => u.id === opp.creatorId);
  return {
    ...opp,
    creator: creator ? { id: creator.id, name: creator.name } : null,
    applicantCount: apps.length,
  };
}

router.get('/', optionalAuth, (req, res, next) => {
  try {
    const state = getState();
    let list = state.opportunities.filter((o) => o.status !== 'closed');
    if (req.query.type) list = list.filter((o) => o.type === req.query.type);
    if (req.query.communityId) list = list.filter((o) => o.communityId === req.query.communityId);
    if (req.query.q) {
      const q = req.query.q.toLowerCase();
      list = list.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          (o.description || '').toLowerCase().includes(q) ||
          (o.skillsNeeded || []).some((s) => s.includes(q))
      );
    }
    // Rank by skill match for logged-in user
    if (req.user) {
      const mySkills = getUserSkillNames(state, req.user.id);
      list = list
        .map((o) => {
          const match = (o.skillsNeeded || []).filter((ns) =>
            mySkills.some((s) => skillMatches(s, ns))
          );
          return { opp: o, matchCount: match.length, matchedSkills: match };
        })
        .sort((a, b) => b.matchCount - a.matchCount)
        .map(({ opp, matchCount, matchedSkills }) => ({
          ...serializeOpp(state, opp),
          matchCount,
          matchedSkills,
        }));
      return res.json({ opportunities: list });
    }
    res.json({ opportunities: list.map((o) => serializeOpp(state, o)) });
  } catch (e) { next(e); }
});

router.post('/', requireAuth, (req, res, next) => {
  try {
    const { type, title, description, communityId, skillsNeeded, location } = req.body;
    if (!title || !type) {
      const err = new Error('title and type are required');
      err.status = 400;
      throw err;
    }
    if (!VALID_TYPES.includes(type)) {
      const err = new Error(`type must be one of: ${VALID_TYPES.join(', ')}`);
      err.status = 400;
      throw err;
    }
    const state = getState();
    let skills = Array.isArray(skillsNeeded) ? skillsNeeded.map((s) => s.toLowerCase()) : [];
    if (!skills.length && description) {
      skills = extractSkills(description).skills;
    }
    const opp = {
      id: crypto.randomUUID(),
      type,
      title,
      description: description || '',
      communityId: communityId || null,
      creatorId: req.user.id,
      skillsNeeded: skills,
      location: location || null,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    state.opportunities.push(opp);
    recordContribution(state, {
      userId: req.user.id, kind: 'opportunity',
      refType: 'opportunity', refId: opp.id, points: 2,
      summary: `Posted ${type} opportunity "${title}"`,
    });
    logActivity(state, {
      communityId: communityId || null,
      actorId: req.user.id,
      type: 'opportunity',
      summary: `${req.user.name} posted a ${type} opportunity: "${title}"`,
    });
    save();
    res.status(201).json({ opportunity: serializeOpp(state, opp) });
  } catch (e) { next(e); }
});

router.get('/:id', (req, res, next) => {
  try {
    const state = getState();
    const opp = state.opportunities.find((o) => o.id === req.params.id);
    if (!opp) {
      const err = new Error('Opportunity not found');
      err.status = 404;
      throw err;
    }
    const applications = state.opportunityApps
      .filter((a) => a.opportunityId === opp.id)
      .map((a) => {
        const user = state.users.find((u) => u.id === a.userId);
        return {
          id: a.id,
          user: user ? { id: user.id, name: user.name, availability: user.availability } : null,
          status: a.status,
          message: a.message,
          trustScore: user ? computeTrustScore(state, user.id).score : 0,
          createdAt: a.createdAt,
        };
      });
    res.json({ opportunity: serializeOpp(state, opp), applications });
  } catch (e) { next(e); }
});

router.post('/:id/apply', requireAuth, (req, res, next) => {
  try {
    const { message } = req.body;
    const state = getState();
    const opp = state.opportunities.find((o) => o.id === req.params.id);
    if (!opp) {
      const err = new Error('Opportunity not found');
      err.status = 404;
      throw err;
    }
    if (opp.status !== 'open') {
      const err = new Error('This opportunity is no longer open');
      err.status = 400;
      throw err;
    }
    const already = state.opportunityApps.find(
      (a) => a.opportunityId === opp.id && a.userId === req.user.id
    );
    if (already) return res.json({ applied: true, already: true, application: already });

    const application = {
      id: crypto.randomUUID(),
      opportunityId: opp.id,
      userId: req.user.id,
      status: 'pending',
      message: message || '',
      createdAt: new Date().toISOString(),
    };
    state.opportunityApps.push(application);
    recordContribution(state, {
      userId: req.user.id, kind: 'volunteer',
      refType: 'opportunity', refId: opp.id, points: 2,
      summary: `Applied to "${opp.title}"`,
    });
    notify(state, {
      userId: opp.creatorId,
      type: 'application',
      title: `Application for ${opp.title}`,
      body: `${req.user.name} applied${message ? `: ${message}` : ''}`,
      link: `#opportunity?id=${opp.id}`,
    });
    save();
    res.status(201).json({ applied: true, application });
  } catch (e) { next(e); }
});

router.post('/:id/decide', requireAuth, (req, res, next) => {
  try {
    const { applicationId, accept } = req.body;
    const state = getState();
    const opp = state.opportunities.find((o) => o.id === req.params.id);
    if (!opp) {
      const err = new Error('Opportunity not found');
      err.status = 404;
      throw err;
    }
    if (opp.creatorId !== req.user.id) {
      const err = new Error('Only the creator can decide applications');
      err.status = 403;
      throw err;
    }
    const app = state.opportunityApps.find(
      (a) => a.id === applicationId && a.opportunityId === opp.id
    );
    if (!app) {
      const err = new Error('Application not found');
      err.status = 404;
      throw err;
    }
    app.status = accept ? 'accepted' : 'rejected';
    notify(state, {
      userId: app.userId,
      type: 'application',
      title: accept ? `Accepted: ${opp.title}` : `Not selected: ${opp.title}`,
      body: accept ? 'You were accepted for this opportunity.' : 'Your application was not selected.',
      link: `#opportunity?id=${opp.id}`,
    });
    save();
    res.json({ application: app });
  } catch (e) { next(e); }
});

router.patch('/:id', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const opp = state.opportunities.find((o) => o.id === req.params.id);
    if (!opp) {
      const err = new Error('Opportunity not found');
      err.status = 404;
      throw err;
    }
    if (opp.creatorId !== req.user.id) {
      const err = new Error('Only the creator can update this opportunity');
      err.status = 403;
      throw err;
    }
    const { title, description, status, skillsNeeded, location } = req.body;
    if (title !== undefined) opp.title = title;
    if (description !== undefined) opp.description = description;
    if (status !== undefined) opp.status = status;
    if (skillsNeeded !== undefined) opp.skillsNeeded = skillsNeeded;
    if (location !== undefined) opp.location = location;
    save();
    res.json({ opportunity: serializeOpp(state, opp) });
  } catch (e) { next(e); }
});

module.exports = router;
