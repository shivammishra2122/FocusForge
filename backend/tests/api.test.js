import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { getDb, closeDb } from '../src/db/database.js';

describe('FocusForge Backend API Suite', () => {
  let authToken = '';
  let createdTaskId = '';

  before(() => {
    // Set test environment database
    process.env.NODE_ENV = 'test';
    getDb(':memory:');
  });

  after(() => {
    closeDb();
  });

  describe('System & Health Endpoints', () => {
    it('GET / should return service overview and API documentation routes', async () => {
      const res = await request(app).get('/');
      assert.equal(res.status, 200);
      assert.equal(res.body.service, 'FocusForge Backend API');
      assert.equal(res.body.status, 'online');
      assert.ok(res.body.documentation);
    });

    it('GET /api/health should return 200 OK with uptime and database status', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'healthy');
      assert.ok(res.body.database === 'connected' || res.body.uptime !== undefined);
    });
  });

  describe('Authentication Flow', () => {
    const testUser = {
      name: 'Test Operative',
      email: `devops_${Date.now()}@focusforge.dev`,
      password: 'StrongPassword123!',
      dailyGoalHours: 3.5,
    };

    it('POST /api/auth/register should create a new user account', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.equal(res.body.data.user.email, testUser.email);
      authToken = res.body.data.token;
    });

    it('POST /api/auth/login should authenticate user with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token);
      authToken = res.body.data.token;
    });

    it('GET /api/auth/me should return the authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.user.email, testUser.email);
    });
  });

  describe('Task Operations', () => {
    it('POST /api/tasks should create a new task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Implement Multi-Stage Dockerfile',
          notes: 'Optimize alpine image size and configure health check',
          priority: 'HIGH',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.title, 'Implement Multi-Stage Dockerfile');
      createdTaskId = res.body.data.id;
    });

    it('GET /api/tasks should retrieve user tasks', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
    });

    it('PATCH /api/tasks/:id/toggle should toggle task completion', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${createdTaskId}/toggle`)
        .set('Authorization', `Bearer ${authToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.task.completed, true);
    });
  });

  describe('Focus Session Tracking', () => {
    it('POST /api/sessions should record a focus session and award XP', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mode: 'POMODORO',
          durationMinutes: 25,
          deepFocus: true,
          category: 'DevOps',
          soundId: 'rain',
          note: 'Configuring CI/CD pipelines',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.xpEarned > 0);
      assert.equal(res.body.data.session.durationMinutes, 25);
    });

    it('GET /api/sessions/stats should return aggregated focus stats', async () => {
      const res = await request(app)
        .get('/api/sessions/stats')
        .set('Authorization', `Bearer ${authToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.totalMinutes >= 25);
    });
  });

  describe('Analytics & Leaderboard', () => {
    it('GET /api/analytics/overview should return comprehensive dashboard analytics', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data);
    });

    it('GET /api/leaderboard should return global rankings', async () => {
      const res = await request(app)
        .get('/api/leaderboard')
        .set('Authorization', `Bearer ${authToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });

    it('GET /api/insights should return coaching insights', async () => {
      const res = await request(app)
        .get('/api/insights')
        .set('Authorization', `Bearer ${authToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.optimalFocusWindow);
    });
  });

  describe('Cloud Synchronization', () => {
    it('POST /api/sync/push should accept and persist mobile state snapshot', async () => {
      const payload = {
        profile: { name: 'Focus Master' },
        stats: { xp: 500, streak: 3 },
        tasks: [{ id: 'task-cloud-1', title: 'Cloud Sync Test', priority: 'LOW' }],
        sessions: [{
          id: 'sess-cloud-1',
          mode: 'POMODORO',
          durationMinutes: 30,
          timestamp: Date.now(),
        }],
      };

      const res = await request(app)
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    it('GET /api/sync/pull should return complete synchronized dataset', async () => {
      const res = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${authToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.profile);
      assert.ok(res.body.data.tasks.list);
    });
  });
});
