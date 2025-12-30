import { TvApi } from '@/tv';
import {
    describe,
    it,
    expect,
    beforeAll,
    beforeEach,
} from 'vitest';
import { initApi } from './init-api';
import { ALL_TASKS_LIST_ID, type TaskArgAdd, type TaskResponseAdd } from '../tasks.api.types';

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

    return {
        goalId: goalId,
        description: description,
        complete: complete,
        priorityId: priorityId,
        startDate: startDate,
        endDate: endDate,
        startTime: startTime,
        endTime: endTime,
        statusId: statusId,
        taskOrder: taskOrder,
        kanbanOrder: kanbanOrder,
        amount: amount,
        transactionType: transactionType,
        nodeGraphPosition: nodeGraphPosition,
    }
}
describe('TvApi tags tests', () => {
    let $api: TvApi;
    let goalId: number;

    beforeAll(async () => {
        const { $tvApi } = await initApi();
        $api = $tvApi;

        const addGoalResponse = await $api.goals.createGoal({
            name: `Goal for tags tests-${Date.now()}`,
        }).catch(console.error);

        if (!addGoalResponse) {
            throw new Error('Failed to add goal');
        }

        goalId = addGoalResponse?.id!;
    });

    describe('Tasks fetch', () => {
        let goalIdTestFetch: number;
        let timestampTestFetch: number;
        let listIdTestFetch: number;
        let tasksNamesOrder: string[] = [];
        const RECORDS_COUNT = 40;
        beforeEach(async () => {
            tasksNamesOrder = [];
            timestampTestFetch = Date.now();
            const goal = await $api.goals.createGoal({
                name: `Goal for tasks tests-${timestampTestFetch}`,
            }).catch(console.error);

            if (!goal) {
                throw new Error('Failed to add goal');
            }

            goalIdTestFetch = goal?.id!;

            const list = await $api.goalLists.createList({
                name: `List for tasks tests-${timestampTestFetch}`,
                goalId: goalIdTestFetch,
            }).catch(console.error);

            if (!list) {
                throw new Error('Failed to add list');
            }

            listIdTestFetch = list?.id!;

            for (let i = 0; i < RECORDS_COUNT; i++) {
                const task = getTestTask(goalIdTestFetch);
                task.description = `${i}_fetch task-${timestampTestFetch}`;
                task.goalListId = listIdTestFetch;
                const addTaskResponse = await $api.tasks.createTask(task).catch(console.error);
                if (!addTaskResponse) {
                    throw new Error('Failed to add task');
                }
                tasksNamesOrder.push(task.description);
            }
        });

        it('should fetch tasks for goal', async () => {
            const tasks = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: ALL_TASKS_LIST_ID,
            }).catch(console.error);
            if (!tasks) {
                throw new Error('Failed to fetch tasks');
            }
            expect(tasks).toBeDefined();
            expect(tasks.length).toBe(30);
        });

        it('should fetch tasks for given list in goal', async () => {
            const tasks = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
            }).catch(console.error);
            if (!tasks) {
                throw new Error('Failed to fetch tasks');
            }
            expect(tasks).toBeDefined();
            expect(tasks.length).toBe(30);
        });

        it('should fetch tasks with order by id desc', async () => {
            const tasks = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
            }).catch(console.error);

            expect(tasks?.map(task => task.description)).toEqual(tasksNamesOrder.slice(0, 30));
        });

        it('should fetch tasks with order by id asc', async () => {
            const tasks = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 1,
                componentId: listIdTestFetch,
            }).catch(console.error);

            expect(tasks?.map(task => task.description)).toEqual(tasksNamesOrder.slice(-30).reverse());
        });

        it('should fetch tasks with search text ', async () => {
            const searchText = 'fetch task';
            const tasks = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
                searchText: searchText,
            }).catch(console.error);

            //limit is 30 per page
            expect(tasks?.length).toBe(30);
            expect(tasks?.every(task => task.description.includes(searchText))).toBe(true);
        });

        it('should fetch tasks with search text first record', async () => {
            const searchText = '0_fetch task';
            const tasks = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
                searchText: searchText,
            }).catch(console.error);

            // 0_, 10_, 20_, 30_
            expect(tasks?.length).toBe(4);
            expect(tasks?.[0].description.startsWith(searchText)).toBe(true);
        });

        it('should fetch tasks with pagination', async () => {
            const tasks = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
            }).catch(console.error);
            //limit is 30 per page
            expect(tasks?.length).toBe(30);

            const tasks2 = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 1,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
            }).catch(console.error);
            //limit is 30 per page total records is 40 for test
            expect(tasks2?.length).toBe(10);
        });

        it('should fetch tasks with unlimited', async () => {
            const tasks = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
                unlimited: true,
            }).catch(console.error);

            expect(tasks?.length).toBe(RECORDS_COUNT);
        });

        it('should fetch tasks with unlimited and page is not affect to result', async () => {
            const tasks = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 20,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
                unlimited: true,
            }).catch(console.error);

            expect(tasks?.length).toBe(RECORDS_COUNT);
        });

        it('should fetch tasks with filters priority', async () => {
            const tasks = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
                filters: {
                    priority: 1,
                },
            }).catch(console.error);
            //limit is 30 per page and priority is 1 by default
            expect(tasks?.length).toBe(30);
            expect(tasks?.every(task => task.priorityId === 1)).toBe(true);
        });

        it('should fetch tasks with filters tags', async () => {
            const tag1Name = `tag1-${Date.now()}`;
            const tag2Name = `tag2-${Date.now()}`;

            const tasks = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
            }).catch(console.error);

            const addTagsResponse = await $api.tags.createTag({
                name: tag1Name,
                goalId: goalIdTestFetch,
                color: 'red',
            }).catch(console.error);

            const addTagsResponse2 = await $api.tags.createTag({
                name: tag2Name,
                goalId: goalIdTestFetch,
                color: 'blue',
            }).catch(console.error);

            if (!addTagsResponse || !addTagsResponse2) {
                throw new Error('Failed to add tag');
            }
            const tag1Id = addTagsResponse?.id!;
            const tag2Id = addTagsResponse2?.id!;

            await $api.tags.toggleTag({
                tagId: tag1Id,
                taskId: tasks?.[0].id!,
            }).catch(console.error);

            await $api.tags.toggleTag({
                tagId: tag2Id,
                taskId: tasks?.[0].id!,
            }).catch(console.error);

            await $api.tags.toggleTag({
                tagId: tag2Id,
                taskId: tasks?.[1].id!,
            }).catch(console.error);

            const tasksWithTags = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
                filters: {
                    selectedTags: {
                        [tag1Id]: true,
                    },
                },
            }).catch(console.error);

            //we have one task with tag1
            expect(tasksWithTags?.length).toBe(1);
            expect(tasksWithTags?.every(task => task.tags.includes(tag1Id))).toBe(true);

            const tasksWithTags2 = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
                filters: {
                    selectedTags: {
                        [tag1Id]: true,
                        [tag2Id]: true,
                    },
                },
            }).catch(console.error);

            //we have one task with tag1
            expect(tasksWithTags2?.length).toBe(2);
            expect(tasksWithTags2?.some(task => task.tags.includes(tag1Id))).toBe(true);
            expect(tasksWithTags2?.every(task => task.tags.includes(tag2Id))).toBe(true);
        });


        it('should toggle tasks assignee', async () => {
            const email1 = `user1-${Date.now()}@test.com`;
            const email2 = `user2-${Date.now()}@test.com`;

            const user1 = await $api.collaboration.inviteUserToGoal({
                email: email1,
                goalId: goalIdTestFetch,
            }).catch(console.error);

            const user2 = await $api.collaboration.inviteUserToGoal({
                email: email2,
                goalId: goalIdTestFetch,
            }).catch(console.error);


            const tasks = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
            }).catch(console.error);

            const assigneeResult = await $api.tasks.toggleTasksAssignee({
                taskId: tasks?.[0].id!,
                userIds: [user1?.id!, user2?.id!],
            }).catch(console.error);

            expect(assigneeResult).toBeDefined();
            expect(assigneeResult?.userIds).toEqual([user1?.id!, user2?.id!]);
        });

        it('should fetch tasks with filters assignee', async () => {
            const email1 = `user1-${Date.now()}@test.com`;
            const email2 = `user2-${Date.now()}@test.com`;

            const user1 = await $api.collaboration.inviteUserToGoal({
                email: email1,
                goalId: goalIdTestFetch,
            }).catch(console.error);

            const user2 = await $api.collaboration.inviteUserToGoal({
                email: email2,
                goalId: goalIdTestFetch,
            }).catch(console.error);


            const tasks = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
            }).catch(console.error);

            await $api.tasks.toggleTasksAssignee({
                taskId: tasks?.[0].id!,
                userIds: [user1?.id!, user2?.id!],
            }).catch(console.error);

            const tasksWithAssignee = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
                filters: {
                    selectedUser: user1?.id!,
                },
            }).catch(console.error);

            expect(tasksWithAssignee?.length).toBe(1);
            expect(tasksWithAssignee?.every(task => task.assignedUsers.includes(user1?.id!))).toBe(true);
            expect(tasksWithAssignee?.every(task => task.assignedUsers.includes(user2?.id!))).toBe(true);


            await $api.tasks.toggleTasksAssignee({
                taskId: tasks?.[0].id!,
                userIds: [user2?.id!],
            }).catch(console.error);

            const tasksWithAssignee2 = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
                filters: {
                    selectedUser: user1?.id!,
                },
            }).catch(console.error);

            expect(tasksWithAssignee2?.length).toBe(0);

            const tasksWithAssignee3 = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
                filters: {
                    selectedUser: user2?.id!,
                },
            }).catch(console.error);
            expect(tasksWithAssignee3?.length).toBe(1);
            expect(tasksWithAssignee3?.every(task => task.assignedUsers.includes(user1?.id!))).toBe(false);
            expect(tasksWithAssignee3?.every(task => task.assignedUsers.includes(user2?.id!))).toBe(true);
        });


        it('should fetch tasks with filters assignee and tags', async () => {
            // Tags for test
            const tag1Name = `tag1-${Date.now()}`;
            const tag2Name = `tag2-${Date.now()}`;

            const tasks = await $api.tasks.fetch({
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: listIdTestFetch,
            }).catch(console.error);

            const addTagsResponse = await $api.tags.createTag({
                name: tag1Name,
                goalId: goalIdTestFetch,
                color: 'red',
            }).catch(console.error);

            const addTagsResponse2 = await $api.tags.createTag({
                name: tag2Name,
                goalId: goalIdTestFetch,
                color: 'blue',
            }).catch(console.error);

            if (!addTagsResponse || !addTagsResponse2) {
                throw new Error('Failed to add tag');
            }
            const tag1Id = addTagsResponse?.id!;
            const tag2Id = addTagsResponse2?.id!;

            await $api.tags.toggleTag({
                tagId: tag1Id,
                taskId: tasks?.[0].id!,
            }).catch(console.error);

            await $api.tags.toggleTag({
                tagId: tag2Id,
                taskId: tasks?.[0].id!,
            }).catch(console.error);

            await $api.tags.toggleTag({
                tagId: tag2Id,
                taskId: tasks?.[1].id!,
            }).catch(console.error);

            //Users for test

            const email1 = `user1-${Date.now()}@test.com`;
            const email2 = `user2-${Date.now()}@test.com`;

            const user1 = await $api.collaboration.inviteUserToGoal({
                email: email1,
                goalId: goalIdTestFetch,
            }).catch(console.error);

            const user2 = await $api.collaboration.inviteUserToGoal({
                email: email2,
                goalId: goalIdTestFetch,
            }).catch(console.error);

            await $api.tasks.toggleTasksAssignee({
                taskId: tasks?.[0].id!,
                userIds: [user1?.id!],
            }).catch(console.error);

            await $api.tasks.toggleTasksAssignee({
                taskId: tasks?.[1].id!,
                userIds: [user2?.id!],
            }).catch(console.error);

            //Priority for test
            await $api.tasks.updateTask({
                id: tasks?.[1].id!,
                priorityId: 2,
            });

            const baseFetch = {
                goalId: goalIdTestFetch,
                page: 0,
                showCompleted: 0 as 0 | 1,
                firstNew: 0 as 0 | 1,
                componentId: listIdTestFetch,
            }

            const notTasksWithPriority3 = await $api.tasks.fetch({
                ...baseFetch,
                filters: {
                    priority: 3
                },
            }).catch(console.error);
            expect(notTasksWithPriority3?.length).toBe(0);

            const notTasksWithPriority3AndUser2 = await $api.tasks.fetch({
                ...baseFetch,
                filters: {
                    priority: 3,
                    selectedUser: user2?.id!,
                },
            }).catch(console.error);
            expect(notTasksWithPriority3AndUser2?.length).toBe(0);

            const tasksWithPriority2AndUser2 = await $api.tasks.fetch({
                ...baseFetch,
                filters: {
                    priority: 2,
                    selectedUser: user2?.id!,
                },
            }).catch(console.error);
            expect(tasksWithPriority2AndUser2?.length).toBe(1);

            const tasksWithPriority2AndUser1 = await $api.tasks.fetch({
                ...baseFetch,
                filters: {
                    priority: 2,
                    selectedUser: user1?.id!,
                },
            }).catch(console.error);
            expect(tasksWithPriority2AndUser1?.length).toBe(0);

            const tasksWithPriority2AndUser2AndTag2 = await $api.tasks.fetch({
                ...baseFetch,
                filters: {
                    priority: 2,
                    selectedUser: user2?.id!,
                    selectedTags: {
                        [tag2Id]: true,
                    },
                },
            }).catch(console.error);
            expect(tasksWithPriority2AndUser2AndTag2?.length).toBe(1);

            //no tasks with tag1 and user2
            const tasksWithPriority2AndUser2AndTag1 = await $api.tasks.fetch({
                ...baseFetch,
                filters: {
                    priority: 2,
                    selectedUser: user2?.id!,
                    selectedTags: {
                        [tag1Id]: true,
                    },
                },
            }).catch(console.error);
            expect(tasksWithPriority2AndUser2AndTag1?.length).toBe(0);

            //no tasks with tag2 and user2
            const tasksWithPriority1AndUser2AndTag2 = await $api.tasks.fetch({
                ...baseFetch,
                filters: {
                    selectedTags: {
                        [tag2Id]: true,
                    },
                },
            }).catch(console.error);
            expect(tasksWithPriority1AndUser2AndTag2?.length).toBe(2);
        });
    });



    describe('Tasks fetch by id', () => {
        it('should fetch task by id', async () => {
            const task = getTestTask(goalId);
            const addTaskResponse = await $api.tasks.createTask(task).catch(console.error);
            if (!addTaskResponse) {
                throw new Error('Failed to add task');
            }

            const fetchTaskResponse = await $api.tasks.fetchTaskById(addTaskResponse.id).catch(console.error);
            if (!fetchTaskResponse) {
                throw new Error('Failed to fetch task');
            }

            expect(fetchTaskResponse).toBeDefined();
            expect(fetchTaskResponse).toMatchObject(addTaskResponse);
        });
    });

    describe('Tasks update', () => {
        let taskForUpdate: TaskResponseAdd;

        beforeEach(async () => {
            const task = getTestTask(goalId);
            taskForUpdate = (await $api.tasks.createTask(task));
            if (!taskForUpdate) {
                throw new Error('Failed to add task for test update');
            }
        });

        it('parentId', async () => {
            const parentTask = getTestTask(goalId);
            const parentTaskResponse = await $api.tasks.createTask(parentTask);

            if (!parentTaskResponse) {
                throw new Error('Failed to add parent task');
            }

            const updateResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                parentId: parentTaskResponse.id
            }).catch(console.error);

            const expectedTask = { ...taskForUpdate, parentId: parentTaskResponse.id };

            expect(updateResponse).toBeDefined();
            expect(updateResponse).toMatchObject(expectedTask);
        });

        it('description', async () => {
            const description = `'test task updated'-${Date.now()}`;

            const taskResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                description
            }).catch(console.error);

            if (!taskResponse) {
                throw new Error('Failed to update task');
            }
            expect(taskResponse).toBeDefined();
            expect(taskResponse).toMatchObject({ ...taskForUpdate, description });
        });

        it('complete', async () => {
            const complete = true;
            const taskResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                complete
            }).catch(console.error);
            expect(taskResponse).toBeDefined();
            expect(taskResponse).toMatchObject({ ...taskForUpdate, complete });
        });

        it('priorityId', async () => {
            const priorityId = 2;
            const taskResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                priorityId
            }).catch(console.error);
            expect(taskResponse).toBeDefined();
            expect(taskResponse).toMatchObject({ ...taskForUpdate, priorityId });
        });

        it('startDate', async () => {
            const startDate = `2025-01-14`;
            const taskResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                startDate
            }).catch(console.error);
            expect(taskResponse).toBeDefined();
            expect(taskResponse).toMatchObject({ ...taskForUpdate, startDate });
        });
        it('endDate', async () => {
            const endDate = `2025-01-15`;
            const taskResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                endDate
            }).catch(console.error);
            expect(taskResponse).toBeDefined();
            expect(taskResponse).toMatchObject({ ...taskForUpdate, endDate });
        });

        it('endDate startDate endTime startTime are null', async () => {
            let endDate: string | null = '2025-01-15';
            let startDate: string | null = '2025-01-14';
            let endTime: string | null = '00:15:00+02';
            let startTime: string | null = '00:14:00+02';

            let taskResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                endDate,
                startDate,
                endTime,
                startTime,
            }).catch(console.error);
            expect(taskResponse).toBeDefined();
            expect(taskResponse).toMatchObject({ ...taskForUpdate, endDate, startDate, endTime, startTime });

            endDate = null;
            startDate = null;
            endTime = null;
            startTime = null;
            taskResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                endDate,
                startDate,
                endTime,
                startTime,
            }).catch(console.error);
            expect(taskResponse).toBeDefined();
            expect(taskResponse).toMatchObject({ ...taskForUpdate, endDate, startDate, endTime, startTime });
        });

        it('startTime', async () => {
            const startTime = `00:14:00+02`;
            const taskResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                startTime
            }).catch(console.error);
            expect(taskResponse).toBeDefined();
            expect(taskResponse).toMatchObject({ ...taskForUpdate, startTime });
        });

        it('endTime', async () => {
            const endTime = `00:15:00+02`;
            const taskResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                endTime
            }).catch(console.error);
            console.log('taskResponse endTime', taskResponse);
            expect(taskResponse).toBeDefined();
            expect(taskResponse).toMatchObject({ ...taskForUpdate, endTime });
        });

        it('goalListId', async () => {
            const addGoalListResponse = await $api.goalLists.createList({
                name: `Goal list for tests-${Date.now()}`,
                goalId: goalId,
            }).catch(console.error);

            if (!addGoalListResponse) {
                throw new Error('Failed to add goal list');
            }

            const goalListId = addGoalListResponse?.id;
            const taskResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                goalListId
            }).catch(console.error);
            expect(taskResponse).toBeDefined();
            expect(taskResponse).toMatchObject({ ...taskForUpdate, goalListId });
        });

        it('note', async () => {
            const note = `Note for task-${Date.now()}`;
            const taskResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                note
            }).catch(console.error);
            expect(taskResponse).toBeDefined();
            expect(taskResponse).toMatchObject({ ...taskForUpdate, note });
        });

        it('amount', async () => {
            const amount = 100;
            const taskResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                amount
            }).catch(console.error);
            expect(taskResponse).toBeDefined();
            expect(taskResponse).toMatchObject({ ...taskForUpdate, amount });
        });

        it('transactionType', async () => {
            const transactionType = 1;
            const taskResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                transactionType
            }).catch(console.error);
            expect(taskResponse).toBeDefined();
            expect(taskResponse).toMatchObject({ ...taskForUpdate, transactionType });
        });

        it('kanbanOrder', async () => {
            const kanbanOrder = 2;
            const taskResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                kanbanOrder
            }).catch(console.error);
            expect(taskResponse).toBeDefined();
            expect(taskResponse).toMatchObject({ ...taskForUpdate, kanbanOrder });
        });

        it('taskOrder', async () => {
            const taskOrder = 2;
            const taskResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                taskOrder
            }).catch(console.error);
            expect(taskResponse).toBeDefined();
            expect(taskResponse).toMatchObject({ ...taskForUpdate, taskOrder });
        });

        it('nodeGraphPosition', async () => {
            const nodeGraphPosition = { x: 150, y: 220 };
            const taskResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                nodeGraphPosition
            }).catch(console.error);
            expect(taskResponse).toBeDefined();
            expect(taskResponse).toMatchObject({ ...taskForUpdate, nodeGraphPosition });
        });

        it('GoalId NOT ALLOWED TO UPDATE', async () => {
            const otherGoal = await $api.goals.createGoal({
                name: `Other goal for tests-${Date.now()}`,
            }).catch(console.error);

            if (!otherGoal) {
                throw new Error('Failed to add other goal');
            }

            const taskResponse = await $api.tasks.updateTask({
                id: taskForUpdate?.id!,
                // @ts-expect-error - goalId is not allowed to update
                goalId: otherGoal.goal?.id!
            }).catch((err) => err.status);
            expect(taskResponse).toBe(403);
        });
    });

    describe('Tasks delete', () => {
        it('should delete task', async () => {
            const task = getTestTask(goalId);
            const addTaskResponse = await $api.tasks.createTask(task).catch(console.error);
            if (!addTaskResponse) {
                throw new Error('Failed to add task');
            }
            const deleteTaskResponse = await $api.tasks.deleteTask(addTaskResponse.id).catch(console.error);
            if (!deleteTaskResponse) {
                throw new Error('Failed to delete task');
            }
            expect(deleteTaskResponse.delete).toBe(true);
        });
        it('should delete task', async () => {
            const status = await $api.tasks.deleteTask(-400).catch((err) => err.status);
            expect(status).toBe(403);
        });
    });

    describe('Tasks add', () => {
        it('add with parentId (subtask)', async () => {
            const parentTask = getTestTask(goalId);
            const parentTaskResponse = await $api.tasks.createTask(parentTask).catch(console.error);
            if (!parentTaskResponse) {
                throw new Error('Failed to add parent task');
            }

            const task = getTestTask(goalId);
            task.parentId = parentTaskResponse.id;

            const addTaskResponse = await $api.tasks.createTask(task).catch(console.error);
            if (!addTaskResponse) {
                throw new Error('Failed to add task');
            }
            expect(addTaskResponse).toMatchObject({ ...task, parentId: parentTaskResponse.id });
        });
        it('should add task with all fields', async () => {
            const task = getTestTask(goalId);

            const addTaskResponse = await $api.tasks.createTask(task).catch(console.error);
            console.log(addTaskResponse)
            if (!addTaskResponse) {
                throw new Error('Failed to add task');
            }

            expect(addTaskResponse).toMatchObject(task);
        });

        it('should add task with name', async () => {
            const description = `test task-${Date.now()}`;
            const addTaskResponse = await $api.tasks.createTask({
                description: description,
                goalId: goalId,
            }).catch(console.error);

            if (!addTaskResponse) {
                throw new Error('Failed to add task');
            }
            console.log(addTaskResponse)

            expect(addTaskResponse).toBeDefined();
            // expect(addTaskResponse.task).toMatchObject(taskItemMatch);

            Object.entries(taskItemMatch).forEach(([key, value]) => {
                expect(addTaskResponse).toHaveProperty(key);
                expect(typeof addTaskResponse[key as keyof typeof addTaskResponse]).toBe(typeof value);
            });
        });
    });
});