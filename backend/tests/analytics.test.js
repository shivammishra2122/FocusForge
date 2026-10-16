import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Analytics API (/api/analytics)', () => {
  let authToken = null;

  before(async () => {
    const email = `analytics_${Date.now()}@focusforge.io`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123', name: 'Data Scientist' });
    authToken = res.body.data.token;

    // Record a session so analytics has data
    await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        mode: 'POMODORO',
        duration_minutes: 45,
        category: 'Analytics Engineering',
        deep_focus: true,
      });
  });

  it('GET /api/analytics/overview should return full productivity breakdown', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.totalMinutes >= 45);
    assert.ok(res.body.data.sevenDayBreakdown);
    assert.equal(res.body.data.sevenDayBreakdown.length, 7);
    assert.ok(res.body.data.hourlyDistribution);
    assert.equal(res.body.data.hourlyDistribution.length, 24);
    assert.ok(res.body.data.categoryBreakdown);
    assert.ok(res.body.data.level);
    assert.ok(res.body.data.level.title);
  });

  it('GET /api/analytics/overview should reject unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/analytics/overview');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });
});
