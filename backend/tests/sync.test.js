import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Cloud Sync API (/api/sync)', () => {
  let authToken = null;

  before(async () => {
    const email = `sync_tester_${Date.now()}@focusforge.io`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123', name: 'Sync Master' });
    authToken = res.body.data.token;
  });

  it('POST /api/sync/push should perform atomic sync of client state', async () => {
    const payload = {
      profile: { name: 'Sync Master (Synchronized)', daily_goal_hours: 3.5 },
      stats: { xp: 1250, streak: 5 },
      tasks: [
        { id: 'synced_task_1', title: 'Synced Task 1', priority: 'HIGH', completed: true },
      ],
      sessions: [
        {
          id: 'synced_session_1',
          mode: 'POMODORO',
          duration_minutes: 25,
          timestamp: Date.now(),
          category: 'Mobile Dev',
        },
      ],
      streaks: {
        '2026-10-14': 60,
        '2026-10-15': 90,
      },
      settings: {
        pomodoroWork: 45,
        pomodoroShortBreak: 10,
      },
    };

    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.syncedAt);
  });

  it('GET /api/sync/pull should return complete snapshot matching mobile AsyncStorage structure', async () => {
    const res = await request(app)
      .get('/api/sync/pull')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.profile.name, 'Sync Master (Synchronized)');
    assert.ok(res.body.data.tasks.list);
    assert.ok(res.body.data.tasks.list.some((t) => t.id === 'synced_task_1'));
    assert.ok(res.body.data.sessions.list);
    assert.ok(res.body.data.sessions.list.some((s) => s.id === 'synced_session_1'));
    assert.equal(res.body.data.streaks['2026-10-15'], 90);
    assert.equal(res.body.data.settings.pomodoroWork, 45);
  });

  it('POST /api/sync/push should reject unauthenticated request with 401', async () => {
    const res = await request(app)
      .post('/api/sync/push')
      .send({ profile: { name: 'Unauthorized Operative' } });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('GET /api/sync/pull should reject unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/sync/pull');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });
});
