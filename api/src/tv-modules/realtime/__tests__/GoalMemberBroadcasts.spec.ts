import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SprintsSchemaTypeForSelect, TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import { eventBus } from '../../../core/EventBus';
import type { CentrifugoBroadcastToUsersArgs } from '../../../types/centrifugo.types';
import { FilesDispatcher } from '../../files/FilesDispatcher';
import { RecurrenceDispatcher } from '../../recurrence/RecurrenceDispatcher';
import { SprintsDispatcher } from '../../sprints/SprintsDispatcher';

const centrifugo = vi.hoisted(() => ({ isEnabled: vi.fn(() => true), broadcastToUsers: vi.fn(async (_args: CentrifugoBroadcastToUsersArgs) => true) }));
const repository = vi.hoisted(() => ({ fetchGoalMemberIds: vi.fn(async () => [1, 2]) }));

vi.mock('../../../core/CentrifugoClient', () => ({ getCentrifugoClient: () => centrifugo }));
vi.mock('../RealtimeRepository', () => ({ RealtimeRepository: vi.fn(() => repository) }));
vi.mock('../../recurrence/RecurrenceGenerator', () => ({ RecurrenceGenerator: vi.fn(() => ({})) }));
vi.mock('../../recurrence/RecurrenceRepository', () => ({ RecurrenceRepository: vi.fn(() => ({})) }));
vi.mock('../../sprints/SprintScheduler', () => ({ SprintScheduler: vi.fn(() => ({})) }));

async function settle() {
    for (let i = 0; i < 10; i += 1) await new Promise((resolve) => setImmediate(resolve));
}

function broadcasts() {
    return centrifugo.broadcastToUsers.mock.calls.map(([args]) => args);
}

describe('Files, sprints and recurrence real-time broadcasts', () => {
    beforeAll(() => {
        new FilesDispatcher().register();
        new SprintsDispatcher().register();
        new RecurrenceDispatcher().register();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        centrifugo.isEnabled.mockReturnValue(true);
    });

    it('sends one broadcast to the project members when files change', async () => {
        eventBus.emit('files.changed', { goalId: 10, taskIds: [5], initiatorId: 1 });
        await settle();
        expect(repository.fetchGoalMemberIds).toHaveBeenCalledWith(10);
        expect(broadcasts()).toEqual([{ userIds: [1, 2], event: 'files.changed', data: { goalId: 10, taskIds: [5] } }]);
    });

    it('sends one broadcast to the project members when a sprint changes', async () => {
        eventBus.emit('sprint.created', { sprint: { id: 3, goalId: 10 } as SprintsSchemaTypeForSelect, initiatorId: 1 });
        await settle();
        expect(broadcasts()).toEqual([{ userIds: [1, 2], event: 'sprints.changed', data: { goalId: 10, sprintId: 3 } }]);
    });

    it('announces a new instance of a recurring task without its content', async () => {
        const task = { id: 5, goalId: 10, recurrenceRuleId: 7 } as TasksSchemaTypeForSelect;
        eventBus.emit('task.created', { task, initiatorId: 1 });
        await settle();
        expect(broadcasts()).toEqual([
            { userIds: [1, 2], event: 'recurrence.instanceCreated', data: { goalId: 10, ruleId: 7, taskId: 5 } },
        ]);
    });

    it('does not touch the database when real-time is not configured', async () => {
        centrifugo.isEnabled.mockReturnValue(false);
        eventBus.emit('files.changed', { goalId: 10, taskIds: [5], initiatorId: 1 });
        eventBus.emit('sprint.deleted', { sprintId: 3, goalId: 10, initiatorId: 1 });
        eventBus.emit('task.created', { task: { id: 5, goalId: 10, recurrenceRuleId: 7 } as TasksSchemaTypeForSelect, initiatorId: 1 });
        await settle();
        expect(repository.fetchGoalMemberIds).not.toHaveBeenCalled();
        expect(centrifugo.broadcastToUsers).not.toHaveBeenCalled();
    });
});
