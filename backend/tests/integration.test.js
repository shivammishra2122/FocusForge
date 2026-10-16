import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('End-to-End Mobile Client & Backend Integration Flow', () => {
  const timestamp = Date.now();
  const testEmail = `operator_e2e_${timestamp}@focusforge.io`;
  const testPassword = 'StrongPassphrase2026!';
  const testName = 'Agent Obsidian';

  let authToken = null;
  let userId = null;
  let taskId = null;
  let sessionId = null;

  it('Step 1: Mobile client registers a new operator account', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: testName,
        dailyGoalHours: 4.0,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.ok(res.body.data.user.id);
    assert.equal(res.body.data.user.email, testEmail.toLowerCase());

    authToken = res.body.data.token;
    userId = res.body.data.user.id;
  });

  it('Step 2: Mobile client authenticates on restart via login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.id, userId);

    authToken = res.body.data.token;
  });

  it('Step 3: Mobile client fetches profile and atmospheric settings', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.name, testName);
    assert.equal(res.body.data.user.daily_goal_hours, 4.0);
    assert.ok(res.body.data.settings);
  });

  it('Step 4: Mobile client updates atmospheric settings', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Agent Obsidian (Elite)',
        settings: {
          pomodoroWork: 30,
          pomodoroShortBreak: 7,
          notifications: true,
          haptics: true,
        },
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.name, 'Agent Obsidian (Elite)');
    assert.equal(res.body.data.settings.pomodoro_work, 30);
  });

  it('Step 5: Mobile client creates a priority mission task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Calibrate neural audio synthesizer',
        notes: 'Initialize 40Hz gamma binaural beats',
        priority: 'HIGH',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.priority, 'HIGH');
    assert.equal(res.body.data.completed, false);

    taskId = res.body.data.id;
  });

  it('Step 6: Mobile client toggles task completion and earns XP', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskId}/toggle`)
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.task.completed, true);
    assert.equal(res.body.data.xpEarned, 450); // HIGH priority awards 450 XP
    assert.ok(res.body.data.newTotalXp >= 450);
  });

  it('Step 7: Mobile client records a 50-minute Deep Focus protocol session', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        mode: 'DEEP_FOCUS',
        duration_minutes: 50,
        deep_focus: true,
        category: 'Deep Work',
        sound_id: 'binaural_40hz',
        note: 'Complete immersion session with zero friction',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.session.deepFocus, true);
    assert.equal(res.body.data.session.durationMinutes, 50);
    assert.equal(res.body.data.xpEarned, 150); // 50 * 2 + 50 bonus XP
    assert.ok(res.body.data.newTotalXp >= 600);

    sessionId = res.body.data.session.id;
  });

  it('Step 8: Mobile client pushes complete offline snapshot to cloud sync', async () => {
    const localSnapshot = {
      profile: { name: 'Agent Obsidian (Synced)', daily_goal_hours: 5.0 },
      stats: { xp: 2500, streak: 7 },
      tasks: [
        { id: taskId, title: 'Calibrate neural audio synthesizer', priority: 'HIGH', completed: true },
        { id: `offline_task_${Date.now()}`, title: 'Review offline memory logs', priority: 'MEDIUM', completed: false },
      ],
      sessions: [
        {
          id: sessionId,
          mode: 'DEEP_FOCUS',
          duration_minutes: 50,
          timestamp: Date.now() - 3600000,
          category: 'Deep Work',
        },
      ],
      streaks: {
        '2026-10-15': 120,
        '2026-10-16': 50,
      },
      settings: {
        pomodoroWork: 35,
        pomodoroShortBreak: 7,
      },
    };

    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${authToken}`)
      .send(localSnapshot);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.syncedAt);
  });

  it('Step 9: Mobile client reconciles state by pulling full cloud snapshot', async () => {
    const res = await request(app)
      .get('/api/sync/pull')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.profile.name, 'Agent Obsidian (Synced)');
    assert.ok(res.body.data.tasks.list.length >= 2);
    assert.ok(res.body.data.sessions.list.length >= 1);
    assert.equal(res.body.data.streaks['2026-10-16'], 50);
    assert.equal(res.body.data.settings.pomodoroWork, 35);
  });

  it('Step 10: Mobile client fetches full analytics overview', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.totalMinutes >= 50);
    assert.equal(res.body.data.sevenDayBreakdown.length, 7);
    assert.equal(res.body.data.hourlyDistribution.length, 24);
  });

  it('Step 11: Mobile client queries community leaderboard and standing', async () => {
    const res = await request(app)
      .get('/api/leaderboard?limit=25')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.standing !== undefined);
  });

  it('Step 12: Mobile client requests AI cognitive coaching insights', async () => {
    const res = await request(app)
      .get('/api/insights')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.momentumScore !== undefined);
    assert.ok(res.body.data.optimalFocusWindow);
    assert.ok(Array.isArray(res.body.data.tacticalTips));
  });

  it('Step 13: System health check reports active uptime and database', async () => {
    const res = await request(app).get('/api/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
    assert.equal(res.body.database, 'healthy');
  });
});
