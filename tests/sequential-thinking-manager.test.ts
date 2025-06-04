import { SequentialThinkingManager } from '../src/tools/sequential-thinking-manager';

const dummyLogger: any = {
  child: () => dummyLogger,
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

describe('SequentialThinkingManager', () => {
  test('adds thoughts to a session', () => {
    const manager = new SequentialThinkingManager(dummyLogger);
    const id = manager.createSession();
    manager.addThought(id, {
      thought: 'First',
      thoughtNumber: 1,
      nextThoughtNeeded: true,
      totalThoughts: 2,
    });
    const session = manager.getSession(id);
    expect(session?.thoughts.length).toBe(1);
  });

  test('throws when revision target missing', () => {
    const manager = new SequentialThinkingManager(dummyLogger);
    const id = manager.createSession();
    expect(() =>
      manager.addThought(id, {
        thought: 'Revise',
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: true,
        isRevision: true,
      })
    ).toThrow('revisesThought is required');
  });

  test('generates session summary', () => {
    const manager = new SequentialThinkingManager(dummyLogger);
    const id = manager.createSession();
    manager.addThought(id, {
      thought: 'Step 1',
      thoughtNumber: 1,
      nextThoughtNeeded: true,
      totalThoughts: 2,
    });
    manager.addThought(id, {
      thought: 'Step 2',
      thoughtNumber: 2,
      nextThoughtNeeded: false,
      totalThoughts: 2,
    });
    const summary = manager.getSessionSummary(id);
    expect(summary.totalThoughts).toBe(2);
    expect(summary.isComplete).toBe(true);
  });
});
