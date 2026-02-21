import type { TagItem } from './tags.types'
import type { Task } from 'taskview-api'
import type { TaskItem } from './tasks.types'

type RespTasks = TaskItem[];
type RespUsers = { id: number; name: string; users: { id: number; email: string }[] }[];

export type TaskAssignees = { taskId: TaskItem['id']; collabUserId: number; email: string }[];

export type MainScreenAllStateResponse = {
    tasks: RespTasks;
    tasksToday: RespTasks;
    tasksUpcoming: RespTasks;
    tasksLastCompleted: RespTasks;
    users: RespUsers;
    assignees: TaskAssignees;
    listToGoal: Record<number, number>;
};

export type BaseScreenState = {
    activeWidgetInMobile: 'today' | 'lastAdded' | 'upcoming' | null | 'all';
    wasCalled: boolean;
    tasks: RespTasks;
    users: RespUsers;
    tasksToday: RespTasks;
    tasksUpcoming: RespTasks;
    tasksLastCompleted: RespTasks;
    searchTask: string;
    // addTaskDialog: boolean;
    /**@deprecated */
    lists: GoalAndListsResp;
    // listToGoal: BoardsResponse['listToGoal'];
    loading: boolean;
    assignees: TaskAssignees;
    filterAndSorting: {
        sort: SortTasks;
        filters: FiltersTasks;
    };
    taskIdToUser: Record<TaskAssignees[number]['collabUserId'], TaskAssignees>;
};

export type GoalAndListsResp = {
    goalName: string;
    listName: string;
    listId: number;
    goalId: number;
}[];

export type SortTasks = 'nameAsc' | 'nameDesc' | 'new' | 'old';
export type FiltersTasks = {
    projects: number[];
    priorities: Task['priorityId'][];
    tags: TagItem[];
    assignees: TaskAssignees[number]['collabUserId'][];
};

export const FILTER_DEFAULT: FiltersTasks = {
  projects: [],
  priorities: [],
  tags: [],
  assignees: [],
}
// export type SortTasks = {
//     byId: typeof SORT_ASC | typeof SORT_DESC | typeof SORT_DEFAULT;
//     byName: typeof SORT_ASC | typeof SORT_DESC | typeof SORT_DEFAULT;
// };

export const ICON_PROJECT = { icon: 'i-lucide-lightbulb', color: '#FFB800' }
export const ICON_TASKS = { icon: 'i-lucide-clipboard-edit', color: '#38D681' }
export const ICON_USERS = { icon: 'i-lucide-users', color: '#BE8CFF' }
export const DIALOG_WIDTH = 600
export const DIALOG_DESKTOP_HEIGHT = '50%'

export type BaseScreenSearchResponse = TaskItem[];
