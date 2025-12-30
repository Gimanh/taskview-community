export const TvPermissions: Record<Uppercase<keyof GoalPermissions>, keyof GoalPermissions> = {
    /**
     * Can delete goal
     */
    GOAL_CAN_DELETE: 'goal_can_delete',
    /**
     * Can edit goal
     */
    GOAL_CAN_EDIT: 'goal_can_edit',
    /**
     * Can manage users in goal
     */
    GOAL_CAN_MANAGE_USERS: 'goal_can_manage_users',
    /**
     * Can add task list to goal
     */
    GOAL_CAN_ADD_TASK_LIST: 'goal_can_add_task_list',
    /**
     * Can watch task lists itself not tasks
     * TODO rename to GOAL_CAN_WATCH_LISTS
     */
    GOAL_CAN_WATCH_CONTENT: 'goal_can_watch_content',
    /**
     * Can delete task list
     */
    COMPONENT_CAN_DELETE: 'component_can_delete',
    /**
     * Can edit task list
     */
    COMPONENT_CAN_EDIT: 'component_can_edit',
    /**
     * Can watch task lists content (tasks)
     * TODO rename to COMPONENT_CAN_WATCH_TASKS
     * Allow watch task 
     * - description,
     * - status(checkbox)
     * - deadlines (start and end date)
     * - start and end time
     */
    COMPONENT_CAN_WATCH_CONTENT: 'component_can_watch_content',
    /**
     * Can add tasks to task list
     */
    COMPONENT_CAN_ADD_TASKS: 'component_can_add_tasks',
    // //COMPONENT_CAN_ADD_SUBTASKS: 'component_can_add_subtasks',
    // /** @deprecated */
    // COMPONENT_CAN_EDIT_ALL_TASKS: 'component_can_edit_all_tasks',
    // /** @deprecated */
    // COMPONENT_CAN_EDIT_THEIR_TASKS: 'component_can_edit_their_tasks',

    /**
     * Can delete task
     */
    TASK_CAN_DELETE: 'task_can_delete',
    /**
     * Can edit task description
     */
    TASK_CAN_EDIT_DESCRIPTION: 'task_can_edit_description',
    /**
     * Can edit task status (checkbox)
     */
    TASK_CAN_EDIT_STATUS: 'task_can_edit_status',
    /**
     * Can edit task note
     */
    TASK_CAN_EDIT_NOTE: 'task_can_edit_note',
    /**
     * Can watch task note (note editor)
     */
    TASK_CAN_WATCH_NOTE: 'task_can_watch_note',
    /**
     * Can edit task deadline
     */
    TASK_CAN_EDIT_DEADLINE: 'task_can_edit_deadline',
    /**
     * Can watch task details (task dialog in UI when click on task)
     */
    TASK_CAN_WATCH_DETAILS: 'task_can_watch_details',
    /**
     * Can watch task subtasks
     */
    TASK_CAN_WATCH_SUBTASKS: 'task_can_watch_subtasks',
    /**
     * Can add task subtasks
     */
    TASK_CAN_ADD_SUBTASKS: 'task_can_add_subtasks',
    /**
     * Can edit task tags
     */
    TASK_CAN_EDIT_TAGS: 'task_can_edit_tags',
    /**
     * Can watch task tags
     */
    TASK_CAN_WATCH_TAGS: 'task_can_watch_tags',
    /**
     * Can watch task priority
     */
    TASK_CAN_WATCH_PRIORITY: 'task_can_watch_priority',
    /**
     * Can edit task priority
     */
    TASK_CAN_EDIT_PRIORITY: 'task_can_edit_priority',
    /**
     * Can access task history
     */
    TASK_CAN_ACCESS_HISTORY: 'task_can_access_history',
    /**
     * Can recovery task history
     */
    TASK_CAN_RECOVERY_HISTORY: 'task_can_recovery_history',
    /**
     * Can assign users to task
     */
    TASK_CAN_ASSIGN_USERS: 'task_can_assign_users',
    /**
     * Can watch assigned users to task
     */
    TASK_CAN_WATCH_ASSIGNED_USERS: 'task_can_watch_assigned_users',

    KANBAN_CAN_MANAGE: 'kanban_can_manage',
    KANBAN_CAN_VIEW: 'kanban_can_view',

    GRAPH_CAN_MANAGE: 'graph_can_manage',
    GRAPH_CAN_VIEW: 'graph_can_view',
} as const;

export type GoalPermissions = {
    goal_can_delete?: true;
    goal_can_edit?: true;
    goal_can_manage_users?: true;
    goal_can_watch_content?: true;
    goal_can_add_task_list?: true;

    component_can_delete?: true;
    component_can_edit?: true;
    component_can_watch_content?: true;
    component_can_add_tasks?: true;
    // component_can_edit_all_tasks?: true;
    // component_can_edit_their_tasks?: true;

    task_can_delete?: true;
    task_can_edit_description?: true;
    task_can_edit_status?: true;
    task_can_edit_note?: true;
    task_can_watch_note?: true;
    task_can_edit_deadline?: true;
    task_can_watch_details?: true;
    task_can_watch_subtasks?: true;
    task_can_add_subtasks?: true;
    task_can_edit_tags?: true;
    task_can_watch_tags?: true;
    task_can_watch_priority?: true;
    task_can_edit_priority?: true;
    task_can_access_history?: true;
    task_can_recovery_history?: true;
    task_can_assign_users?: true;
    task_can_watch_assigned_users?: true;

    kanban_can_manage?: true;
    kanban_can_view?: true;

    graph_can_manage?: true;
    graph_can_view?: true;
};