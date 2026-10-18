import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import { AutomationActorFactory } from '../AutomationActorFactory';
import { AutomationEngine } from '../AutomationEngine';
import { AutomationPermissions } from '../AutomationPermissions';
import type { AutomationRunQueue } from '../AutomationRunQueue';
import { AutomationsRepository } from '../AutomationsRepository';
import { AutomationCatalog } from '../catalog/AutomationCatalog';
import { TasksRepository } from '../../tasks/TasksRepository';
import { $logger } from '../../../modules/logget';
import type {
    AutomationActionExecuteArgs,
    AutomationEventMatchArgs,
    AutomationModuleDefinition,
    AutomationRuleRow,
    AutomationRunJob,
} from '../types';

vi.mock('../AutomationsRepository', () => ({ AutomationsRepository: vi.fn() }));
vi.mock('../../tasks/TasksRepository', () => ({ TasksRepository: vi.fn() }));
vi.mock('../AutomationActorFactory', () => ({ AutomationActorFactory: vi.fn() }));
vi.mock('../AutomationPermissions', () => ({ AutomationPermissions: { canRun: vi.fn() } }));
vi.mock('../../../modules/logget', () => ({ $logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

const GOAL_ID = 10;
const CREATOR_ID = 7;
const EDITED_AT = new Date('2026-10-01T10:00:00.000Z');
const actor = { id: 'actor' };

function task(overrides: Partial<TasksSchemaTypeForSelect> = {}): TasksSchemaTypeForSelect {
    return { id: 1, goalId: GOAL_ID, complete: false, statusId: 1, ...overrides } as TasksSchemaTypeForSelect;
}

function rule(overrides: Partial<AutomationRuleRow>): AutomationRuleRow {
    return {
        id: 1,
        goalId: GOAL_ID,
        creatorId: CREATOR_ID,
        name: 'rule',
        enabled: true,
        triggerModule: 'test',
        triggerEvent: 'ping',
        triggerParams: {},
        actionModule: 'test',
        actionName: 'record',
        actionParams: {},
        createdAt: EDITED_AT,
        editedAt: EDITED_AT,
        ...overrides,
    };
}

function setup(rules: AutomationRuleRow[], fetched: Partial<TasksSchemaTypeForSelect> | null = {}) {
    const executed: number[] = [];
    const jobs: AutomationRunJob[] = [];
    let engine: AutomationEngine;

    const module = {
        name: 'test',
        events: [
            { name: 'ping', busEvents: ['task.updated'], params: [], match: ({ busEvent }: AutomationEventMatchArgs) => busEvent.changes.ping === true },
            {
                name: 'step',
                busEvents: ['task.updated'],
                params: [{ key: 'n', source: 'kanban.statuses' }],
                match: ({ busEvent, params }: AutomationEventMatchArgs) => busEvent.changes.step === params.n,
            },
            {
                name: 'tagged',
                busEvents: ['task.tagsChanged'],
                params: [],
                match: ({ busEvent }: AutomationEventMatchArgs) => busEvent.changes.added === true,
            },
            { name: 'touched', busEvents: ['task.created', 'task.updated'], params: [], match: () => true },
        ],
        actions: [
            {
                name: 'record',
                params: [{ key: 'n', source: 'kanban.statuses' }],
                requiredPermissions: [],
                emits: () => null,
                execute: async ({ params }: AutomationActionExecuteArgs) => {
                    executed.push(params.n);
                    return 'applied' as const;
                },
            },
            {
                name: 'next',
                params: [{ key: 'n', source: 'kanban.statuses' }],
                requiredPermissions: [],
                emits: () => null,
                execute: async ({ task: current, params }: AutomationActionExecuteArgs) => {
                    executed.push(params.n);
                    void engine.handle({ name: 'task.updated', task: current, changes: { step: params.n + 1, ping: true } });
                    return 'applied' as const;
                },
            },
            {
                name: 'tagNext',
                params: [{ key: 'n', source: 'kanban.statuses' }],
                requiredPermissions: [],
                emits: () => null,
                execute: async ({ task: current, params }: AutomationActionExecuteArgs) => {
                    executed.push(params.n);
                    void engine.handleForTask({ name: 'task.tagsChanged', taskId: current.id, changes: { added: true } });
                    return 'applied' as const;
                },
            },
            { name: 'fail', params: [], requiredPermissions: [], emits: () => null, execute: async () => 'failed' as const },
            {
                name: 'crash',
                params: [],
                requiredPermissions: [],
                emits: () => null,
                execute: async () => {
                    throw new Error('database is down');
                },
            },
        ],
        dataSources: {},
    } as unknown as AutomationModuleDefinition;

    const forGoalOwner = vi.fn(async () => actor);
    const enqueue = vi.fn(async (job: AutomationRunJob) => {
        jobs.push(job);
    });
    vi.mocked(AutomationsRepository).mockImplementation(
        () =>
            ({
                listEnabledForGoal: vi.fn(async () => rules.filter((item) => item.enabled)),
                getById: vi.fn(async (id: number) => rules.find((item) => item.id === id) ?? null),
            }) as any
    );
    const fetchTaskByIdNew = vi.fn(async (id: number) => (fetched === null ? null : task({ id, ...fetched })));
    vi.mocked(TasksRepository).mockImplementation(() => ({ fetchTaskByIdNew }) as any);
    vi.mocked(AutomationActorFactory).mockImplementation(() => ({ forGoalOwner }) as any);
    vi.mocked(AutomationPermissions.canRun).mockResolvedValue(true);

    engine = new AutomationEngine({ catalog: new AutomationCatalog([module]), queue: { enqueue } as unknown as AutomationRunQueue });

    async function drain() {
        while (jobs.length > 0) {
            await engine.run(jobs.shift() as AutomationRunJob);
        }
    }

    async function emit(changes: Record<string, unknown>) {
        await engine.handle({ name: 'task.updated', task: task(), changes });
        await drain();
    }

    return { engine, executed, jobs, enqueue, forGoalOwner, drain, emit };
}

describe('AutomationEngine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('schedules one job with the matching rules and runs it', async () => {
        const { engine, executed, jobs, drain } = setup([rule({ id: 1, actionParams: { n: 42 } }), rule({ id: 2, actionParams: { n: 43 } })]);
        await engine.handle({ name: 'task.updated', task: task(), changes: { ping: true } });

        expect(jobs).toEqual([
            {
                goalId: GOAL_ID,
                taskId: 1,
                rules: [
                    { id: 1, editedAt: EDITED_AT.toISOString() },
                    { id: 2, editedAt: EDITED_AT.toISOString() },
                ],
                chain: { depth: 1, firedRuleIds: [1, 2] },
            },
        ]);
        expect(executed).toEqual([]);

        await drain();
        expect(executed).toEqual([42, 43]);
    });

    it('does not schedule anything when no rule matches', async () => {
        const { engine, enqueue } = setup([rule({ actionParams: { n: 42 } })]);
        await engine.handle({ name: 'task.updated', task: task(), changes: { ping: false } });
        await engine.handle({ name: 'task.created', task: task(), changes: { ping: true } });
        expect(enqueue).not.toHaveBeenCalled();
    });

    it('matches event params', async () => {
        const { executed, emit } = setup([
            rule({ id: 1, triggerEvent: 'step', triggerParams: { n: 1 }, actionParams: { n: 100 } }),
            rule({ id: 2, triggerEvent: 'step', triggerParams: { n: 2 }, actionParams: { n: 200 } }),
        ]);
        await emit({ step: 2 });
        expect(executed).toEqual([200]);
    });

    it('skips a rule that was edited after it was scheduled', async () => {
        const rules = [rule({ actionParams: { n: 42 } })];
        const { engine, executed, drain } = setup(rules);
        await engine.handle({ name: 'task.updated', task: task(), changes: { ping: true } });
        rules[0].editedAt = new Date('2026-10-02T10:00:00.000Z');
        await drain();
        expect(executed).toEqual([]);
    });

    it('skips a rule that was disabled after it was scheduled', async () => {
        const rules = [rule({ actionParams: { n: 42 } })];
        const { engine, executed, drain } = setup(rules);
        await engine.handle({ name: 'task.updated', task: task(), changes: { ping: true } });
        rules[0].enabled = false;
        await drain();
        expect(executed).toEqual([]);
    });

    it('skips the rule when the project owner lacks the permissions', async () => {
        const { executed, emit } = setup([rule({ actionParams: { n: 42 } })]);
        vi.mocked(AutomationPermissions.canRun).mockResolvedValue(false);
        await emit({ ping: true });
        expect(executed).toEqual([]);
    });

    it('skips the rule when the task moved to another project', async () => {
        const { executed, emit } = setup([rule({ actionParams: { n: 42 } })], { goalId: 99 });
        await emit({ ping: true });
        expect(executed).toEqual([]);
    });

    it('runs every rule at most once per chain', async () => {
        const { executed, emit } = setup([rule({ id: 1, actionName: 'next', actionParams: { n: 1 } })]);
        await emit({ ping: true });
        expect(executed).toEqual([1]);
    });

    it('carries the chain to the next job and stops at the depth limit', async () => {
        const rules = Array.from({ length: 8 }, (_, index) =>
            rule({ id: index + 1, triggerEvent: 'step', triggerParams: { n: index + 1 }, actionName: 'next', actionParams: { n: index + 1 } })
        );
        const { executed, enqueue, emit } = setup(rules);
        await emit({ step: 1 });
        expect(executed).toEqual([1, 2, 3, 4, 5]);
        expect(enqueue.mock.calls.map(([job]) => job.chain)).toEqual([
            { depth: 1, firedRuleIds: [1] },
            { depth: 2, firedRuleIds: [1, 2] },
            { depth: 3, firedRuleIds: [1, 2, 3] },
            { depth: 4, firedRuleIds: [1, 2, 3, 4] },
            { depth: 5, firedRuleIds: [1, 2, 3, 4, 5] },
        ]);
    });

    it('starts a new chain for every outside event', async () => {
        const { executed, emit } = setup([rule({ actionParams: { n: 42 } })]);
        await emit({ ping: true });
        await emit({ ping: true });
        expect(executed).toEqual([42, 42]);
    });

    it('runs every rule as the project owner, loaded once per job, whoever authored it', async () => {
        const { executed, forGoalOwner, emit } = setup([
            rule({ id: 1, actionParams: { n: 1 } }),
            rule({ id: 2, actionParams: { n: 2 } }),
            rule({ id: 3, creatorId: 8, actionParams: { n: 3 } }),
        ]);
        await emit({ ping: true });
        expect(executed).toEqual([1, 2, 3]);
        expect(forGoalOwner.mock.calls).toEqual([[GOAL_ID]]);
    });

    it('skips the rule when the project owner is unavailable', async () => {
        const { executed, forGoalOwner, emit } = setup([rule({ actionParams: { n: 42 } })]);
        forGoalOwner.mockResolvedValue(null as any);
        await emit({ ping: true });
        expect(executed).toEqual([]);
        expect($logger.warn).toHaveBeenCalledWith(expect.stringContaining('owner of goal=10 is unavailable'));
    });

    it('logs an action that failed without retrying the job', async () => {
        const { engine, jobs } = setup([rule({ id: 3, actionName: 'fail' })]);
        await engine.handle({ name: 'task.updated', task: task(), changes: { ping: true } });
        await expect(engine.run(jobs[0])).resolves.toBeUndefined();
        expect($logger.warn).toHaveBeenCalledWith(expect.stringContaining('rule=3 action test/fail failed'));
    });

    it('runs the other rules and fails the job when an action crashes, so the queue retries it', async () => {
        const { engine, executed, jobs } = setup([rule({ id: 1, actionName: 'crash' }), rule({ id: 2, actionParams: { n: 42 } })]);
        await engine.handle({ name: 'task.updated', task: task(), changes: { ping: true } });
        await expect(engine.run(jobs[0])).rejects.toThrow('database is down');
        expect(executed).toEqual([42]);
    });

    it('finishes a job only after the next step is scheduled', async () => {
        const { engine, jobs, enqueue } = setup([
            rule({ id: 1, triggerEvent: 'step', triggerParams: { n: 1 }, actionName: 'next', actionParams: { n: 1 } }),
            rule({ id: 2, triggerEvent: 'step', triggerParams: { n: 2 }, actionParams: { n: 2 } }),
        ]);
        await engine.handle({ name: 'task.updated', task: task(), changes: { step: 1 } });
        const first = jobs.shift() as AutomationRunJob;

        enqueue.mockRejectedValueOnce(new Error('queue is down'));
        await expect(engine.run(first)).rejects.toThrow('queue is down');
    });

    it('loads the task for an event that carries only its id', async () => {
        const { engine, jobs, executed, drain } = setup([rule({ id: 4, triggerEvent: 'tagged', actionParams: { n: 7 } })]);
        await engine.handleForTask({ name: 'task.tagsChanged', taskId: 3, changes: { added: true } });
        expect(jobs.map((job) => job.taskId)).toEqual([3]);
        await drain();
        expect(executed).toEqual([7]);
    });

    it('skips an event for a task that no longer exists', async () => {
        const { engine, enqueue } = setup([rule({ triggerEvent: 'tagged' })], null);
        await engine.handleForTask({ name: 'task.tagsChanged', taskId: 3, changes: { added: true } });
        expect(enqueue).not.toHaveBeenCalled();
    });

    it('chains an action into an event that carries only the task id', async () => {
        const { executed, jobs, emit } = setup([
            rule({ id: 1, actionName: 'tagNext', actionParams: { n: 1 } }),
            rule({ id: 2, triggerEvent: 'tagged', actionParams: { n: 2 } }),
        ]);
        await emit({ ping: true });
        expect(executed).toEqual([1, 2]);
        expect(jobs).toEqual([]);
    });

    it('matches an event that listens to several bus events', async () => {
        const { engine, enqueue } = setup([rule({ triggerEvent: 'touched' })]);
        await engine.handle({ name: 'task.created', task: task(), changes: {} });
        await engine.handle({ name: 'task.updated', task: task(), changes: {} });
        await engine.handle({ name: 'task.tagsChanged', task: task(), changes: {} });
        expect(enqueue).toHaveBeenCalledTimes(2);
    });
});
