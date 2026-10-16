import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Authentication API (/api/auth)', () => {
  const uniqueId = Date.now();
  const testUser = {
    email: `operator_${uniqueId}@focusforge.io`,
    password: 'supersecretpassword',
    name: 'Neo Operator',
    dailyGoalHours: 3.0,
  };

  let authToken = null;
  let userId = null;

  it('POST /api/auth/register should successfully register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.user);
    assert.equal(res.body.data.user.email, testUser.email.toLowerCase());
    assert.equal(res.body.data.user.name, testUser.name);
    assert.ok(res.body.data.token);

    authToken = res.body.data.token;
    userId = res.body.data.user.id;
  });

  it('POST /api/auth/register should reject duplicate email registration with 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('already exists'));
  });

  it('POST /api/auth/register should validate password length', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `invalid_${Date.now()}@focusforge.io`,
        password: '123',
        name: 'Short Pass',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('at least 6 characters'));
  });

  it('POST /api/auth/login should authenticate with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.id, userId);
  });

  it('POST /api/auth/login should reject invalid password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'incorrectPassword',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('Invalid email or password'));
  });

  it('GET /api/auth/me should return authenticated profile and settings', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.id, userId);
    assert.ok(res.body.data.settings);
    assert.equal(res.body.data.settings.pomodoro_work, 25);
    assert.ok(res.body.data.stats);
  });

  it('PUT /api/auth/profile should update name, avatar, and settings', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Neo Operator (Master)',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        dailyGoalHours: 4.5,
        settings: {
          pomodoroWork: 30,
          pomodoroShortBreak: 6,
          haptics: true,
          notifications: true,
        },
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.name, 'Neo Operator (Master)');
    assert.equal(res.body.data.user.daily_goal_hours, 4.5);
    assert.equal(res.body.data.settings.pomodoro_work, 30);
    assert.equal(res.body.data.settings.pomodoro_short_break, 6);
  });

  it('POST /api/auth/register should reject registration with invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'not-an-email',
        password: 'validpassword123',
        name: 'Bad Email',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('valid email'));
  });

  it('POST /api/auth/register should reject registration with missing name', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `nameless_${Date.now()}@focusforge.io`,
        password: 'validpassword123',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('Name is required'));
  });

  it('POST /api/auth/login should reject non-existent email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'ghost_operator_does_not_exist@focusforge.io',
        password: 'anypassword',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('Invalid email or password'));
  });

  it('GET /api/auth/me should reject request without token with 401', async () => {
    const res = await request(app).get('/api/auth/me');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('Authentication required'));
  });

  it('GET /api/auth/me should reject request with malformed token with 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.payload');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });
});
