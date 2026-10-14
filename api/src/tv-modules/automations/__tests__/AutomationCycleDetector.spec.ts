import { describe, expect, it, vi } from 'vitest';
import { AutomationCycleDetector } from '../AutomationCycleDetector';
import { automationCatalog } from '../catalog/AutomationCatalog';
import type { AutomationRuleShape } from '../types';

vi.mock('../AutomationsRepository', () => ({ AutomationsRepository: vi.fn() }));

const DONE = 5;
const REVIEW = 9;

const completedToDone: AutomationRuleShape = {
    id: 1,
    trigger: { module: 'tasks', event: 'task.completed', params: {} },
    action: { module: 'kanban', action: 'change.status', params: { statusId: DONE } },
};

const doneReopens: AutomationRuleShape = {
    id: 2,
    trigger: { module: 'kanban', event: 'task.movedToColumn', params: { statusId: DONE } },
    action: { module: 'tasks', action: 'reopen', params: {} },
};

const reopenedCompletes: AutomationRuleShape = {
    id: 3,
    trigger: { module: 'tasks', event: 'task.reopened', params: {} },
    action: { module: 'tasks', action: 'complete', params: {} },
};

const completedAddsTag: AutomationRuleShape = {
    id: 4,
    trigger: { module: 'tasks', event: 'task.completed', params: {} },
    action: { module: 'tags', action: 'add.tag', params: { tagId: 3 } },
};

const detector = new AutomationCycleDetector(automationCatalog);

describe('AutomationCycleDetector', () => {
    it('accepts a chain that ends', () => {
        expect(detector.findCycle([completedToDone, doneReopens])).toBeNull();
    });

    it('rejects rules that keep completing and reopening the task', () => {
        const cycle = detector.findCycle([completedToDone, doneReopens, reopenedCompletes]);
        expect(cycle?.map((rule) => rule.id)).toEqual([1, 2, 3]);
    });

    it('rejects a rule that triggers itself', () => {
        const selfLoop: AutomationRuleShape = {
            id: 5,
            trigger: { module: 'kanban', event: 'task.movedToColumn', params: { statusId: DONE } },
            action: { module: 'kanban', action: 'change.status', params: { statusId: DONE } },
        };
        expect(detector.findCycle([selfLoop])?.map((rule) => rule.id)).toEqual([5]);
    });

    it('ignores a column move that cannot reach the other rule', () => {
        const toReview: AutomationRuleShape = {
            id: 6,
            trigger: { module: 'tasks', event: 'task.reopened', params: {} },
            action: { module: 'kanban', action: 'change.status', params: { statusId: REVIEW } },
        };
        expect(detector.findCycle([doneReopens, toReview])).toBeNull();
    });

    it('ends the chain when no rule listens to what the action does', () => {
        expect(detector.findCycle([completedAddsTag, completedToDone])).toBeNull();
    });

    it('rejects tag rules that keep adding each other', () => {
        const tagAddsOther = (id: number, from: number, to: number): AutomationRuleShape => ({
            id,
            trigger: { module: 'tags', event: 'tag.addedToTask', params: { tagId: from } },
            action: { module: 'tags', action: 'add.tag', params: { tagId: to } },
        });
        expect(detector.findCycle([tagAddsOther(7, 3, 4), tagAddsOther(8, 4, 3)])?.map((rule) => rule.id)).toEqual([7, 8]);
        expect(detector.findCycle([tagAddsOther(7, 3, 4), tagAddsOther(8, 4, 5)])).toBeNull();
    });

    it('rejects list rules that keep moving the task between lists', () => {
        const listMovesTo = (id: number, from: number, to: number): AutomationRuleShape => ({
            id,
            trigger: { module: 'lists', event: 'task.addedToList', params: { goalListId: from } },
            action: { module: 'lists', action: 'move.toList', params: { goalListId: to } },
        });
        expect(detector.findCycle([listMovesTo(9, 1, 2), listMovesTo(10, 2, 1)])?.map((rule) => rule.id)).toEqual([9, 10]);
        expect(detector.findCycle([listMovesTo(9, 1, 2), listMovesTo(10, 2, 3)])).toBeNull();
    });
});
