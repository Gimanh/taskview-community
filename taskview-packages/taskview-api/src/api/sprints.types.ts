import type { Task } from './tasks.api.types';

export type SprintStatus = 'draft' | 'planned' | 'active' | 'review' | 'completed';

export type Sprint = {
    id: number;
    goalId: number;
    name: string;
    goalText: string | null;
    goalAchieved: boolean | null;
    status: SprintStatus;
    startDate: string;
    endDate: string;
    capacity: string | null;
    pausedAt: string | null;
    creatorId: number | null;
    createdAt: string;
    editedAt: string;
    reviewStartedAt: string | null;
    completedAt: string | null;
};

export type SprintRetro = {
    wentWell: string | null;
    wentBad: string | null;
    actionItems: string | null;
};

export type SprintWithRetro = Sprint & { retro: SprintRetro | null };

export type SprintCreateArgs = {
    goalId: number;
    name: string;
    startDate: string;
    endDate: string;
    goalText?: string | null;
    capacity?: number | null;
};

export type SprintUpdateArgs = {
    sprintId: number;
    name?: string;
    startDate?: string;
    endDate?: string;
    goalText?: string | null;
    capacity?: number | null;
};

export type SprintOutcome = 'accepted' | 'carried-over' | 'dropped';

export type SprintTaskOutcomeInput = {
    taskId: number;
    outcome: SprintOutcome;
    carriedOverTo?: number | null;
};

export type SprintCloseArgs = {
    sprintId: number;
    outcomes: SprintTaskOutcomeInput[];
    goalAchieved: boolean;
};

export type SprintSaveRetroArgs = {
    sprintId: number;
    wentWell?: string | null;
    wentBad?: string | null;
    actionItems?: string | null;
};

export type SprintSetTaskArgs = {
    taskId: number;
    sprintId: number | null;
};

export type SprintListFilterArgs = {
    goalId: number;
    /** comma-separated subset, e.g. 'active,planned' */
    status?: string;
};

export type SprintVelocityArgs = {
    goalId: number;
    lastN?: number;
};

export type SprintPlanningScope = 'backlog' | 'sprint';

export type SprintPlanningArgs = {
    sprintId: number;
    scope: SprintPlanningScope;
    cursor?: number;
    limit?: number;
};

/** Backlog scope: tasks + cursor only. */
export type SprintPlanningBacklogPage = {
    tasks: Task[];
    nextCursor: number | null;
};

/** Sprint scope: tasks + cursor + capacity counter (sum of all in-sprint estimates). */
export type SprintPlanningSprintPage = {
    tasks: Task[];
    nextCursor: number | null;
    totalPoints: number;
};

export type SprintPlanningPage = SprintPlanningBacklogPage | SprintPlanningSprintPage;

export type SprintBurndownPoint = { date: string; remainingHours: number; idealHours: number };
export type SprintBurndown = { total: number; points: SprintBurndownPoint[] };
export type SprintVelocityPoint = { sprintId: number; name: string; acceptedHours: number; plannedHours: number };

export type SprintCadence = {
    goalId: number;
    enabled: boolean;
    lengthDays: number;
    startDate: string;
    lookahead: number;
    nameTemplate: string;
    lastGeneratedDate: string | null;
    createdAt: string;
    editedAt: string;
};

export type SprintSetCadenceArgs = {
    goalId: number;
    enabled: boolean;
    lengthDays?: number;
    startDate?: string;
    lookahead?: number;
    nameTemplate?: string;
};
