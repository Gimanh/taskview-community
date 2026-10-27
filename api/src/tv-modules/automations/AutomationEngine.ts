import { AsyncLocalStorage } from 'node:async_hooks';
import type { AppUser } from '../../core/AppUser';
import { $logger } from '../../modules/logget';
import { TasksRepository } from '../tasks/TasksRepository';
import { AutomationActorFactory } from './AutomationActorFactory';
import { AutomationPermissions } from './AutomationPermissions';
import type { AutomationRunQueue } from './AutomationRunQueue';
import { AutomationsRepository } from './AutomationsRepository';
import type { AutomationCatalog } from './catalog/AutomationCatalog';
import {
    AUTOMATION_CHAIN_MAX_DEPTH,
    type AutomationActorForArgs,
    type AutomationBusEvent,
    type AutomationChain,
    type AutomationEngineDeps,
    type AutomationParams,
    type AutomationRuleMatchArgs,
    type AutomationRunJob,
    type AutomationRunRuleArgs,
    type AutomationTaskBusEvent,
} from './types';

export class AutomationEngine {
    private readonly chainStorage = new AsyncLocalStorage<AutomationChain>();
    private readonly catalog: AutomationCatalog;
    private readonly queue: AutomationRunQueue;
    private readonly repository = new AutomationsRepository();
    private readonly tasksRepository = new TasksRepository();
    private readonly actorFactory = new AutomationActorFactory();

    constructor(deps: AutomationEngineDeps) {
        this.catalog = deps.catalog;
        this.queue = deps.queue;
    }

    handle(busEvent: AutomationBusEvent): Promise<void> {
        return this.track(this.schedule(busEvent));
    }

    handleForTask(busEvent: AutomationTaskBusEvent): Promise<void> {
        return this.track(this.loadAndSchedule(busEvent));
    }

    async run(job: AutomationRunJob): Promise<void> {
        const chain: AutomationChain = {
            depth: job.chain.depth,
            firedRuleIds: new Set(job.chain.firedRuleIds),
            actors: new Map(),
            pending: [],
        };

        let failure: unknown = null;
        for (const ref of job.rules) {
            try {
                await this.chainStorage.run(chain, () => this.runRule({ ref, job, chain }));
            } catch (err) {
                $logger.error(err, `[Automations] rule=${ref.id} crashed for task=${job.taskId}`);
                failure ??= err;
            }
        }

        await Promise.all(chain.pending);
        if (failure) throw failure;
    }

    private track(scheduled: Promise<void>): Promise<void> {
        this.chainStorage.getStore()?.pending.push(scheduled);
        return scheduled;
    }

    private async loadAndSchedule(busEvent: AutomationTaskBusEvent): Promise<void> {
        if (!this.catalog.listensTo(busEvent.name)) return;
        const task = await this.tasksRepository.fetchTaskByIdNew(busEvent.taskId);
        if (!task) return;
        await this.schedule({ name: busEvent.name, task, changes: busEvent.changes });
    }

    private async schedule(busEvent: AutomationBusEvent): Promise<void> {
        if (!this.catalog.listensTo(busEvent.name)) return;

        const chain = this.chainStorage.getStore();
        const depth = chain?.depth ?? 0;
        if (depth >= AUTOMATION_CHAIN_MAX_DEPTH) {
            $logger.warn(`[Automations] chain depth limit reached for task=${busEvent.task.id}`);
            return;
        }

        const rules = await this.repository.listEnabledForGoal(busEvent.task.goalId);
        if (!rules) throw new Error(`[Automations] can not load rules for goal=${busEvent.task.goalId}`);

        const fired = chain?.firedRuleIds ?? new Set<number>();
        const matched = rules.filter((rule) => !fired.has(rule.id) && this.matches({ rule, busEvent }));
        if (matched.length === 0) return;

        for (const rule of matched) fired.add(rule.id);
        await this.queue.enqueue({
            goalId: busEvent.task.goalId,
            taskId: busEvent.task.id,
            rules: matched.map((rule) => ({ id: rule.id, editedAt: rule.editedAt.toISOString() })),
            chain: { depth: depth + 1, firedRuleIds: [...fired] },
        });
    }

    private matches(args: AutomationRuleMatchArgs): boolean {
        const { rule, busEvent } = args;
        const event = this.catalog.findEvent({ module: rule.triggerModule, event: rule.triggerEvent });
        if (!event || !event.busEvents.includes(busEvent.name)) return false;
        return event.match({ busEvent, params: rule.triggerParams as AutomationParams });
    }

    private async runRule(args: AutomationRunRuleArgs): Promise<void> {
        const { ref, job } = args;
        const rule = await this.repository.getById(ref.id);
        if (!rule || !rule.enabled || rule.goalId !== job.goalId || rule.editedAt.toISOString() !== ref.editedAt) {
            $logger.info(`[Automations] rule=${ref.id} skipped: changed after it was scheduled`);
            return;
        }

        const action = this.catalog.findAction({ module: rule.actionModule, action: rule.actionName });
        if (!action) return;

        const task = await this.tasksRepository.fetchTaskByIdNew(job.taskId);
        if (!task || task.goalId !== rule.goalId) return;

        const actor = await this.actorFor({ chain: args.chain, goalId: rule.goalId });
        if (!actor) {
            $logger.warn(`[Automations] rule=${rule.id} skipped: the owner of goal=${rule.goalId} is unavailable`);
            return;
        }

        const allowed = await AutomationPermissions.canRun({ actor, goalId: rule.goalId, action });
        if (!allowed) {
            $logger.warn(`[Automations] rule=${rule.id} skipped: the owner of goal=${rule.goalId} lacks permissions`);
            return;
        }

        const outcome = await action.execute({ actor, task, params: rule.actionParams as AutomationParams });
        if (outcome === 'failed') {
            $logger.warn(`[Automations] rule=${rule.id} action ${rule.actionModule}/${rule.actionName} failed for task=${task.id}`);
        }
    }

    private actorFor(args: AutomationActorForArgs): Promise<AppUser | null> {
        let actor = args.chain.actors.get(args.goalId);
        if (!actor) {
            actor = this.actorFactory.forGoalOwner(args.goalId);
            args.chain.actors.set(args.goalId, actor);
        }
        return actor;
    }
}
