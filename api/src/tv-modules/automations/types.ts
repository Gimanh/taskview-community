import { type } from 'arktype';
import type { Request } from 'express';
import type { AutomationRulesSchemaTypeForSelect, TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import type { AppUser } from '../../core/AppUser';
import type { GoalPermissionType } from '../../types/auth.types';
import type { AutomationRunQueue } from './AutomationRunQueue';
import type { AutomationCatalog } from './catalog/AutomationCatalog';

export const AUTOMATION_RULES_PER_GOAL_LIMIT = 100;
export const AUTOMATION_CHAIN_MAX_DEPTH = 5;
export const AUTOMATION_RULE_NAME_MAX_LENGTH = 255;
export const AUTOMATION_RUN_QUEUE = 'automations-run';
export const AUTOMATION_RUN_RETRY_LIMIT = 3;
export const AUTOMATION_RUN_CONCURRENCY = 5;
export const AUTOMATION_RUN_POLLING_SECONDS = 0.5;

const toNumber = type('string | number').pipe((v) => Number(v));

export const AutomationArkTypeGoalIdParam = type({ goalId: toNumber });
export const AutomationArkTypeRuleIdParam = type({ ruleId: toNumber });
export const AutomationArkTypeOptionsParams = type({ goalId: toNumber, source: "'kanban.statuses' | 'tags.goalTags' | 'lists.goalLists'" });

const ruleParams = type({ '[string]': 'number.integer' });

export const AutomationArkTypeRuleInput = type({
    name: 'string > 0',
    'enabled?': 'boolean',
    trigger: { module: 'string > 0', event: 'string > 0', 'params?': ruleParams },
    action: { module: 'string > 0', action: 'string > 0', 'params?': ruleParams },
});

export const AutomationArkTypeRulePatch = type({
    'name?': 'string > 0',
    'enabled?': 'boolean',
    'trigger?': { module: 'string > 0', event: 'string > 0', 'params?': ruleParams },
    'action?': { module: 'string > 0', action: 'string > 0', 'params?': ruleParams },
});

export type AutomationRuleInput = typeof AutomationArkTypeRuleInput.infer;
export type AutomationRulePatch = typeof AutomationArkTypeRulePatch.infer;

export type AutomationParams = Record<string, number>;

export type AutomationModuleName = 'tasks' | 'kanban' | 'tags' | 'lists';

export type AutomationBusEventName = 'task.created' | 'task.updated' | 'task.tagsChanged';

export type AutomationDataSourceName = 'kanban.statuses' | 'tags.goalTags' | 'lists.goalLists';

export type AutomationOption = {
    id: number;
    label: string;
    color?: string;
};

export type AutomationParamDefinition = {
    key: string;
    source: AutomationDataSourceName;
};

export type AutomationBusEvent = {
    name: AutomationBusEventName;
    task: TasksSchemaTypeForSelect;
    changes: Record<string, unknown>;
};

export type AutomationTaskBusEvent = {
    name: AutomationBusEventName;
    taskId: number;
    changes: Record<string, unknown>;
};

export type AutomationEventMatchArgs = {
    busEvent: AutomationBusEvent;
    params: AutomationParams;
};

export type AutomationEventDefinition = {
    name: string;
    busEvents: AutomationBusEventName[];
    params: AutomationParamDefinition[];
    match: (args: AutomationEventMatchArgs) => boolean;
};

export type AutomationEventRef = {
    module: AutomationModuleName;
    event: string;
    params?: AutomationParams;
};

export type AutomationActionExecuteArgs = {
    actor: AppUser;
    task: TasksSchemaTypeForSelect;
    params: AutomationParams;
};

export type AutomationActionOutcome = 'applied' | 'skipped' | 'failed';

export type AutomationActionDefinition = {
    name: string;
    params: AutomationParamDefinition[];
    requiredPermissions: GoalPermissionType[];
    emits: (params: AutomationParams) => AutomationEventRef | null;
    execute: (args: AutomationActionExecuteArgs) => Promise<AutomationActionOutcome>;
};

export type AutomationDataSourceArgs = {
    actor: AppUser;
    goalId: number;
};

export type AutomationDataSource = {
    viewPermissions: GoalPermissionType[];
    load: (args: AutomationDataSourceArgs) => Promise<AutomationOption[]>;
};

export type AutomationModuleDefinition = {
    name: AutomationModuleName;
    events: AutomationEventDefinition[];
    actions: AutomationActionDefinition[];
    dataSources: Partial<Record<AutomationDataSourceName, AutomationDataSource>>;
};

export type AutomationFindEventArgs = {
    module: string;
    event: string;
};

export type AutomationFindActionArgs = {
    module: string;
    action: string;
};

export type AutomationCatalogParamForClient = AutomationParamDefinition;

export type AutomationCatalogForClient = {
    modules: {
        name: AutomationModuleName;
        events: { name: string; params: AutomationCatalogParamForClient[] }[];
        actions: { name: string; params: AutomationCatalogParamForClient[]; requiredPermissions: GoalPermissionType[] }[];
    }[];
};

export type AutomationRuleForClient = {
    id: number;
    goalId: number;
    creatorId: number;
    name: string;
    enabled: boolean;
    trigger: { module: string; event: string; params: AutomationParams };
    action: { module: string; action: string; params: AutomationParams };
    createdAt: string;
    editedAt: string;
};

export type AutomationRuleShape = {
    id: number;
    trigger: { module: string; event: string; params: AutomationParams };
    action: { module: string; action: string; params: AutomationParams };
};

export type AutomationChain = {
    depth: number;
    firedRuleIds: Set<number>;
    actors: Map<number, Promise<AppUser | null>>;
    pending: Promise<void>[];
};

export type AutomationRunRuleRef = {
    id: number;
    editedAt: string;
};

export type AutomationRunJob = {
    goalId: number;
    taskId: number;
    rules: AutomationRunRuleRef[];
    chain: { depth: number; firedRuleIds: number[] };
};

export type AutomationRunJobHandler = (job: AutomationRunJob) => Promise<void>;

export type AutomationEngineDeps = {
    catalog: AutomationCatalog;
    queue: AutomationRunQueue;
};

export type AutomationRuleMatchArgs = {
    rule: AutomationRuleRow;
    busEvent: AutomationBusEvent;
};

export type AutomationActorForArgs = {
    chain: AutomationChain;
    goalId: number;
};

export type AutomationErrorCode = 'not_found' | 'forbidden' | 'invalid' | 'cycle' | 'limit_reached';

export type AutomationResult<T> = { ok: true; data: T } | { ok: false; code: AutomationErrorCode; message?: string };

export type AutomationRuleRow = AutomationRulesSchemaTypeForSelect;

export type AutomationRuleInsertArgs = {
    goalId: number;
    creatorId: number;
    name: string;
    enabled: boolean;
    triggerModule: string;
    triggerEvent: string;
    triggerParams: AutomationParams;
    actionModule: string;
    actionName: string;
    actionParams: AutomationParams;
};

export type AutomationRuleUpdateArgs = {
    ruleId: number;
    patch: Partial<Omit<AutomationRuleInsertArgs, 'goalId'>>;
};

export type AutomationCreateRuleArgs = {
    goalId: number;
    input: AutomationRuleInput;
};

export type AutomationUpdateRuleArgs = {
    ruleId: number;
    patch: AutomationRulePatch;
};

export type AutomationValidateRuleArgs = {
    goalId: number;
    rule: AutomationRuleShape;
};

export type AutomationCheckCycleArgs = {
    goalId: number;
    candidate: AutomationRuleShape;
    candidateName: string;
};

export type AutomationOptionRemovedArgs = {
    goalId: number;
    source: AutomationDataSourceName;
    id: number;
};

export type AutomationRuleUsesOptionArgs = {
    rule: AutomationRuleShape;
    source: AutomationDataSourceName;
    id: number;
};

export type AutomationRulesDisableArgs = {
    goalId: number;
    ruleIds: number[];
};

export type AutomationOptionsArgs = {
    goalId: number;
    source: AutomationDataSourceName;
};

export type AutomationRunRuleArgs = {
    ref: AutomationRunRuleRef;
    job: AutomationRunJob;
    chain: AutomationChain;
};

export type AutomationGoalIdResolver = (req: Request) => Promise<number | null> | number | null;

export type RequireAutomationPermissionArgs = {
    permission: GoalPermissionType;
    resolveGoalId: AutomationGoalIdResolver;
};

export type AutomationCycleNextRulesArgs = {
    rule: AutomationRuleShape;
    rules: AutomationRuleShape[];
};

export type AutomationCycleTriggersArgs = {
    emitted: AutomationEventRef;
    rule: AutomationRuleShape;
};

export type AutomationParamsCompatibleArgs = {
    emitted?: AutomationParams;
    expected: AutomationParams;
};

export type AutomationNormalizeParamsArgs = {
    goalId: number;
    definitions: AutomationParamDefinition[];
    params: AutomationParams;
};

export type AutomationHasPermissionsArgs = {
    actor: AppUser;
    goalId: number;
    permissions: GoalPermissionType[];
};

export type AutomationCanRunArgs = {
    actor: AppUser;
    goalId: number;
    action: AutomationActionDefinition;
};
