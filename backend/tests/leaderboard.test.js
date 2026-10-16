import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Leaderboard API (/api/leaderboard)', () => {
  let authToken = null;

  before(async () => {
    const email = `operator_lead_${Date.now()}@focusforge.io`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123', name: 'Elite Apex' });
    authToken = res.body.data.token;
  });

  it('GET /api/leaderboard should return ranked list of operators', async () => {
    const res = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.ok(res.body.standing);
    assert.equal(res.body.standing.isCurrentUser, true);
  });
});
