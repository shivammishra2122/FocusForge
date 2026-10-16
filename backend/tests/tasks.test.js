import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Tasks API (/api/tasks)', () => {
  let authToken = null;
  let highTaskId = null;
  let mediumTaskId = null;

  before(async () => {
    // Register test user
    const email = `taskmaster_${Date.now()}@focusforge.io`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123', name: 'Taskmaster' });
    authToken = res.body.data.token;
  });

  it('POST /api/tasks should create a HIGH priority task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Architect Obsidian Core Engine',
        notes: 'Implement lock-free synchronization schema',
        priority: 'HIGH',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, 'Architect Obsidian Core Engine');
    assert.equal(res.body.data.priority, 'HIGH');
    assert.equal(res.body.data.completed, false);

    highTaskId = res.body.data.id;
  });

  it('POST /api/tasks should create a MEDIUM priority task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Review pull requests',
        priority: 'MEDIUM',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.priority, 'MEDIUM');
    mediumTaskId = res.body.data.id;
  });

  it('GET /api/tasks should retrieve user tasks', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.count >= 2);
    assert.ok(res.body.data.some((t) => t.id === highTaskId));
  });

  it('PATCH /api/tasks/:id/toggle should mark HIGH task completed and award 450 XP', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${highTaskId}/toggle`)
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.task.completed, true);
    assert.equal(res.body.data.xpEarned, 450);
    assert.ok(res.body.data.newTotalXp >= 450);
  });

  it('PATCH /api/tasks/:id/toggle should mark MEDIUM task completed and award 220 XP', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${mediumTaskId}/toggle`)
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.task.completed, true);
    assert.equal(res.body.data.xpEarned, 220);
    assert.ok(res.body.data.newTotalXp >= 670);
  });

  it('PUT /api/tasks/:id should update task title and notes', async () => {
    const res = await request(app)
      .put(`/api/tasks/${highTaskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Architect Obsidian Core Engine (Finalized)',
        notes: 'Includes distributed locking mechanism',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, 'Architect Obsidian Core Engine (Finalized)');
    assert.equal(res.body.data.notes, 'Includes distributed locking mechanism');
  });

  it('POST /api/tasks/batch should upsert multiple tasks', async () => {
    const res = await request(app)
      .post('/api/tasks/batch')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        tasks: [
          { id: 'batch_task_1', title: 'Batch item 1', priority: 'LOW', completed: false },
          { id: 'batch_task_2', title: 'Batch item 2', priority: 'HIGH', completed: true },
        ],
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.some((t) => t.id === 'batch_task_1'));
  });

  it('DELETE /api/tasks/:id should delete task', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${mediumTaskId}`)
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.taskId, mediumTaskId);
  });

  it('POST /api/tasks should reject task without title with 400', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        notes: 'Task without a title',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('title'));
  });

  it('PATCH /api/tasks/:id/toggle should return 404 for non-existent task', async () => {
    const res = await request(app)
      .patch('/api/tasks/non_existent_uuid_9999/toggle')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('not found'));
  });

  it('PUT /api/tasks/:id should return 404 for non-existent task', async () => {
    const res = await request(app)
      .put('/api/tasks/non_existent_uuid_9999')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'New Title' });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('not found'));
  });

  it('DELETE /api/tasks/:id should return 404 for non-existent task', async () => {
    const res = await request(app)
      .delete('/api/tasks/non_existent_uuid_9999')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('not found'));
  });

  it('GET /api/tasks should reject unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/tasks');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });
});
