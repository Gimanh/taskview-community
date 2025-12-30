import { TvApi } from '@/tv';
import {
    describe,
    it,
    expect,
    beforeAll,
    beforeEach,
} from 'vitest';
import { initApi } from './init-api';
import { type TaskArgAdd, type TaskResponseAdd } from '../tasks.api.types';
import { TvPermissions } from '../permissions';
import type { CollaborationPermission } from '../collaboration.types';

const taskItemMatch = {
    id: 154,
    goalId: 4990,
    parentId: null,
    description: 'test task-1761603103605',
    complete: false,
    goalListId: null,
    creatorId: null,
    note: null,
    owner: 1,
    priorityId: 1,
    startDate: null,
    endDate: null,
    startTime: null,
    endTime: null,
    statusId: null,
    taskOrder: 154,
    kanbanOrder: 154,
    amount: null,
    transactionType: null,
    nodeGraphPosition: null,
    tags: [],
    assignedUsers: [],
    historyId: null,
    subtasks: []
};
const getTestTask = (goalId: number): TaskArgAdd => {
    const description = `test task-${Date.now()}`;
    const nodeGraphPosition = { x: 100, y: 200 };
    const amount = 100;
    const transactionType = 1;
    const priorityId: 1 | 2 | 3 = 1; //Math.floor(Math.random() * 3) + 1 as 1 | 2 | 3;
    const startDate = `2025-01-14`;
    const endDate = `2025-01-15`;
    const startTime = `00:14:00+02`;
    const endTime = `00:15:00+02`;
    const statusId = null;
    const taskOrder = 1;
    const kanbanOrder = 1;
    const complete = false;
    const note = `test note-${Date.now()}`;

    return {
        goalId: goalId,
        description: description,
        complete: complete,
        priorityId: priorityId,
        startDate: startDate,
        endDate: endDate,
        startTime: startTime,
        note: note,
        endTime: endTime,
        statusId: statusId,
        taskOrder: taskOrder,
        kanbanOrder: kanbanOrder,
        amount: amount,
        transactionType: transactionType,
        nodeGraphPosition: nodeGraphPosition,
    }
}
describe('TvApi permissions tests', () => {
    let $mainUser: TvApi;
    let $invitedUser: TvApi;
    let mainUserGoalId: number;
    let roleId: number;
    let timestampTestFetch: number;
    let listIdTestFetch: number;
    let addedDefaultTasks: TaskResponseAdd[] = [];
    const RECORDS_COUNT = 10;
    let permissions: CollaborationPermission[] = [];

    const addPermissionForInvitedUser = async (permission: typeof TvPermissions[keyof typeof TvPermissions]) => {
        if (!permissions.length) {
            permissions = await $mainUser.collaboration.fetchAllPermissions();
        }

        const permissionId = permissions.find((p) => p.name === permission)?.id!;

        if (!permissionId) {
            throw new Error(`Permission ${permission} not found`);
        }

        console.log('permissionId, roleId', permissionId, roleId);

        const response = await $mainUser.collaboration.toggleRolePermission({
            roleId: roleId,
            permissionId: permissionId,
        }).catch(console.error);

        if (!response) {
            throw new Error('Failed to add permission');
        }
        return response.add;
    };

    const enableTaskAddPermission = async () => {
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_ADD_TASKS);
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_EDIT_DESCRIPTION);
    };

    beforeAll(async () => {
        const { $tvApi, $tvApiForSecondUser } = await initApi();
        $mainUser = $tvApi;
        $invitedUser = $tvApiForSecondUser;
    });


    beforeEach(async () => {
        addedDefaultTasks = [];
        timestampTestFetch = Date.now();
        const goal = await $mainUser.goals.createGoal({
            name: `Goal for permissions tests-${timestampTestFetch}`,
        }).catch(console.error);

        if (!goal) {
            throw new Error('Failed to add goal');
        }

        mainUserGoalId = goal?.id!;
        console.log('goalId', mainUserGoalId);

        const role = await $mainUser.collaboration.createRoleForGoal({
            goalId: mainUserGoalId,
            roleName: 'test role for shared user',
        }).catch(console.error).then((response) => response);

        if (!role) {
            throw new Error('Failed to add role');
        }

        roleId = role.id;
        console.log('roleId', roleId);

        const addUserResponse = await $mainUser.collaboration.inviteUserToGoal({
            email: 'test2@mail.dest',
            goalId: mainUserGoalId,
        }).catch(console.error);

        if (!addUserResponse) {
            throw new Error('Failed to add user');
        }

        await $mainUser.collaboration.toggleUserRoles({
            goalId: mainUserGoalId,
            userId: addUserResponse?.id!,
            roles: [roleId],
        }).catch(console.error);

        const list = await $mainUser.goalLists.createList({
            name: `List for tasks tests-${timestampTestFetch}`,
            goalId: mainUserGoalId,
        }).catch(console.error);

        if (!list) {
            throw new Error('Failed to add list');
        }

        listIdTestFetch = list?.id!;

        for (let i = 0; i < RECORDS_COUNT; i++) {
            const task = getTestTask(mainUserGoalId);
            task.description = `${i}_fetch task-${timestampTestFetch}`;
            task.goalListId = listIdTestFetch;
            const addTaskResponse = await $mainUser.tasks.createTask(task).catch(console.error);
            if (!addTaskResponse) {
                throw new Error('Failed to add task');
            }
            addedDefaultTasks.push(addTaskResponse);
        }
    });

    it('should owner have access to the goal content', async () => {
        const goals = await $mainUser.goals.fetchGoals().catch(console.error);
        expect(goals).toBeDefined();
        expect(goals?.length).toBeGreaterThan(1);
        expect(goals?.some(goal => goal.id === mainUserGoalId)).toBe(true);

        const lists = await $mainUser.goalLists.fetchLists({ goalId: mainUserGoalId }).catch(console.error);
        expect(lists).toBeDefined();
        expect(lists?.length).toBe(1);

        const tasks = await $mainUser.tasks.fetch({ goalId: mainUserGoalId, page: 0, showCompleted: 0, firstNew: 0, componentId: listIdTestFetch }).catch(console.error);
        expect(tasks).toBeDefined();
        expect(tasks?.length).toBe(RECORDS_COUNT);

        const task = await $mainUser.tasks.fetchTaskById(tasks![0]?.id).catch(console.error);
        expect(task).toBeDefined();
        expect(Object.keys(taskItemMatch).every(key => key in task!)).toBe(true);
    });

    it('should shared goal available for second user', async () => {
        const goals = await $invitedUser.goals.fetchGoals().catch(console.error);

        if (!goals) {
            throw new Error('Failed to fetch goals');
        }

        console.log('goals', mainUserGoalId, goals);
        debugger;

        expect(goals?.some(goal => goal.id === mainUserGoalId)).toBe(true);
    });

    it('should shared goal available for second user without duplicates', async () => {
        const addedGoal = await $invitedUser.goals.createGoal({
            name: `Goal for permissions tests-${timestampTestFetch}`,
        }).catch(console.error);

        if (!addedGoal) {
            throw new Error('Failed to add goal');
        }

        const addedGoalId = addedGoal?.id!;
        const goals = await $invitedUser.goals.fetchGoals().catch(console.error);
        if (!goals) {
            throw new Error('Failed to fetch goals');
        }
        expect(goals.filter(goal => goal.id === addedGoalId).length).toBe(1);
    });

    // (by default there is no roles assigned to the invited user)
    it('should not access to the goal content without roles', async () => {
        const goals = await $invitedUser.goals.fetchGoals().catch(console.error);

        console.log('some data', mainUserGoalId, goals);

        // debugger;
        // expect(goals?.length).toBeGreaterThan(1);
        console.log('goals', mainUserGoalId, goals);
        expect(goals?.some(goal => goal.id === mainUserGoalId)).toBe(true);

        const lists = await $invitedUser.goalLists.fetchLists({ goalId: mainUserGoalId }).catch((err) => err.status);
        expect(lists).toBe(403);

        const tasks = await $invitedUser.tasks.fetch({ goalId: mainUserGoalId, page: 0, showCompleted: 0, firstNew: 0, componentId: listIdTestFetch }).catch((err) => err.status);
        expect(tasks).toBe(403);

        const tasksForMainUser = await $mainUser.tasks.fetch({ goalId: mainUserGoalId, page: 0, showCompleted: 0, firstNew: 0, componentId: listIdTestFetch }).catch(console.error);

        const task = await $invitedUser.tasks.fetchTaskById(tasksForMainUser![0]?.id).catch((err) => err.status);
        expect(task).toBe(403);
    });

    it('[TvPermissions.GOAL_CAN_EDIT] should give 403 status without permission ', async () => {
        const editStatus = await $invitedUser.goals.updateGoal({
            id: mainUserGoalId,
            name: 'new name'
        }).catch((err) => err.status);
        expect(editStatus).toBe(403);
    });

    it('[TvPermissions.GOAL_CAN_EDIT] should edit goal with permission', async () => {
        await addPermissionForInvitedUser(TvPermissions.GOAL_CAN_EDIT);

        const description = `'new description'-${timestampTestFetch}`;
        const name = `'new name'-${timestampTestFetch}`;

        const editGoal = await $invitedUser.goals.updateGoal({
            id: mainUserGoalId,
            description,
            name
        }).catch(console.log);
        console.log('editStatus', editGoal);

        if (!editGoal) {
            throw new Error('Failed to edit goal');
        }

        expect(editGoal?.description).toBe(description);
        expect(editGoal?.name).toBe(name);
    });

    it('[TvPermissions.GOAL_CAN_DELETE] should give 403 status without permission for delete goal', async () => {
        const deleteStatus = await $invitedUser.goals.deleteGoal(mainUserGoalId).catch((err) => err.status);
        expect(deleteStatus).toBe(403);
    });

    it('[TvPermissions.GOAL_CAN_DELETE] should delete goal with permission', async () => {
        await addPermissionForInvitedUser(TvPermissions.GOAL_CAN_DELETE);
        const deleteStatus = await $invitedUser.goals.deleteGoal(mainUserGoalId).catch(console.error);
        expect(deleteStatus).toBeDefined();
        expect(deleteStatus).toBe(true);
    });

    it('[TvPermissions.GOAL_CAN_MANAGE_USERS] should not allow manage users without permission', async () => {
        const manageUsersStatus = await $invitedUser.collaboration.inviteUserToGoal({
            email: `new-user-${timestampTestFetch}@mail.dest`,
            goalId: mainUserGoalId,
        }).catch((err) => err.status);
        expect(manageUsersStatus).toBe(403);
    });

    it('[TvPermissions.GOAL_CAN_MANAGE_USERS] should manage users with permission', async () => {
        await addPermissionForInvitedUser(TvPermissions.GOAL_CAN_MANAGE_USERS);
        const email = `new-user-${timestampTestFetch}@mail.dest`;
        const manageUsersStatus = await $invitedUser.collaboration.inviteUserToGoal({
            email: email,
            goalId: mainUserGoalId,
        });
        if (!manageUsersStatus) {
            throw new Error('Failed to add user to goal');
        }
        expect(manageUsersStatus?.email).toBe(email);
    });

    it('[TvPermissions.GOAL_CAN_ADD_TASK_LIST] should not allow add task list without permission', async () => {
        const addListStatus = await $invitedUser.goalLists.createList({
            goalId: mainUserGoalId,
            name: `new-list-${timestampTestFetch}`,
        }).catch((err) => err.status);
        expect(addListStatus).toBe(403);
    });
    it('[TvPermissions.GOAL_CAN_ADD_TASK_LIST] should allow add task list with permission', async () => {
        await addPermissionForInvitedUser(TvPermissions.GOAL_CAN_ADD_TASK_LIST);

        const name = `new-list-${timestampTestFetch}`;
        const addListStatus = await $invitedUser.goalLists.createList({
            goalId: mainUserGoalId,
            name: name,
        });
        if (!addListStatus) {
            throw new Error('Failed to add list');
        }

        expect(addListStatus?.name).toBe(name);
    });

    it('[TvPermissions.GOAL_CAN_WATCH_CONTENT] should not allow watch task lists without permission', async () => {
        const lists = await $invitedUser.goalLists.fetchLists({ goalId: mainUserGoalId }).catch((err) => err.status);
        expect(lists).toBe(403);
    });

    it('[TvPermissions.GOAL_CAN_WATCH_CONTENT] should allow watch task lists with permission', async () => {
        await addPermissionForInvitedUser(TvPermissions.GOAL_CAN_WATCH_CONTENT);
        const lists = await $invitedUser.goalLists.fetchLists({ goalId: mainUserGoalId }).catch(console.error);
        expect(lists).toBeDefined();
        expect(lists?.length).toBe(1);
        expect(lists![0]?.id).toBe(listIdTestFetch);
        expect(lists![0]?.name).toBe(`List for tasks tests-${timestampTestFetch}`);
    });

    it('[TvPermissions.COMPONENT_CAN_DELETE] should not allow delete task list without permission', async () => {
        const deleteListStatus = await $invitedUser.goalLists.deleteList(listIdTestFetch).catch((err) => err.status);
        expect(deleteListStatus).toBe(403);
    });

    it('[TvPermissions.COMPONENT_CAN_DELETE] should allow delete task list with permission', async () => {
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_DELETE);
        const deleteListStatus = await $invitedUser.goalLists.deleteList(listIdTestFetch).catch(console.error);
        expect(deleteListStatus).toBeDefined();
        expect(deleteListStatus).toBe(true);
    });

    it('[TvPermissions.COMPONENT_CAN_EDIT] should not allow edit task list without permission', async () => {
        const editListStatus = await $invitedUser.goalLists.updateList({
            id: listIdTestFetch,
            name: `new-name-${timestampTestFetch}`,
        }).catch((err) => err.status);
        expect(editListStatus).toBe(403);
    });

    it('[TvPermissions.COMPONENT_CAN_EDIT] should allow edit task list with permission', async () => {
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_EDIT);
        const editListStatus = await $invitedUser.goalLists.updateList({
            id: listIdTestFetch,
            name: `new-name-${timestampTestFetch}`,
        }).catch(console.error);
        expect(editListStatus).toBeDefined();
        expect(editListStatus?.name).toBe(`new-name-${timestampTestFetch}`);
    });

    it('[TvPermissions.COMPONENT_CAN_WATCH_CONTENT] should not allow watch tasks without permission', async () => {
        const tasks = await $invitedUser.tasks.fetch({ goalId: mainUserGoalId, page: 0, showCompleted: 0, firstNew: 0, componentId: listIdTestFetch })
            .catch((err) => err.status);
        expect(tasks).toBe(403);
    });

    it('[TvPermissions.COMPONENT_CAN_WATCH_CONTENT] should allow watch tasks with permission', async () => {
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_WATCH_CONTENT);
        const tasks = await $invitedUser.tasks.fetch({ goalId: mainUserGoalId, page: 0, showCompleted: 0, firstNew: 0, componentId: listIdTestFetch }).catch(console.error);
        expect(tasks).toBeDefined();
        expect(tasks?.length).toBe(RECORDS_COUNT);
        expect(tasks![0]?.goalListId).toBe(listIdTestFetch);
    });

    it('[TvPermissions.COMPONENT_CAN_ADD_TASKS] should not allow add tasks without permission', async () => {
        const addTaskStatus = await $invitedUser.tasks.createTask({
            goalId: mainUserGoalId,
            description: `new-task-${timestampTestFetch}`,
        }).catch((err) => err.status);
        expect(addTaskStatus).toBe(403);
    });

    it(`[TvPermissions.COMPONENT_CAN_ADD_TASKS] should not allow add tasks with permission, 
        because editing description also must be available by permission [TvPermissions.TASK_CAN_EDIT_DESCRIPTION]`, async () => {
        await enableTaskAddPermission();

        const addTaskStatus = await $invitedUser.tasks.createTask({
            goalId: mainUserGoalId,
            description: `new-task-${timestampTestFetch}`,
        }).catch(console.error);
        expect(addTaskStatus?.owner).toBe(1);
    });

    it('[TvPermissions.TASK_CAN_EDIT_STATUS] should not allow check/uncheck task status without permission', async () => {
        await enableTaskAddPermission();
        const editTaskStatus = await $invitedUser.tasks.updateTask({
            id: addedDefaultTasks[0]?.id!,
            complete: true,
        }).catch((err) => err.status);
        expect(editTaskStatus).toBe(403);

        const addedTask = await $invitedUser.tasks.createTask({
            goalId: mainUserGoalId,
            description: `new-task-${timestampTestFetch}`,
        }).catch(console.error);

        const editTaskStatusForCreatedTask = await $invitedUser.tasks.updateTask({
            id: addedTask?.id!,
            complete: true,
        }).catch((err) => err.status);
        expect(editTaskStatusForCreatedTask).toBe(403);
    });

    it('[TvPermissions.TASK_CAN_EDIT_STATUS] should not allow check/uncheck task status without permission', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_EDIT_STATUS);

        const task = await $invitedUser.tasks.updateTask({
            id: addedDefaultTasks[0]?.id!,
            complete: true,
        }).catch((err) => err.status);
        expect(task?.complete).toBe(true);

        const addedTask = await $invitedUser.tasks.createTask({
            goalId: mainUserGoalId,
            description: `new-task-${timestampTestFetch}`,
        }).catch(console.error);

        const taskCreated = await $invitedUser.tasks.updateTask({
            id: addedTask?.id!,
            complete: true,
        }).catch((err) => err.status);
        expect(taskCreated?.complete).toBe(true);
    });


    it('[TvPermissions.TASK_CAN_DELETE] should not allow delete task without permission', async () => {
        await enableTaskAddPermission();
        const deleteTaskStatus = await $invitedUser.tasks.deleteTask(addedDefaultTasks[0]?.id!).catch((err) => err.status);
        expect(deleteTaskStatus).toBe(403);
    });

    it('[TvPermissions.TASK_CAN_DELETE] should allow delete task with permission', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_DELETE);
        const deleteTaskStatus = await $invitedUser.tasks.deleteTask(addedDefaultTasks[0]?.id!).catch(console.error);
        expect(deleteTaskStatus?.delete).toBe(true);

        const addedTask = await $invitedUser.tasks.createTask({
            goalId: mainUserGoalId,
            description: `new-task-${timestampTestFetch}`,
        }).catch(console.error);

        const deleteTaskStatusForCreatedTask = await $invitedUser.tasks.deleteTask(addedTask?.id!).catch(console.error);
        expect(deleteTaskStatusForCreatedTask?.delete).toBe(true);
    });

    it('[TvPermissions.TASK_CAN_EDIT_NOTE] should not allow edit task note without permission', async () => {
        await enableTaskAddPermission();
        const editTaskNoteStatus = await $invitedUser.tasks.updateTask({
            id: addedDefaultTasks[0]?.id!,
            note: `new-note-${timestampTestFetch}`,
        }).catch((err) => err.status);
        expect(editTaskNoteStatus).toBe(403);
    });

    it('[TvPermissions.TASK_CAN_EDIT_NOTE] should allow edit task note with permission', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_EDIT_NOTE);
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_WATCH_NOTE);
        const task = await $invitedUser.tasks.updateTask({
            id: addedDefaultTasks[0]?.id!,
            note: `new-note-${timestampTestFetch}`,
        }).catch(console.error);
        expect(task?.note).toBe(`new-note-${timestampTestFetch}`);
    });

    it('[TvPermissions.TASK_CAN_WATCH_NOTE] should not allow watch task note and task details without permission [TvPermissions.COMPONENT_CAN_WATCH_CONTENT]', async () => {
        await enableTaskAddPermission();
        const status = await $invitedUser.tasks.fetchTaskById(addedDefaultTasks[0]?.id!)
            .catch((err) => err.status);
        expect(status).toBe(403);
    });

    it('[TvPermissions.TASK_CAN_WATCH_NOTE] should not allow watch task note', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_WATCH_CONTENT);
        const task = await $invitedUser.tasks.fetchTaskById(addedDefaultTasks[0]?.id!)
            .catch((err) => err.status);
        expect(task?.note).toBeNull();
    });

    it('[TvPermissions.TASK_CAN_WATCH_NOTE] should allow watch task note', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_WATCH_CONTENT);
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_WATCH_NOTE);
        const task = await $invitedUser.tasks.fetchTaskById(addedDefaultTasks[0]?.id!)
            .catch((err) => err.status);
        console.log('task', task);
        expect(task?.note).not.toBeNull();
        expect(task?.note?.startsWith(`test note-`)).toBe(true);
    });

    it('[TvPermissions.TASK_CAN_EDIT_DEADLINE] should not allow edit task deadline without permission', async () => {
        await enableTaskAddPermission();
        const editTaskDeadlineStatus = await $invitedUser.tasks.updateTask({
            id: addedDefaultTasks[0]?.id!,
            startDate: `2025-01-14`,
        }).catch((err) => err.status);
        expect(editTaskDeadlineStatus).toBe(403);
    });

    it('[TvPermissions.TASK_CAN_EDIT_DEADLINE] should allow edit task deadline with permission', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_EDIT_DEADLINE);
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_WATCH_CONTENT);

        const editTaskDeadlineStatus = await $invitedUser.tasks.updateTask({
            id: addedDefaultTasks[0]?.id!,
            startDate: `2025-01-14`,
        }).catch(console.error);
        expect(editTaskDeadlineStatus?.startDate).toBe(`2025-01-14`);
    });

    it('[TvPermissions.TASK_CAN_ADD_SUBTASKS] should not allow add subtasks without permission', async () => {
        await enableTaskAddPermission();
        const addSubtasksStatus = await $invitedUser.tasks.createTask({
            parentId: addedDefaultTasks[0]?.id!,
            description: `new-subtask-${timestampTestFetch}`,
            goalId: mainUserGoalId,
        }).catch((err) => err.status);
        expect(addSubtasksStatus).toBe(403);
    });

    it('[TvPermissions.TASK_CAN_ADD_SUBTASKS] should allow add subtasks with permission but can not watch subtasks', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_ADD_SUBTASKS);
        const parentId = addedDefaultTasks[0]?.id!;
        const subtaskData = {
            parentId: parentId,
            description: `new-subtask-${timestampTestFetch}`,
            goalId: mainUserGoalId,
        };

        console.log('subtaskData', subtaskData);

        const addSubtasksStatus = await $invitedUser.tasks.createTask(subtaskData).catch((err) => console.error(err.response.data));
        console.log('addSubtasksStatus', addSubtasksStatus);
        //we don't have parentId in subtask because we don't have permission to watch subtasks
        expect(addSubtasksStatus?.parentId).toBeNull();
    });


    it('[TvPermissions.TASK_CAN_WATCH_SUBTASKS] should allow add subtasks with permission and watch subtasks', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_ADD_SUBTASKS);
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_WATCH_SUBTASKS);
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_WATCH_CONTENT);
        const parentId = addedDefaultTasks[0]?.id!;
        const subtaskData = {
            parentId: parentId,
            description: `new-subtask-${timestampTestFetch}`,
            goalId: mainUserGoalId,
        };

        const addSubtasksStatus = await $invitedUser.tasks.createTask(subtaskData).catch((err) => console.error(err.response.data));

        //we don't have parentId in subtask because we don't have permission to watch subtasks
        // expect(addSubtasksStatus?.task.parentId).toBe(parentId);
        expect(addSubtasksStatus?.description).toBe(`new-subtask-${timestampTestFetch}`);

        const taskWithSubtasks = await $invitedUser.tasks.fetchTaskById(parentId).catch(console.error);

        console.log('taskWithSubtasks', taskWithSubtasks);

        expect(taskWithSubtasks?.subtasks).toBeDefined();
        expect(taskWithSubtasks?.subtasks?.length).toBe(1);
    });

    it('[TvPermissions.TASK_CAN_EDIT_TAGS] not allowed add tag without permission', async () => {
        await enableTaskAddPermission();
        const tagResponse = await $invitedUser.tags.createTag({
            name: `new-tag-${timestampTestFetch}`,
            color: 'new-color',
            goalId: mainUserGoalId,
        }).catch((err) => err.status);
        expect(tagResponse).toBe(403);

        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_EDIT_TAGS);

        const tagResponse2 = await $invitedUser.tags.createTag({
            name: `new-tag-${timestampTestFetch}`,
            color: 'new-color',
            goalId: mainUserGoalId,
        }).catch((err) => err.status);

        if (!tagResponse2) {
            throw new Error('Failed to add tag');
        }

        const taskId = addedDefaultTasks[0]?.id!;
        const tagId = tagResponse2?.id!;

        const toggleTagResponse = await $invitedUser.tags.toggleTag({
            tagId: tagId,
            taskId: taskId,
        }).catch((err) => {
            console.error(err.response.data);
            return err.status
        });

        console.log('toggleTagResponse----', toggleTagResponse);

        if (!toggleTagResponse) {
            throw new Error('Failed to toggle tag');
        }

        expect(toggleTagResponse.action).toBe('add');
        // remove permission
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_EDIT_TAGS);

        const toggleTagResponse2 = await $invitedUser.tags.toggleTag({
            tagId: tagId!,
            taskId: taskId,
        }).catch((err) => err.status);

        expect(toggleTagResponse2).toBe(403);

    });

    it('[TvPermissions.TASK_CAN_EDIT_TAGS] allowed add tag with permission', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_EDIT_TAGS);
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_WATCH_CONTENT);
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_WATCH_TAGS);

        const taskId = addedDefaultTasks[0]?.id!;
        const tagResponse = await $invitedUser.tags.createTag({
            name: `new-tag-${timestampTestFetch}`,
            color: 'new-color',
            goalId: mainUserGoalId,
        }).catch(console.error);

        if (!tagResponse) {
            throw new Error('Failed to add tag');
        }

        console.log('tagResponse', tagResponse);

        expect(tagResponse).toBeDefined();

        const toggleTagResponse = await $invitedUser.tags.toggleTag({
            tagId: tagResponse?.id!,
            taskId: taskId,
        }).catch(console.error);

        if (!toggleTagResponse) {
            throw new Error('Failed to toggle tag');
        }

        expect(toggleTagResponse.action).toBe('add');

        const task = await $invitedUser.tasks.fetchTaskById(taskId).catch(console.error);

        console.log('task', task);
        expect(task?.tags).toBeDefined();
        expect(task?.tags?.length).toBe(1);
        expect(task?.tags?.[0]).toBe(tagResponse?.id);
    });

    it('[TvPermissions.TASK_CAN_WATCH_PRIORITY] not allowed watch priority without permission', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_WATCH_CONTENT);
        const task = await $invitedUser.tasks.fetchTaskById(addedDefaultTasks[0]?.id!).catch((err) => err.status);
        expect(task?.priorityId).toBeNull();
    });

    it('[TvPermissions.TASK_CAN_WATCH_PRIORITY] allowed watch priority with permission', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_WATCH_PRIORITY);
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_WATCH_CONTENT);
        const task = await $invitedUser.tasks.fetchTaskById(addedDefaultTasks[0]?.id!).catch(console.error);
        expect(task?.priorityId).toBeDefined();
    });

    it('[TvPermissions.TASK_CAN_EDIT_PRIORITY] not allowed edit priority without permission', async () => {
        await enableTaskAddPermission();
        const status = await $invitedUser.tasks.updateTask({
            id: addedDefaultTasks[0]?.id!,
            priorityId: 2,
        }).catch((err) => err.status);
        expect(status).toBe(403);
    });

    it('[TvPermissions.TASK_CAN_EDIT_PRIORITY] allowed edit priority with permission', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_EDIT_PRIORITY);
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_WATCH_CONTENT);
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_WATCH_PRIORITY);
        const task = await $invitedUser.tasks.updateTask({
            id: addedDefaultTasks[0]?.id!,
            priorityId: 2,
        }).catch(console.error);
        expect(task?.priorityId).toBe(2);
    });

    it('[TvPermissions.TASK_CAN_ASSIGN_USERS] not allowed assign users to task without permission', async () => {
        await enableTaskAddPermission();
        const status = await $invitedUser.tasks.toggleTasksAssignee({
            taskId: addedDefaultTasks[0]?.id!,
            userIds: [1],
        }).catch((err) => err.status);
        expect(status).toBe(403);
    });

    it('[TvPermissions.TASK_CAN_WATCH_ASSIGNED_USERS] allowed assign users to task with permission', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_ASSIGN_USERS);
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_WATCH_CONTENT);
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_WATCH_ASSIGNED_USERS);

        const users = await $mainUser.collaboration.fetchUsersForGoal(mainUserGoalId).catch(console.error);

        if (!users) {
            throw new Error('Failed to fetch users for goal');
        }

        expect(users).toBeDefined();
        expect(users?.length).toBeGreaterThan(1);

        const response = await $invitedUser.tasks.toggleTasksAssignee({
            taskId: addedDefaultTasks[0]?.id!,
            userIds: [users[0].id],
        }).catch(console.error);
        if (!response) {
            throw new Error('Failed to assign users to task');
        }
        expect(response.userIds).toEqual([users[0].id]);

        const task = await $invitedUser.tasks.fetchTaskById(addedDefaultTasks[0]?.id!).catch(console.error);
        expect(task?.assignedUsers).toEqual([users[0].id]);
    });

    it('[TvPermissions.TASK_CAN_ACCESS_HISTORY] not allowed access task history without permission', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_WATCH_CONTENT);

        const history = await $invitedUser.tasks.fetchTaskHistory(addedDefaultTasks[0]?.id!).catch((err) => err.status);
        expect(history).toBe(403);
    });

    it('[TvPermissions.TASK_CAN_ACCESS_HISTORY] not allowed access task history without permission', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_WATCH_CONTENT);

        //disable edit description permission 
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_EDIT_DESCRIPTION);

        await $invitedUser.tasks.updateTask({
            id: addedDefaultTasks[0]?.id!,
            description: `11new-description-${timestampTestFetch}`,
        }).catch(console.error);

        const history = await $invitedUser.tasks.fetchTaskHistory(addedDefaultTasks[0]?.id!).catch((err) => err.status);
        expect(history).toBe(403);
    });

    it('[TvPermissions.TASK_CAN_ACCESS_HISTORY] not allowed access task history without permission', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_WATCH_CONTENT);
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_ACCESS_HISTORY);

        const taskIdForUpdate = addedDefaultTasks[0]?.id!;

        const response = await $invitedUser.tasks.updateTask({
            id: taskIdForUpdate,
            description: `11new-description-${timestampTestFetch}`,
        }).catch((err) => err.status);

        expect(response).toBeDefined();

        await $invitedUser.tasks.updateTask({
            id: taskIdForUpdate,
            description: `22new-description-${timestampTestFetch}`,
        }).catch(console.error);

        await $invitedUser.tasks.updateTask({
            id: taskIdForUpdate,
            description: `33new-description-${timestampTestFetch}`,
        }).catch(console.error);

        const task = await $invitedUser.tasks.fetchTaskById(taskIdForUpdate).catch(console.error);

        if (!task) {
            throw new Error('Failed to fetch task');
        }

        expect(task.description).toBe(`33new-description-${timestampTestFetch}`);


        const history = await $invitedUser.tasks.fetchTaskHistory(taskIdForUpdate).catch(console.error);

        if (!history) {
            throw new Error('Failed to fetch history');
        }

        expect(history.history.length).toBe(4);
        expect(history.history[0].description).toBe(`33new-description-${timestampTestFetch}`);
        expect(history.history[1].description).toBe(`22new-description-${timestampTestFetch}`);
        expect(history.history[2].description).toBe(`11new-description-${timestampTestFetch}`);
        expect(history.history[3].description).toBe(`0_fetch task-${timestampTestFetch}`);
    });

    it('[TvPermissions.TASK_CAN_RECOVERY_HISTORY] not allowed recovery task history without permission', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_WATCH_CONTENT);
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_ACCESS_HISTORY);

        const taskIdForUpdate = addedDefaultTasks[0]?.id!;

        const response = await $invitedUser.tasks.updateTask({
            id: taskIdForUpdate,
            description: `11new-description-${timestampTestFetch}`,
        }).catch((err) => err.status);

        expect(response).toBeDefined();

        const task = await $invitedUser.tasks.fetchTaskById(taskIdForUpdate).catch(console.error);

        if (!task) {
            throw new Error('Failed to fetch task');
        }

        expect(task.description).toBe(`11new-description-${timestampTestFetch}`);


        const history = await $invitedUser.tasks.fetchTaskHistory(taskIdForUpdate).catch(console.error);

        if (!history) {
            throw new Error('Failed to fetch history');
        }

        const tsk = history.history.find((h) => h.historyId);

        if (!tsk) {
            throw new Error('Failed to find history id');
        }

        const recoveryResponse = await $invitedUser.tasks.recoveryTaskHistory(tsk.historyId!, taskIdForUpdate).catch((err) => err.status);
        expect(recoveryResponse).toBe(403);
    });

    it('[TvPermissions.TASK_CAN_ACCESS_HISTORY] not allowed access task history without permission', async () => {
        await enableTaskAddPermission();
        await addPermissionForInvitedUser(TvPermissions.COMPONENT_CAN_WATCH_CONTENT);
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_ACCESS_HISTORY);
        await addPermissionForInvitedUser(TvPermissions.TASK_CAN_RECOVERY_HISTORY);

        const taskIdForUpdate = addedDefaultTasks[0]?.id!;

        const response = await $invitedUser.tasks.updateTask({
            id: taskIdForUpdate,
            description: `11new-description-${timestampTestFetch}`,
        }).catch((err) => err.status);

        expect(response).toBeDefined();

        await $invitedUser.tasks.updateTask({
            id: taskIdForUpdate,
            description: `22new-description-${timestampTestFetch}`,
        }).catch(console.error);

        await $invitedUser.tasks.updateTask({
            id: taskIdForUpdate,
            description: `33new-description-${timestampTestFetch}`,
        }).catch(console.error);

        const task = await $invitedUser.tasks.fetchTaskById(taskIdForUpdate).catch(console.error);

        if (!task) {
            throw new Error('Failed to fetch task');
        }

        expect(task.description).toBe(`33new-description-${timestampTestFetch}`);


        const history = await $invitedUser.tasks.fetchTaskHistory(taskIdForUpdate).catch(console.error);

        console.log('history', history);

        if (!history) {
            throw new Error('Failed to fetch history');
        }

        const historyId = history.history[1].historyId;

        if (!historyId) {
            throw new Error('Failed to get history id for recovery');
        }

        const recoveryResponse = await $invitedUser.tasks.recoveryTaskHistory(historyId, taskIdForUpdate).catch((err) => err.status);

        if (!recoveryResponse) {
            throw new Error('Failed to recovery task history');
        }

        expect(recoveryResponse.recovery).toBe(true);

        const taskAfterRecovery = await $invitedUser.tasks.fetchTaskById(taskIdForUpdate).catch(console.error);
        if (!taskAfterRecovery) {
            throw new Error('Failed to fetch task after recovery');
        }
        expect(taskAfterRecovery.description).toBe(`22new-description-${timestampTestFetch}`);
    });

    // describe('shared goals permissions tests', () => {
    //     it('should fetch shared goals', async () => {
    //         const goals = await $mainUser.goals.fetchGoals();

    //         console.log('goals ------ ', goals);
    //         expect(goals).toBeDefined();
    //         expect(goals?.length).toBeGreaterThan(1);
    //     });
    // });
});