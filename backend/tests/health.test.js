import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Health and Root API', () => {
  it('GET /api/health should return 200 and system health status', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
    assert.equal(res.body.service, 'FocusForge Backend API');
    assert.equal(res.body.version, '1.0.0');
    assert.equal(res.body.database, 'healthy');
    assert.ok(res.body.system);
    assert.ok(res.body.system.nodeVersion);
  });

  it('GET / should return 200 with service information and API documentation', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'online');
    assert.equal(res.body.service, 'FocusForge Backend API');
    assert.ok(res.body.documentation);
    assert.ok(res.body.documentation.auth);
    assert.ok(res.body.documentation.tasks);
    assert.ok(res.body.documentation.sessions);
    assert.ok(res.body.documentation.sync);
  });

  it('GET /api/unknown-endpoint should return 404', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('Route not found'));
  });
});
