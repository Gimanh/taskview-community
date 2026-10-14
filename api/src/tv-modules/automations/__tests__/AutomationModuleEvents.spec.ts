import { describe, expect, it, vi } from 'vitest';
import type { TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import { automationCatalog } from '../catalog/AutomationCatalog';
import type { AutomationBusEvent, AutomationFindEventArgs, AutomationParams } from '../types';

vi.mock('../AutomationsRepository', () => ({ AutomationsRepository: vi.fn() }));

const task = (overrides: Partial<TasksSchemaTypeForSelect> = {}) => ({ id: 1, goalId: 10, goalListId: null, ...overrides }) as TasksSchemaTypeForSelect;

function matches(ref: AutomationFindEventArgs, busEvent: AutomationBusEvent, params: AutomationParams): boolean {
    const event = automationCatalog.findEvent(ref);
    if (!event) throw new Error(`Unknown event ${ref.module}/${ref.event}`);
    return event.busEvents.includes(busEvent.name) && event.match({ busEvent, params });
}

describe('Lists and tags automation events', () => {
    const addedToList = { module: 'lists', event: 'task.addedToList' };

    it('fires when a task is moved into the list', () => {
        expect(matches(addedToList, { name: 'task.updated', task: task({ goalListId: 4 }), changes: { goalListId: 4 } }, { goalListId: 4 })).toBe(true);
        expect(matches(addedToList, { name: 'task.updated', task: task({ goalListId: 5 }), changes: { goalListId: 5 } }, { goalListId: 4 })).toBe(false);
    });

    it('does not fire when another field of a task in the list changes', () => {
        expect(matches(addedToList, { name: 'task.updated', task: task({ goalListId: 4 }), changes: { description: 'x' } }, { goalListId: 4 })).toBe(false);
    });

    it('fires when a task is created right in the list', () => {
        expect(matches(addedToList, { name: 'task.created', task: task({ goalListId: 4 }), changes: {} }, { goalListId: 4 })).toBe(true);
        expect(matches(addedToList, { name: 'task.created', task: task(), changes: {} }, { goalListId: 4 })).toBe(false);
    });

    it('tells a tag that was added from one that was removed', () => {
        const added = { module: 'tags', event: 'tag.addedToTask' };
        const removed = { module: 'tags', event: 'tag.removedFromTask' };
        const tagged = (isAdded: boolean): AutomationBusEvent => ({ name: 'task.tagsChanged', task: task(), changes: { tagId: 3, added: isAdded } });

        expect(matches(added, tagged(true), { tagId: 3 })).toBe(true);
        expect(matches(added, tagged(false), { tagId: 3 })).toBe(false);
        expect(matches(added, tagged(true), { tagId: 4 })).toBe(false);
        expect(matches(removed, tagged(false), { tagId: 3 })).toBe(true);
        expect(matches(removed, tagged(true), { tagId: 3 })).toBe(false);
    });
});
