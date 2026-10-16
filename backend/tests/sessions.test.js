import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Sessions API (/api/sessions)', () => {
  let authToken = null;

  before(async () => {
    const email = `deepfocus_${Date.now()}@focusforge.io`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123', name: 'Deep Focus Operative' });
    authToken = res.body.data.token;
  });

  it('POST /api/sessions should record a standard pomodoro session and update streak', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        mode: 'POMODORO',
        duration_minutes: 25,
        category: 'Development',
        sound_id: 'rain',
        note: 'High cognitive flow state achieved',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.session);
    assert.equal(res.body.data.session.durationMinutes, 25);
    assert.ok(res.body.data.session.efficiency >= 65);
    assert.ok(res.body.data.session.focusIndex >= 0.8);
    assert.equal(res.body.data.xpEarned, 50); // 25 min * 2 = 50 XP
    assert.equal(res.body.data.streak, 1);
  });

  it('POST /api/sessions should record a deep focus session with XP bonus', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        mode: 'DEEP_FOCUS',
        duration_minutes: 50,
        deep_focus: true,
        category: 'Algorithm Design',
        sound_id: 'binaural_40hz',
        note: 'Complete immersion',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.session.deepFocus, true);
    assert.equal(res.body.data.xpEarned, 150); // 50 * 2 + 50 bonus = 150 XP
    assert.ok(res.body.data.newTotalXp >= 200);
  });

  it('GET /api/sessions should list recorded sessions', async () => {
    const res = await request(app)
      .get('/api/sessions')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.count >= 2);
    assert.ok(res.body.data[0].category);
  });

  it('GET /api/sessions/stats should compute aggregate metrics', async () => {
    const res = await request(app)
      .get('/api/sessions/stats')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.totalSessions >= 2);
    assert.ok(res.body.data.totalMinutes >= 75);
    assert.equal(res.body.data.deepFocusMinutes, 50);
    assert.ok(res.body.data.averageEfficiency >= 65);
    assert.ok(res.body.data.level);
  });

  it('GET /api/sessions?category=Development should filter sessions by category', async () => {
    const res = await request(app)
      .get('/api/sessions?category=Development')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.every((s) => s.category.toLowerCase() === 'development'));
  });

  it('POST /api/sessions should reject unauthenticated request with 401', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ duration_minutes: 25, mode: 'POMODORO' });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('GET /api/sessions should reject unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/sessions');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });
});
