import type { Dispatcher } from '../../core/Dispatcher';
import { eventBus } from '../../core/EventBus';
import { AutomationEngine } from './AutomationEngine';
import { AutomationOptionRemovalHandler } from './AutomationOptionRemovalHandler';
import { AutomationRunQueue } from './AutomationRunQueue';
import { automationCatalog } from './catalog/AutomationCatalog';

export class AutomationsDispatcher implements Dispatcher {
    private readonly queue = new AutomationRunQueue();
    private readonly engine = new AutomationEngine({ catalog: automationCatalog, queue: this.queue });
    private readonly optionRemoval = new AutomationOptionRemovalHandler(automationCatalog);

    register(): void {
        eventBus.on('task.created', (data) => this.engine.handle({ name: 'task.created', task: data.task, changes: {} }));
        eventBus.on('task.updated', (data) => this.engine.handle({ name: 'task.updated', task: data.task, changes: data.changes }));
        eventBus.on('task.tagsChanged', (data) =>
            this.engine.handleForTask({ name: 'task.tagsChanged', taskId: data.taskId, changes: { tagId: data.tagId, added: data.added } })
        );
        eventBus.on('kanban.statusDeleted', (data) =>
            this.optionRemoval.handle({ goalId: data.goalId, source: 'kanban.statuses', id: data.statusId })
        );
        eventBus.on('tag.deleted', (data) => this.optionRemoval.handle({ goalId: data.goalId, source: 'tags.goalTags', id: data.tagId }));
        eventBus.on('list.deleted', (data) => this.optionRemoval.handle({ goalId: data.goalId, source: 'lists.goalLists', id: data.listId }));
    }

    async registerWorkers(): Promise<void> {
        await this.queue.work((job) => this.engine.run(job));
    }
}
