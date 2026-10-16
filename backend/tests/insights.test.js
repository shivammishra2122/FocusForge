import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('AI Coaching Insights API (/api/insights)', () => {
  let authToken = null;

  before(async () => {
    const email = `coach_test_${Date.now()}@focusforge.io`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123', name: 'Strategic Commander' });
    authToken = res.body.data.token;
  });

  it('GET /api/insights should generate tailored cognitive coaching report', async () => {
    const res = await request(app)
      .get('/api/insights')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.operator);
    assert.ok(res.body.data.momentumScore >= 0);
    assert.ok(res.body.data.optimalFocusWindow);
    assert.ok(res.body.data.optimalFocusWindow.timeframe);
    assert.ok(res.body.data.fatigueAlert);
    assert.ok(res.body.data.recommendedProtocol);
    assert.ok(Array.isArray(res.body.data.tacticalTips));
    assert.ok(res.body.data.tacticalTips.length >= 1);
  });
});
