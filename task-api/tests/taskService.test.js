const taskService = require('../src/services/taskService');

describe('taskService (unit)', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('read helpers', () => {
    test('getAll returns a copy', () => {
      const created = taskService.create({ title: 't1' });
      const all = taskService.getAll();
      all.push({ id: 'hijack' });

      const after = taskService.getAll();
      expect(after).toHaveLength(1);
      expect(after[0].id).toBe(created.id);
    });

    test('findById returns undefined when not found', () => {
      const res = taskService.findById('missing');
      expect(res).toBeUndefined();
    });

    test('getByStatus filters by status', () => {
      const t1 = taskService.create({ title: 't1', status: 'todo' });
      const t2 = taskService.create({ title: 't2', status: 'in_progress' });
      const t3 = taskService.create({ title: 't3', status: 'done' });

      expect(taskService.getByStatus('todo').map((t) => t.id)).toEqual([t1.id]);
      expect(taskService.getByStatus('in_progress').map((t) => t.id)).toEqual([t2.id]);
      expect(taskService.getByStatus('done').map((t) => t.id)).toEqual([t3.id]);
    });
  });

  describe('pagination', () => {
    test('getPaginated uses 1-based page numbers', () => {
      const titles = [];
      for (let i = 0; i < 25; i++) {
        const t = taskService.create({ title: `Task ${i}`, status: 'todo' });
        titles.push(t.title);
      }

      const page1 = taskService.getPaginated(1, 10);
      expect(page1).toHaveLength(10);
      expect(page1.map((t) => t.title)).toEqual(titles.slice(0, 10));

      const page2 = taskService.getPaginated(2, 10);
      expect(page2).toHaveLength(10);
      expect(page2.map((t) => t.title)).toEqual(titles.slice(10, 20));

      const page3 = taskService.getPaginated(3, 10);
      expect(page3).toHaveLength(5);
      expect(page3.map((t) => t.title)).toEqual(titles.slice(20, 25));
    });
  });

  describe('stats', () => {
    test('getStats returns counts by status + overdue count', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const future = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      taskService.create({ title: 'todo past', status: 'todo', dueDate: past });
      taskService.create({ title: 'in_progress past', status: 'in_progress', dueDate: past });
      taskService.create({ title: 'done past', status: 'done', dueDate: past });
      taskService.create({ title: 'todo future', status: 'todo', dueDate: future });

      expect(taskService.getStats()).toEqual({
        todo: 2,
        in_progress: 1,
        done: 1,
        overdue: 2,
      });
    });
  });

  describe('mutations', () => {
    test('create assigns defaults', () => {
      const t = taskService.create({ title: 'hello' });
      expect(t).toEqual(
        expect.objectContaining({
          title: 'hello',
          description: '',
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          completedAt: null,
        }),
      );
    });

    test('update returns null when task does not exist', () => {
      const updated = taskService.update('missing', { title: 'x' });
      expect(updated).toBeNull();
    });

    test('update merges fields', () => {
      const t = taskService.create({ title: 't1', status: 'todo' });
      const updated = taskService.update(t.id, { title: 't1 updated', priority: 'low' });

      expect(updated).toEqual(
        expect.objectContaining({
          id: t.id,
          title: 't1 updated',
          priority: 'low',
          status: 'todo',
        }),
      );
    });

    test('remove returns true/false', () => {
      const t = taskService.create({ title: 't1' });
      expect(taskService.remove(t.id)).toBe(true);
      expect(taskService.remove(t.id)).toBe(false);
    });

    test('completeTask marks done and sets completedAt', () => {
      const t = taskService.create({ title: 't1', priority: 'high', status: 'todo' });
      const updated = taskService.completeTask(t.id);

      expect(updated).toEqual(
        expect.objectContaining({
          id: t.id,
          status: 'done',
          priority: 'medium',
          completedAt: expect.any(String),
        }),
      );
    });

    test('completeTask returns null when task does not exist', () => {
      expect(taskService.completeTask('missing')).toBeNull();
    });
  });
});

