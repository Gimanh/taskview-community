import { afterEach, describe, expect, it, vi } from 'vitest';
import { Database } from '../../../modules/db';
import { TasksRepository } from '../TasksRepository';
import { TASK_UPDATABLE_COLUMNS, TaskArkTypeUpdate } from '../tasks.server.types';

vi.mock('../../../modules/db', () => ({
    Database: {
        getInstance: vi.fn(),
    },
}));

// Captures what reaches Drizzle's .set() so the test can assert which columns the
// repository is willing to write, without a database.
function mockUpdateChain(returningRow: object = {}) {
    const set = vi.fn((_values: Record<string, unknown>) => ({ where: () => ({ returning: async () => [returningRow] }) }));
    const update = vi.fn(() => ({ set }));
    // where() is awaited directly by the task lookup and .limit()-ed by the list lookup
    const whereResult = Object.assign(Promise.resolve([returningRow]), { limit: async () => [returningRow] });
    const select = vi.fn(() => ({ from: () => ({ where: () => whereResult }) }));
    vi.mocked(Database.getInstance).mockReturnValue({ dbDrizzle: { update, select } } as any);
    return { set, update, select };
}

// Mass assignment (CWE-915): ArkType keeps undeclared keys, so anything the client
// sends alongside the declared fields used to be spread straight into .set().
describe('TasksRepository.updateTask mass-assignment guard', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('drops server-managed columns injected next to a legitimate field', async () => {
        const { set } = mockUpdateChain();
        const repository = new TasksRepository();

        await repository.updateTask({
            id: 1,
            description: 'pwned-cross-org',
            kanbanOrder: 500000,
            goalId: 3,
            creatorId: 9,
            sprintId: 7,
            owner: 9,
            recurrenceRuleId: 4,
            sourceUrl: 'https://evil.test',
            dateComplete: '2026-01-01',
        } as any);

        expect(set).toHaveBeenCalledTimes(1);
        const written = set.mock.calls[0][0];
        expect(written).toEqual({ description: 'pwned-cross-org', kanbanOrder: 500000 });
        expect(written).not.toHaveProperty('goalId');
        expect(written).not.toHaveProperty('creatorId');
        expect(written).not.toHaveProperty('sprintId');
        expect(written).not.toHaveProperty('owner');
        expect(written).not.toHaveProperty('id');
    });

    it('still writes every declared editable field', async () => {
        const { set } = mockUpdateChain();
        const repository = new TasksRepository();

        await repository.updateTask({
            id: 1,
            parentId: null,
            description: 'd',
            complete: true,
            goalListId: 2,
            note: 'n',
            priorityId: 2,
            startDate: '2026-01-01',
            endDate: '2026-01-02',
            startTime: '10:00',
            endTime: '11:00',
            statusId: 5,
            taskOrder: 1,
            kanbanOrder: 2,
            amount: '10.00',
            transactionType: 1,
            nodeGraphPosition: { x: 1, y: 2 },
            estimateValue: 3,
        });

        expect(set.mock.calls[0][0]).toEqual({
            parentId: null,
            description: 'd',
            complete: true,
            goalListId: 2,
            note: 'n',
            priorityId: 2,
            startDate: '2026-01-01',
            endDate: '2026-01-02',
            startTime: '10:00',
            endTime: '11:00',
            statusId: 5,
            taskOrder: 1,
            kanbanOrder: 2,
            amount: '10.00',
            transactionType: 1,
            nodeGraphPosition: { x: 1, y: 2 },
            estimateValue: 3,
        });
    });

    it('does not issue an UPDATE when only server-managed columns were sent', async () => {
        const row = { id: 1, goalId: 2, description: 'untouched' };
        const { set, update, select } = mockUpdateChain(row);
        const repository = new TasksRepository();

        const result = await repository.updateTask({ id: 1, goalId: 3, creatorId: 9 } as any);

        expect(update).not.toHaveBeenCalled();
        expect(set).not.toHaveBeenCalled();
        expect(select).toHaveBeenCalledTimes(1);
        expect(result).toEqual(row);
    });

    it('keeps the kanban move payload (kanbanOrder + statusId) writable', async () => {
        const { set } = mockUpdateChain();
        const repository = new TasksRepository();

        await repository.updateTask({ id: 1, kanbanOrder: 42, statusId: 7 });

        expect(set.mock.calls[0][0]).toEqual({ kanbanOrder: 42, statusId: 7 });
    });

    it('allowlist covers every field the update schema declares, and nothing else', () => {
        const declared = TaskArkTypeUpdate.props.map((prop) => String(prop.key)).filter((key) => key !== 'id').sort();
        expect([...TASK_UPDATABLE_COLUMNS].sort()).toEqual(declared);
    });
});
