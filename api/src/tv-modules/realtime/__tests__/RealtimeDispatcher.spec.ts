import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import { eventBus } from '../../../core/EventBus';
import type { CentrifugoBroadcastToUsersArgs } from '../../../types/centrifugo.types';
import { RealtimeDispatcher } from '../RealtimeDispatcher';

const centrifugo = vi.hoisted(() => ({ isEnabled: vi.fn(() => true), broadcastToUsers: vi.fn(async (_args: CentrifugoBroadcastToUsersArgs) => true) }));
const repository = vi.hoisted(() => ({ fetchGoalMemberIds: vi.fn(async () => [1, 2]), fetchTaskGoalId: vi.fn(async () => 20) }));

vi.mock('../../../core/CentrifugoClient', () => ({ getCentrifugoClient: () => centrifugo }));
vi.mock('../RealtimeRepository', () => ({ RealtimeRepository: vi.fn(() => repository) }));

const task = { id: 5, goalId: 10 } as TasksSchemaTypeForSelect;

async function settle() {
    for (let i = 0; i < 10; i += 1) await new Promise((resolve) => setImmediate(resolve));
}

function broadcasts() {
    return centrifugo.broadcastToUsers.mock.calls.map(([args]) => args);
}

describe('RealtimeDispatcher tasks.changed', () => {
    beforeAll(() => {
        new RealtimeDispatcher().register();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        centrifugo.isEnabled.mockReturnValue(true);
    });

    it('tells every project member that a task changed, without its content', async () => {
        eventBus.emit('task.updated', { task, changes: { statusId: 3 }, initiatorId: 1 });
        await settle();
        expect(repository.fetchGoalMemberIds).toHaveBeenCalledWith(10);
        expect(broadcasts()).toEqual([{ userIds: [1, 2], event: 'tasks.changed', data: { goalId: 10, taskIds: [5], kind: 'updated' } }]);
    });

    it('reports created and deleted tasks', async () => {
        eventBus.emit('task.created', { task, initiatorId: 1 });
        eventBus.emit('task.deleted', { taskId: 6, goalId: 10, initiatorId: 1 });
        await settle();
        expect(broadcasts().map(({ data }) => data)).toEqual([
            { goalId: 10, taskIds: [5], kind: 'created' },
            { goalId: 10, taskIds: [6], kind: 'deleted' },
        ]);
    });

    it('removes a moved task from the old project and adds it to the new one', async () => {
        eventBus.emit('task.moved', { task: { ...task, goalId: 11 }, taskIds: [5, 7], fromGoalId: 10, toGoalId: 11, initiatorId: 1 });
        await settle();
        expect(broadcasts().map(({ data }) => data)).toEqual([
            { goalId: 10, taskIds: [5, 7], kind: 'deleted' },
            { goalId: 11, taskIds: [5], kind: 'created' },
        ]);
    });

    it('resolves the project for tag and assignee changes', async () => {
        eventBus.emit('task.tagsChanged', { taskId: 8, tagId: 3, added: true, initiatorId: 1 });
        eventBus.emit('task.assigneesChanged', { taskId: 9, userIds: [], initiatorId: 1 });
        await settle();
        expect(repository.fetchTaskGoalId.mock.calls).toEqual([[8], [9]]);
        expect(broadcasts().map(({ data }) => data)).toEqual([
            { goalId: 20, taskIds: [8], kind: 'updated' },
            { goalId: 20, taskIds: [9], kind: 'updated' },
        ]);
    });

    it('does not touch the database when real-time is not configured', async () => {
        centrifugo.isEnabled.mockReturnValue(false);
        eventBus.emit('task.updated', { task, changes: {}, initiatorId: 1 });
        eventBus.emit('task.tagsChanged', { taskId: 8, tagId: 3, added: true, initiatorId: 1 });
        await settle();
        expect(repository.fetchGoalMemberIds).not.toHaveBeenCalled();
        expect(repository.fetchTaskGoalId).not.toHaveBeenCalled();
        expect(centrifugo.broadcastToUsers).not.toHaveBeenCalled();
    });
});
