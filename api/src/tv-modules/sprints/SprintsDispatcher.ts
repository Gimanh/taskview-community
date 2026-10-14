import { getCentrifugoClient } from '../../core/CentrifugoClient';
import type { Dispatcher } from '../../core/Dispatcher';
import { eventBus } from '../../core/EventBus';
import { $logger } from '../../modules/logget';
import { RealtimeRepository } from '../realtime/RealtimeRepository';
import { SprintScheduler } from './SprintScheduler';

const SPRINT_RT_EVENT = 'sprints.changed';

export class SprintsDispatcher implements Dispatcher {
    private readonly scheduler = new SprintScheduler();
    private readonly realtime = new RealtimeRepository();

    register(): void {
        eventBus.on('sprint.created', (d) => this.notifyGoalMembers(d.sprint.goalId, { sprintId: d.sprint.id }));
        eventBus.on('sprint.updated', (d) => this.notifyGoalMembers(d.sprint.goalId, { sprintId: d.sprint.id }));
        eventBus.on('sprint.activated', (d) => this.notifyGoalMembers(d.goalId, { sprintId: d.sprintId }));
        eventBus.on('sprint.reviewStarted', (d) => this.notifyGoalMembers(d.goalId, { sprintId: d.sprintId }));
        eventBus.on('sprint.completed', (d) => this.notifyGoalMembers(d.goalId, { sprintId: d.sprintId }));
        eventBus.on('sprint.paused', (d) => this.notifyGoalMembers(d.goalId, { sprintId: d.sprintId }));
        eventBus.on('sprint.resumed', (d) => this.notifyGoalMembers(d.goalId, { sprintId: d.sprintId }));
        eventBus.on('sprint.deleted', (d) => this.notifyGoalMembers(d.goalId, { sprintId: d.sprintId }));
        eventBus.on('task.assignedToSprint', (d) =>
            this.notifyGoalMembers(d.goalId, { sprintId: d.sprintId, prevSprintId: d.prevSprintId, taskId: d.taskId })
        );
    }

    async registerWorkers(): Promise<void> {
        await this.scheduler.registerCadenceWorker();
    }

    private async notifyGoalMembers(goalId: number, payload: Record<string, unknown>): Promise<void> {
        const centrifugo = getCentrifugoClient();
        if (!centrifugo.isEnabled()) return;
        try {
            const userIds = await this.realtime.fetchGoalMemberIds(goalId);
            await centrifugo.broadcastToUsers({ userIds, event: SPRINT_RT_EVENT, data: { goalId, ...payload } });
        } catch (err) {
            $logger.error(err, '[SprintsDispatcher] real-time publish failed');
        }
    }
}
