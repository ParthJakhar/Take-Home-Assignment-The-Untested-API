const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API routes (integration)', () => {
  beforeEach(() => {
    taskService._reset();
  });

  const createTask = async (payload) => {
    const res = await request(app).post('/tasks').send(payload);
    expect(res.status).toBe(201);
    return res.body;
  };

  describe('POST /tasks', () => {
    test('creates a task and returns defaults', async () => {
      const task = await createTask({ title: 'Write tests', priority: 'high' });

      expect(task).toEqual(
        expect.objectContaining({
          title: 'Write tests',
          description: '',
          status: 'todo',
          priority: 'high',
          dueDate: null,
          completedAt: null,
          createdAt: expect.any(String),
        }),
      );
    });

    test('rejects missing title', async () => {
      const res = await request(app).post('/tasks').send({ priority: 'high' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          error: expect.stringMatching(/title is required/i),
        }),
      );
    });

    test('rejects invalid dueDate', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'T1', dueDate: 'not-a-date' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/dueDate must be a valid ISO date string/i);
    });
  });

  describe('GET /tasks', () => {
    test('lists all tasks', async () => {
      await createTask({ title: 'A' });
      await createTask({ title: 'B' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.map((t) => t.title)).toEqual(expect.arrayContaining(['A', 'B']));
    });

    test('filters by exact status', async () => {
      await createTask({ title: 'todo 1', status: 'todo' });
      await createTask({ title: 'in progress 1', status: 'in_progress' });
      await createTask({ title: 'done 1', status: 'done' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe('todo');
      expect(res.body[0].title).toBe('todo 1');
    });

    test('supports 1-based pagination', async () => {
      const titles = [];
      for (let i = 0; i < 15; i++) {
        titles.push(`Task ${i}`);
        await createTask({ title: `Task ${i}` });
      }

      const page1 = await request(app).get('/tasks?page=1&limit=10');
      expect(page1.status).toBe(200);
      expect(page1.body).toHaveLength(10);
      expect(page1.body.map((t) => t.title)).toEqual(titles.slice(0, 10));

      const page2 = await request(app).get('/tasks?page=2&limit=10');
      expect(page2.status).toBe(200);
      expect(page2.body).toHaveLength(5);
      expect(page2.body.map((t) => t.title)).toEqual(titles.slice(10, 15));
    });
  });

  describe('PUT /tasks/:id', () => {
    test('updates an existing task', async () => {
      const created = await createTask({ title: 'Before', priority: 'medium' });
      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ title: 'After', priority: 'low' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('After');
      expect(res.body.priority).toBe('low');
    });

    test('rejects invalid priority', async () => {
      const created = await createTask({ title: 'T1' });
      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ priority: 'urgent' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/priority must be one of/i);
    });

    test('returns 404 when task does not exist', async () => {
      const res = await request(app).put('/tasks/missing-id').send({ title: 'T1' });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('deletes a task (204)', async () => {
      const created = await createTask({ title: 'T1' });
      const del = await request(app).delete(`/tasks/${created.id}`);
      expect(del.status).toBe(204);

      const list = await request(app).get('/tasks');
      expect(list.body).toHaveLength(0);
    });

    test('returns 404 when task does not exist', async () => {
      const res = await request(app).delete('/tasks/missing-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('marks a task as done', async () => {
      const created = await createTask({ title: 'T1', status: 'todo', priority: 'high' });
      const res = await request(app).patch(`/tasks/${created.id}/complete`).send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toEqual(expect.any(String));
      expect(res.body.priority).toBe('medium');
    });

    test('returns 404 when task does not exist', async () => {
      const res = await request(app).patch('/tasks/missing-id/complete').send({});
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('GET /tasks/stats', () => {
    test('counts tasks by status and overdue tasks', async () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await createTask({ title: 'todo past', status: 'todo', dueDate: past });
      await createTask({ title: 'in_progress past', status: 'in_progress', dueDate: past });
      await createTask({ title: 'done past', status: 'done', dueDate: past });
      await createTask({ title: 'todo future', status: 'todo', dueDate: future });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 2,
        in_progress: 1,
        done: 1,
        overdue: 2,
      });
    });
  });

  describe('PATCH /tasks/:id/assign (new feature)', () => {
    test('assigns a task to a user', async () => {
      const created = await createTask({ title: 'T1' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.assignee).toBe('Alice');
    });

    test('rejects empty assignee', async () => {
      const created = await createTask({ title: 'T1' });
      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: '  ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee must be a non-empty string/i);
    });

    test('returns 404 when task does not exist', async () => {
      const res = await request(app).patch('/tasks/missing-id/assign').send({ assignee: 'Alice' });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });
});

