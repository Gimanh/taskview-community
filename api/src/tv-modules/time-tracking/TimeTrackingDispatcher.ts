import { getCentrifugoClient } from '../../core/CentrifugoClient'
import type { Dispatcher } from '../../core/Dispatcher'
import { eventBus, type AppEvents } from '../../core/EventBus'
import { getJobQueue } from '../../core/JobQueue'
import { $logger } from '../../modules/logget'
import { TimeTrackingRepository } from './TimeTrackingRepository'

const AUTOSTOP_JOB = 'time-tracking-autostop'

export class TimeTrackingDispatcher implements Dispatcher {
    private readonly repository = new TimeTrackingRepository()

    register(): void {
        eventBus.on('time-entry.started', (data) => this.onStarted(data))
        eventBus.on('time-entry.stopped', (data) => this.onStopped(data))
        eventBus.on('time-entry.created', (data) => this.onCreated(data))
        eventBus.on('time-entry.updated', (data) => this.onUpdated(data))
        eventBus.on('time-entry.deleted', (data) => this.onDeleted(data))
    }

    async registerWorkers(): Promise<void> {
        const boss = getJobQueue()
        await boss.createQueue(AUTOSTOP_JOB)
        await boss.schedule(AUTOSTOP_JOB, '0 * * * *')
        await boss.work(AUTOSTOP_JOB, async () => {
            await this.runAutostop()
        })
    }

    private async runAutostop(): Promise<void> {
        const stoppedEntries = await this.repository.autoStopOverdue()
        if (stoppedEntries.length === 0) return

        for (const entry of stoppedEntries) {
            eventBus.emit('time-entry.stopped', {
                entry,
                taskId: entry.taskId,
                userId: entry.userId,
                goalId: entry.goalId,
                durationSeconds: entry.durationSeconds ?? 0,
            })
        }

        $logger.info({ count: stoppedEntries.length }, '[TimeTracking] Autostop completed')
    }

    private async onStarted(data: AppEvents['time-entry.started']): Promise<void> {
        await this.publish(data.userId, 'time-entry.started', { entry: data.entry })
    }

    private async onStopped(data: AppEvents['time-entry.stopped']): Promise<void> {
        await this.publish(data.userId, 'time-entry.stopped', {
            entry: data.entry,
            durationSeconds: data.durationSeconds,
        })
    }

    private async onCreated(data: AppEvents['time-entry.created']): Promise<void> {
        await this.publish(data.entry.userId, 'time-entry.created', { entry: data.entry })
    }

    private async onUpdated(data: AppEvents['time-entry.updated']): Promise<void> {
        await this.publish(data.entry.userId, 'time-entry.updated', {
            entry: data.entry,
            changes: data.changes,
        })
        if (data.initiatorId !== data.entry.userId) {
            await this.publish(data.initiatorId, 'time-entry.updated', {
                entry: data.entry,
                changes: data.changes,
            })
        }
    }

    private async onDeleted(data: AppEvents['time-entry.deleted']): Promise<void> {
        await this.publish(data.userId, 'time-entry.deleted', { entryId: data.entryId, taskId: data.taskId })
        if (data.initiatorId !== data.userId) {
            await this.publish(data.initiatorId, 'time-entry.deleted', {
                entryId: data.entryId,
                taskId: data.taskId,
            })
        }
    }

    private async publish(userId: number, event: string, payload: Record<string, unknown>): Promise<void> {
        const centrifugo = getCentrifugoClient()
        await centrifugo.publishToUser(userId, event, payload)
    }
}
