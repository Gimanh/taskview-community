import { getCentrifugoClient } from '../../core/CentrifugoClient';
import type { Dispatcher } from '../../core/Dispatcher';
import { eventBus } from '../../core/EventBus';
import { $logger } from '../../modules/logget';
import { RealtimeRepository } from '../realtime/RealtimeRepository';

const FILES_RT_EVENT = 'files.changed';

export class FilesDispatcher implements Dispatcher {
    private readonly realtime = new RealtimeRepository();

    register(): void {
        eventBus.on('files.changed', (d) => this.notifyGoalMembers(d.goalId, { taskIds: d.taskIds }));
    }

    async registerWorkers(): Promise<void> {}

    private async notifyGoalMembers(goalId: number, payload: Record<string, unknown>): Promise<void> {
        const centrifugo = getCentrifugoClient();
        if (!centrifugo.isEnabled()) return;
        try {
            const userIds = await this.realtime.fetchGoalMemberIds(goalId);
            await centrifugo.broadcastToUsers({ userIds, event: FILES_RT_EVENT, data: { goalId, ...payload } });
        } catch (err) {
            $logger.error(err, '[FilesDispatcher] real-time publish failed');
        }
    }
}
