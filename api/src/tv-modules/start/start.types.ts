import type { TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import type { GoalAccess } from '../../core/GoalAccess';

export type StartVisibleTask = {
    goalId: number;
    tags: number[];
};

export type StartTasksVisibilityArgs<T extends StartVisibleTask> = {
    tasks: T[];
    access: GoalAccess;
};

export type SearchTaskArgs = {
    description: string;
    goalsIds: number[];
};

export type SearchTaskResult = TasksSchemaTypeForSelect & {
    tags: number[];
    assignedUsers: number[];
    historyId: number | null;
    subtasks: SearchTaskResult[];
};

export type FetchAllListsResult = {
    goalName: string | null;
    listName: string | null;
    listId: number | null;
    goalId: number;
};

export type UsersByProjectsFromDb = {
    id: number;
    name: string;
    user: { id: number; email: string }[];
};

export type AssigneesForTaskFromDb = {
    email: string;
    taskId: number;
    collabUserId: number;
};

export type StartTaskTagFromDb = {
    taskId: number;
    tagId: number;
};
