import { getJobQueue } from '../../core/JobQueue';
import { $logger } from '../../modules/logget';
import { SprintsRepository } from './SprintsRepository';

export const SPRINT_CADENCE_JOB = 'sprint-cadence-generate';

export class SprintScheduler {
    private readonly repo = new SprintsRepository();

    /**
     * Ensure the current + `lookahead` future sprints exist for a goal whose
     * cadence is enabled. Windows run every `length_days` from `start_date`.
     * Idempotent: skips windows whose start date already has a live (non-completed)
     * sprint, so manual sprints and repeated runs never duplicate. All generated
     * sprints are created as `planned` — activation is always manual.
     * Returns the number of sprints created.
     */
    async generateCadenceForGoal(goalId: number): Promise<number> {
        const cadence = await this.repo.getCadence(goalId);
        if (!cadence || !cadence.enabled) return 0;

        const lengthDays = cadence.lengthDays > 0 ? cadence.lengthDays : 14;
        const lookahead = cadence.lookahead >= 0 ? cadence.lookahead : 0;
        const today = new Date().toISOString().slice(0, 10);

        const offset = this.daysBetween(cadence.startDate, today);
        const currentIdx = offset < 0 ? 0 : Math.floor(offset / lengthDays);
        const lastIdx = currentIdx + lookahead;

        let created = 0;
        let maxStart = cadence.lastGeneratedDate ?? null;

        for (let idx = currentIdx; idx <= lastIdx; idx++) {
            const winStart = this.addDays(cadence.startDate, idx * lengthDays);
            const winEnd = this.addDays(winStart, lengthDays - 1);

            const existing = await this.repo.findByGoalAndStartDate({ goalId, startDate: winStart });
            if (existing) {
                if (!maxStart || winStart > maxStart) maxStart = winStart;
                continue;
            }

            const name = cadence.nameTemplate.includes('{n}')
                ? cadence.nameTemplate.replace('{n}', String(idx + 1))
                : `${cadence.nameTemplate} ${idx + 1}`;

            const sprint = await this.repo.createCadenceSprint({ goalId, name, startDate: winStart, endDate: winEnd });
            if (!sprint) continue;
            created++;
            if (!maxStart || winStart > maxStart) maxStart = winStart;
        }

        if (maxStart) await this.repo.setCadenceLastGenerated({ goalId, lastGeneratedDate: maxStart });
        $logger.info(`[SprintScheduler] cadence goal=${goalId} created=${created} windows=[${currentIdx}..${lastIdx}]`);
        return created;
    }

    async registerCadenceWorker(): Promise<void> {
        const boss = getJobQueue();
        await boss.createQueue(SPRINT_CADENCE_JOB);
        await boss.schedule(SPRINT_CADENCE_JOB, '0 1 * * *');

        await boss.work(SPRINT_CADENCE_JOB, async () => {
            const cadences = await this.repo.getEnabledCadences();
            for (const c of cadences) {
                await this.generateCadenceForGoal(c.goalId).catch((e) =>
                    $logger.error(e, `[SprintScheduler] cadence sweep goal=${c.goalId}`)
                );
            }
        });
    }

    private addDays(dateStr: string, days: number): string {
        const d = new Date(`${dateStr}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + days);
        return d.toISOString().slice(0, 10);
    }

    private daysBetween(from: string, to: string): number {
        const a = new Date(`${from}T00:00:00Z`).getTime();
        const b = new Date(`${to}T00:00:00Z`).getTime();
        return Math.floor((b - a) / 86_400_000);
    }
}
