import { afterEach, describe, expect, it, vi } from 'vitest';
import { Database } from '../../../modules/db';
import { GoalListsRepository } from '../GoalListsRepository';

vi.mock('../../../modules/db', () => ({
    Database: {
        getInstance: vi.fn(),
    },
}));

function mockUpdateChain(returningRow: object = {}) {
    const set = vi.fn((_values: Record<string, unknown>) => ({ where: () => ({ returning: async () => [returningRow] }) }));
    const update = vi.fn(() => ({ set }));
    // where() is awaited directly by the task lookup and .limit()-ed by the list lookup
    const whereResult = Object.assign(Promise.resolve([returningRow]), { limit: async () => [returningRow] });
    const select = vi.fn(() => ({ from: () => ({ where: () => whereResult }) }));
    vi.mocked(Database.getInstance).mockReturnValue({ dbDrizzle: { update, select } } as any);
    return { set, update, select };
}

describe('GoalListsRepository.updateListNew mass-assignment guard', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('drops goalId, owner and creatorId injected next to a legitimate field', async () => {
        const { set } = mockUpdateChain();
        const repository = new GoalListsRepository();

        await repository.updateListNew({
            id: 1,
            name: 'renamed',
            goalId: 3,
            owner: 9,
            creatorId: 9,
            someOther: 1
        } as any);

        expect(set).toHaveBeenCalledTimes(1);
        expect(set.mock.calls[0][0]).toEqual({ name: 'renamed' });
    });

    it('writes archive, which is a user-editable field sent by the web app and MCP', async () => {
        const { set } = mockUpdateChain();
        const repository = new GoalListsRepository();

        await repository.updateListNew({ id: 1, archive: 1 });

        expect(set).toHaveBeenCalledTimes(1);
        expect(set.mock.calls[0][0]).toEqual({ archive: 1 });
    });

    it('still writes name and description', async () => {
        const { set } = mockUpdateChain();
        const repository = new GoalListsRepository();

        await repository.updateListNew({ id: 1, name: 'n', description: null });

        expect(set.mock.calls[0][0]).toEqual({ name: 'n', description: null });
    });

    it('does not issue an UPDATE when only server-managed columns were sent', async () => {
        const row = { id: 1, goalId: 2, name: 'untouched' };
        const { set, update, select } = mockUpdateChain(row);
        const repository = new GoalListsRepository();

        const result = await repository.updateListNew({ id: 1, goalId: 3 } as any);

        expect(update).not.toHaveBeenCalled();
        expect(set).not.toHaveBeenCalled();
        expect(select).toHaveBeenCalledTimes(1);
        expect(result).toEqual([row]);
    });

    it('ignores a null name, since the column is NOT NULL', async () => {
        const { set } = mockUpdateChain();
        const repository = new GoalListsRepository();

        await repository.updateListNew({ id: 1, name: null, description: 'd' });

        expect(set.mock.calls[0][0]).toEqual({ description: 'd' });
    });
});
