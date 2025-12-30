import type { Task } from "./tasks.api.types";

export type KanbanColumnItem = {
    id: number;
    name: string;
    goalId: number;
    viewOrder: number;
};

export type KanbanArgAddColumn = { goalId: number; name: string };
export type KanbanResponseAddColumn = KanbanColumnItem | null;

export type KanbanArgUpdateColumn = { id: number; name: string; viewOrder?: number };
export type KanbanResponseUpdateColumn = boolean;

export type KanbanArgDeleteColumn = { id: number };
export type KanbanResponseDeleteColumn = boolean;

export type KanbanResponseTasksForColumn = { tasks: Task[]; nextCursor: string | number | null, columnVersion: number | null };

export type KanbanResponseTasksOrderForColumnAndCursor = {
    tasks: ({ id: number, kanbanOrder: number | null }[]) | null,
    columnVersion: number | null
};

export type KanbanArgUpdateTasksOrder = {
    goalId: number;
    columnId: Task['statusId'];
    taskId: Task['id'];
    prevTaskId: number | null;
    nextTaskId: number | null;
};

export type KanbanResponseUpdateTasksOrder = {
    tasks: { id: number, kanbanOrder: number | null }[],
    columnVersion: number | null
};