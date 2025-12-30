// export type GoalPermissions = {
//     goal_can_delete?: true;
//     goal_can_edit?: true;
//     goal_can_manage_users?: true;
//     goal_can_watch_content?: true;
//     goal_can_add_task_list?: true;

import type { GoalPermissions } from "./permissions";

//     component_can_delete?: true;
//     component_can_edit?: true;
//     component_can_watch_content?: true;
//     component_can_add_tasks?: true;
//     component_can_edit_all_tasks?: true;
//     component_can_edit_their_tasks?: true;

//     task_can_delete?: true;
//     task_can_edit_description?: true;
//     task_can_edit_status?: true;
//     task_can_edit_note?: true;
//     task_can_watch_note?: true;
//     task_can_edit_deadline?: true;
//     task_can_watch_details?: true;
//     task_can_watch_subtasks?: true;
//     task_can_add_subtasks?: true;
//     task_can_edit_tags?: true;
//     task_can_watch_tags?: true;
//     task_can_watch_priority?: true;
//     task_can_edit_priority?: true;
//     task_can_access_history?: true;
//     task_can_recovery_history?: true;
//     task_can_assign_users?: true;
//     task_can_watch_assigned_users?: true;
// };

export type GoalItem = {
    id: number;
    name: string;
    description: string | null;
    owner: number;
    color: string | null;
    permissions: GoalPermissions;
    archive: 1 | 0;
    dateCreation: string | null;
};

export type GoalArgItemAdd = Pick<GoalItem, 'name'> & Partial<Pick<GoalItem, | 'description' | 'color'>>;

export type GoalResponseAdd = GoalItem | null;

export type GoalArgItemUpdate = Pick<GoalItem, 'id'> & Partial<Pick<GoalItem, 'name' | 'description' | 'color' | 'archive'>>;

export type GoalResponseUpdate = GoalItem | null;

export type GoalResponseFetch = GoalItem[];