import type { TaskItemInDb } from '../../types/tasks.types';

/**@deprecated */
export class TaskItemForClient {
    id: number;
    parentId: number;
    description: string;
    complete: boolean;
    goalListId: number;
    dateCreation;
    owner: number;
    responsibleId: number;

    dateComplete: string;
    note: string;
    subtasks: TaskItemForClient[];
    // responsibleUser: number;
    priorityId: TaskItemInDb['priority_id'];
    tags: number[];
    goalId: number;
    historyId?: number | null;

    /** @fixme */
    parentIdDescription: string | null;
    /** @fixme */
    goalListIdDescription: string | null;

    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    assignedUsers: number[];
    statusId: number | null;
    taskOrder: number | null;
    kanbanOrder: number | null;
    amount: number | null;
    transactionType: 1 | 0 | null;
    nodeGraphPosition: Record<string, unknown> | null;

    constructor(task: TaskItemInDb, tags: number[] = [], historyId: number | null = null, assignees: number[] = []) {
        this.id = task.id;
        this.parentId = task.parent_id;
        this.description = task.description;
        this.complete = task.complete;
        this.goalListId = task.goal_list_id;
        this.dateCreation = task.date_creation;
        this.owner = task.owner;
        this.responsibleId = task.responsible_id;
        this.dateComplete = task.date_complete;
        this.note = task.note;
        this.subtasks = [];
        this.priorityId = task.priority_id;
        this.tags = tags;
        this.goalId = task.goal_id;
        this.historyId = historyId;

        this.parentIdDescription = null;
        this.goalListIdDescription = null;

        this.startDate = task.start_date;
        this.endDate = task.end_date;
        this.startTime = task.start_time;
        this.endTime = task.end_time;
        this.assignedUsers = assignees;
        this.statusId = task.status_id;
        this.taskOrder = task.task_order;
        this.kanbanOrder = task.kanban_order;

        this.amount = task.amount;
        this.transactionType = task.transaction_type;
        this.nodeGraphPosition = task.node_graph_position;
    }
}
