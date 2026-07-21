// Phase 3 — Events & Initiatives

const crypto = require('crypto');
const { Router } = require('../utils/router');
const { getState, save } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/requireAuth');
const { extractSkills } = require('../nlp/skillExtractor');
const { recordContribution } = require('../services/trust');
const { notify, logActivity } = require('../services/notify');
const { awardPoints, evaluateAchievements } = require('../services/gamification');
const { recordImpact } = require('../services/ecosystem');

const router = new Router();

router.get('/', optionalAuth, (req, res, next) => {
  try {
    const state = getState();
    let events = state.events;
    if (req.query.communityId) events = events.filter((e) => e.communityId === req.query.communityId);
    if (req.query.status) events = events.filter((e) => e.status === req.query.status);
    res.json({
      events: events.map((e) => ({
        ...e,
        registered: state.eventAttendance.filter((a) => a.eventId === e.id).length,
      })),
    });
  } catch (e) { next(e); }
});

router.post('/', requireAuth, (req, res, next) => {
  try {
    const { title, description, communityId, type, startAt, endAt, location, skillsNeeded } = req.body;
    if (!title || !communityId) {
      const err = new Error('title and communityId are required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    if (!state.communities.find((c) => c.id === communityId)) {
      const err = new Error('Community not found');
      err.status = 404;
      throw err;
    }
    let skills = Array.isArray(skillsNeeded) ? skillsNeeded : [];
    if (!skills.length && description) skills = extractSkills(description).skills;

    const event = {
      id: crypto.randomUUID(),
      communityId,
      title,
      description: description || '',
      type: type || 'community',
      startAt: startAt || null,
      endAt: endAt || null,
      location: location || null,
      creatorId: req.user.id,
      skillsNeeded: skills,
      status: 'upcoming',
      impactReport: null,
      createdAt: new Date().toISOString(),
    };
    state.events.push(event);
    recordContribution(state, {
      userId: req.user.id, kind: 'event',
      refType: 'event', refId: event.id, points: 3,
      summary: `Created event "${title}"`,
    });
    awardPoints(state, req.user.id, 15, `Created event ${title}`);
    logActivity(state, {
      communityId, actorId: req.user.id, type: 'event',
      summary: `${req.user.name} created event "${title}"`,
    });
    save();
    res.status(201).json({ event });
  } catch (e) { next(e); }
});

router.get('/:id', (req, res, next) => {
  try {
    const state = getState();
    const event = state.events.find((e) => e.id === req.params.id);
    if (!event) {
      const err = new Error('Event not found');
      err.status = 404;
      throw err;
    }
    const attendance = state.eventAttendance
      .filter((a) => a.eventId === event.id)
      .map((a) => {
        const user = state.users.find((u) => u.id === a.userId);
        return { ...a, user: user ? { id: user.id, name: user.name } : null };
      });
    res.json({ event, attendance });
  } catch (e) { next(e); }
});

router.post('/:id/register', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const event = state.events.find((e) => e.id === req.params.id);
    if (!event) {
      const err = new Error('Event not found');
      err.status = 404;
      throw err;
    }
    const already = state.eventAttendance.find(
      (a) => a.eventId === event.id && a.userId === req.user.id
    );
    if (already) return res.json({ registered: true, already: true });

    state.eventAttendance.push({
      id: crypto.randomUUID(),
      eventId: event.id,
      userId: req.user.id,
      status: 'registered',
      checkedInAt: null,
    });
    notify(state, {
      userId: event.creatorId,
      type: 'event',
      title: `${req.user.name} registered for ${event.title}`,
      body: '',
      link: `#events`,
    });
    save();
    res.status(201).json({ registered: true });
  } catch (e) { next(e); }
});

router.post('/:id/checkin', requireAuth, (req, res, next) => {
  try {
    const { userId } = req.body;
    const state = getState();
    const event = state.events.find((e) => e.id === req.params.id);
    if (!event) {
      const err = new Error('Event not found');
      err.status = 404;
      throw err;
    }
    if (event.creatorId !== req.user.id) {
      const err = new Error('Only the event creator can check in attendees');
      err.status = 403;
      throw err;
    }
    const targetId = userId || req.user.id;
    let row = state.eventAttendance.find(
      (a) => a.eventId === event.id && a.userId === targetId
    );
    if (!row) {
      row = {
        id: crypto.randomUUID(),
        eventId: event.id,
        userId: targetId,
        status: 'attended',
        checkedInAt: new Date().toISOString(),
      };
      state.eventAttendance.push(row);
    } else {
      row.status = 'attended';
      row.checkedInAt = new Date().toISOString();
    }
    awardPoints(state, targetId, 10, `Attended ${event.title}`);
    evaluateAchievements(state, targetId);
    save();
    res.json({ attendance: row });
  } catch (e) { next(e); }
});

router.post('/:id/impact', requireAuth, (req, res, next) => {
  try {
    const { summary, peopleHelped, volunteerHours, tags } = req.body;
    const state = getState();
    const event = state.events.find((e) => e.id === req.params.id);
    if (!event) {
      const err = new Error('Event not found');
      err.status = 404;
      throw err;
    }
    if (event.creatorId !== req.user.id) {
      const err = new Error('Only the creator can file an impact report');
      err.status = 403;
      throw err;
    }
    event.impactReport = {
      summary: summary || '',
      peopleHelped: peopleHelped || 0,
      volunteerHours: volunteerHours || 0,
      filedAt: new Date().toISOString(),
    };
    event.status = 'completed';
    if (peopleHelped) {
      recordImpact(state, {
        communityId: event.communityId,
        userId: req.user.id,
        metric: 'people_helped',
        value: peopleHelped,
        tags: tags || ['community', 'event'],
      });
    }
    if (volunteerHours) {
      recordImpact(state, {
        communityId: event.communityId,
        userId: req.user.id,
        metric: 'volunteer_hours',
        value: volunteerHours,
        tags: tags || ['volunteer', 'event'],
      });
    }
    save();
    res.json({ event });
  } catch (e) { next(e); }
});

module.exports = router;
