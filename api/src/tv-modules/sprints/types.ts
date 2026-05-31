import { type } from 'arktype';
import type { SprintStatus, TasksSchemaTypeForSelect } from 'taskview-db-schemas';

/** Request validators (ArkType) */

export const SprintArkTypeCreate = type({
    goalId: 'number',
    name: 'string > 0',
    startDate: 'string', // 'YYYY-MM-DD'
    endDate: 'string',
    'goalText?': 'string | null',
    'capacity?': 'number | null',
});

export const SprintArkTypeUpdate = type({
    sprintId: 'number',
    'name?': 'string > 0',
    'startDate?': 'string',
    'endDate?': 'string',
    'goalText?': 'string | null',
    'capacity?': 'number | null',
});

export const SprintArkTypeSprintIdParam = type({
    sprintId: type('string | number').pipe((v) => Number(v)),
});

export const SprintArkTypeGoalIdParam = type({
    goalId: type('string | number').pipe((v) => Number(v)),
});

export const SprintArkTypeListQuery = type({
    goalId: type('string | number').pipe((v) => Number(v)),
    'status?': 'string', // comma-separated subset of statuses
});

export const SprintArkTypeClose = type({
    sprintId: 'number',
    outcomes: type({
        taskId: 'number',
        outcome: "'accepted' | 'carried-over' | 'dropped'",
        'carriedOverTo?': 'number | null',
    }).array(),
    goalAchieved: 'boolean',
});

export const SprintArkTypeSaveRetro = type({
    sprintId: 'number',
    'wentWell?': 'string | null',
    'wentBad?': 'string | null',
    'actionItems?': 'string | null',
});

export const SprintArkTypeSetTask = type({
    taskId: 'number',
    sprintId: 'number | null',
});

export const SprintArkTypeVelocityQuery = type({
    goalId: type('string | number').pipe((v) => Number(v)),
    'lastN?': type('string | number').pipe((v) => Number(v)),
});

export const SprintArkTypeSetCadence = type({
    goalId: 'number',
    enabled: 'boolean',
    'lengthDays?': 'number',
    'startDate?': 'string', // 'YYYY-MM-DD', anchor of the first window
    'lookahead?': 'number', // how many future sprints to keep created beyond the current one
    'nameTemplate?': 'string', // '{n}' is replaced with the 1-based window number
});

const PLANNING_DEFAULT_LIMIT = 30;
const PLANNING_MAX_LIMIT = 100;

export const SprintArkTypePlanningQuery = type({
    sprintId: type('string | number').pipe((v) => Number(v)),
    scope: "'backlog' | 'sprint'",
    'cursor?': type('string | number').pipe((v) => Number(v)),
    'limit?': type('string | number').pipe((v) => {
        const n = Number(v);
        if (isNaN(n) || n <= 0) return PLANNING_DEFAULT_LIMIT;
        return Math.min(n, PLANNING_MAX_LIMIT);
    }),
});

/** Inferred argument types (args-as-object) */

export type SprintCreateArgs = typeof SprintArkTypeCreate.infer;
export type SprintUpdateArgs = typeof SprintArkTypeUpdate.infer;
export type SprintCloseArgs = typeof SprintArkTypeClose.infer;
export type SprintSaveRetroArgs = typeof SprintArkTypeSaveRetro.infer;
export type SprintSetTaskArgs = typeof SprintArkTypeSetTask.infer;
export type SprintPlanningQueryArgs = typeof SprintArkTypePlanningQuery.infer;
export type SprintSetCadenceArgs = typeof SprintArkTypeSetCadence.infer;

/** Planning scope: backlog (unassigned, incomplete) vs tasks already in the sprint. */
export type SprintPlanningScope = 'backlog' | 'sprint';

/** Manager-level args for the planning page fetch. */
export type SprintPlanningManagerArgs = {
    sprintId: number;
    scope: SprintPlanningScope;
    cursor: number | null;
    limit: number;
};

/** Repository-level args for a cursor-paginated planning page. */
export type SprintPlanningPageArgs = {
    sprintId: number;
    cursor: number | null;
    limit: number;
};

export type SprintTaskOutcomeInput = SprintCloseArgs['outcomes'][number];

/** Internal manager/repository arg types */

export type SprintCreateRepoArgs = SprintCreateArgs & { creatorId: number };
export type SprintActivateArgs = { sprintId: number; initiatorId: number | null };
export type SprintReviewArgs = { sprintId: number; initiatorId: number };
export type SprintPauseArgs = { sprintId: number; initiatorId: number };
export type SprintResumeArgs = { sprintId: number; initiatorId: number };
export type SprintVelocityArgs = { goalId: number; lastN: number };
export type SprintCloseManagerArgs = SprintCloseArgs & { initiatorId: number };
export type SprintSaveRetroManagerArgs = SprintSaveRetroArgs & { editedBy: number };
export type SprintSetTaskManagerArgs = SprintSetTaskArgs & { initiatorId: number };

/** Cadence repository arg types (args-as-object) */
export type SprintCadenceUpsertRepoArgs = {
    goalId: number;
    enabled: boolean;
    lengthDays: number;
    startDate: string;
    lookahead: number;
    nameTemplate: string;
};
export type SprintCadenceFindByStartArgs = { goalId: number; startDate: string };
export type SprintCadenceTouchArgs = { goalId: number; lastGeneratedDate: string };
export type SprintCadenceSprintCreateArgs = {
    goalId: number;
    name: string;
    startDate: string;
    endDate: string;
};

export type SprintListFilter = { goalId: number; statuses?: SprintStatus[] };

export type BurndownPoint = { date: string; remainingHours: number; idealHours: number };
export type VelocityPoint = { sprintId: number; name: string; acceptedHours: number; plannedHours: number };

/** Sprint with related data for the detail endpoint */
export type SprintRetro = {
    wentWell: string | null;
    wentBad: string | null;
    actionItems: string | null;
};

/** Planning page response shapes. Backlog has no capacity counter; sprint scope carries totalPoints. */
export type SprintPlanningBacklogPage = {
    tasks: TasksSchemaTypeForSelect[];
    nextCursor: number | null;
};

export type SprintPlanningSprintPage = {
    tasks: TasksSchemaTypeForSelect[];
    nextCursor: number | null;
    totalPoints: number;
};

export type SprintPlanningPage = SprintPlanningBacklogPage | SprintPlanningSprintPage;

export type SprintErrorCode = 'not_found' | 'conflict' | 'invalid_state' | 'forbidden';
export type SprintResult<T> = { ok: true; data: T } | { ok: false; code: SprintErrorCode; message?: string };
