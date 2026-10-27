import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutomationOptionRemovalHandler } from '../AutomationOptionRemovalHandler';
import { AutomationsRepository } from '../AutomationsRepository';
import { AutomationCatalog } from '../catalog/AutomationCatalog';
import type { AutomationModuleDefinition, AutomationRuleRow } from '../types';

vi.mock('../AutomationsRepository', () => ({ AutomationsRepository: vi.fn() }));

const GOAL_ID = 10;

const module = {
    name: 'kanban',
    events: [{ name: 'moved', busEvents: ['task.updated'], params: [{ key: 'statusId', source: 'kanban.statuses' }], match: () => true }],
    actions: [
        { name: 'move', params: [{ key: 'statusId', source: 'kanban.statuses' }], requiredPermissions: [], emits: () => null, execute: vi.fn() },
        { name: 'tag', params: [{ key: 'tagId', source: 'tags.goalTags' }], requiredPermissions: [], emits: () => null, execute: vi.fn() },
        { name: 'noop', params: [], requiredPermissions: [], emits: () => null, execute: vi.fn() },
    ],
    dataSources: {},
} as unknown as AutomationModuleDefinition;

function rule(overrides: Partial<AutomationRuleRow>): AutomationRuleRow {
    return {
        id: 1,
        goalId: GOAL_ID,
        creatorId: 7,
        name: 'rule',
        enabled: true,
        triggerModule: 'kanban',
        triggerEvent: 'moved',
        triggerParams: { statusId: 1 },
        actionModule: 'kanban',
        actionName: 'noop',
        actionParams: {},
        createdAt: new Date(),
        editedAt: new Date(),
        ...overrides,
    };
}

function setup(rows: AutomationRuleRow[] | null) {
    const disableMany = vi.fn(async () => [] as number[]);
    vi.mocked(AutomationsRepository).mockImplementation(() => ({ listEnabledForGoal: vi.fn(async () => rows), disableMany }) as any);
    return { handler: new AutomationOptionRemovalHandler(new AutomationCatalog([module])), disableMany };
}

describe('AutomationOptionRemovalHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('disables rules that use the removed value in the trigger or the action', async () => {
        const { handler, disableMany } = setup([
            rule({ id: 1, triggerParams: { statusId: 5 } }),
            rule({ id: 2, triggerParams: { statusId: 1 }, actionName: 'move', actionParams: { statusId: 5 } }),
            rule({ id: 3, triggerParams: { statusId: 1 }, actionName: 'move', actionParams: { statusId: 6 } }),
        ]);
        await handler.handle({ goalId: GOAL_ID, source: 'kanban.statuses', id: 5 });
        expect(disableMany).toHaveBeenCalledWith({ goalId: GOAL_ID, ruleIds: [1, 2] });
    });

    it('ignores the same id coming from another data source', async () => {
        const { handler, disableMany } = setup([
            rule({ id: 1, triggerParams: { statusId: 5 } }),
            rule({ id: 2, actionName: 'tag', actionParams: { tagId: 5 } }),
        ]);
        await handler.handle({ goalId: GOAL_ID, source: 'tags.goalTags', id: 5 });
        expect(disableMany).toHaveBeenCalledWith({ goalId: GOAL_ID, ruleIds: [2] });
    });

    it('does nothing when the rules can not be loaded', async () => {
        const { handler, disableMany } = setup(null);
        await handler.handle({ goalId: GOAL_ID, source: 'kanban.statuses', id: 5 });
        expect(disableMany).not.toHaveBeenCalled();
    });
});
