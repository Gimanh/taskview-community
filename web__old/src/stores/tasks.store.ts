import { defineStore } from 'pinia';
import type {
    TagItemArgToggle,
    Task,
    TaskArgAdd,
    TaskArgDelete,
    TaskArgToggleAssignee,
    TaskArgUpdate,
    TaskBase,
} from 'taskview-api';
import { delay, isNotNullable, logError } from '@/helpers/app-helper';
import { $tvApi } from '@/plugins/axios';
import { DEFAULT_ID } from '@/types/app.types';
import { ALL_TASKS_LIST_ID, type TasksStoreState } from '@/types/tasks.types';
import { useTagsStore } from './tag.store';

export const useTasksStore = defineStore('tasks', {
    state(): TasksStoreState {
        return {
            tasks: [],
            selectedTask: null,
            fetchRules: {
                showCompleted: 0,
                currentListId: DEFAULT_ID,
                endOfTasks: false,
                currentPage: 0,
                searchText: '',
                firstNew: 1,
                filters: {},
                goalId: -1,
            },
            loading: false,
        };
    },
    actions: {
        updateFetchRules(data: Partial<TasksStoreState['fetchRules']>) {
            this.fetchRules = { ...this.fetchRules, ...data };
        },

        resetTasks() {
            this.tasks = [];
        },

        updateSelectedTask(task: Task) {
            if (this.selectedTask && this.selectedTask.id === task.id) {
                Object.assign(this.selectedTask, task);
            }
        },

        async fetchTaskById(taskId: TaskBase['id']) {
            if (taskId === this.selectedTask?.id) return;

            const task = await $tvApi.tasks.fetchTaskById(taskId).catch(logError);

            if (!task) return;

            this.selectedTask = task;
        },

        /** @deprecated */
        setTaskOrder(data: Partial<Task>) {
            const task = this.tasks.find((t) => data.id === t.id);
            if (!task) return;

            if (isNotNullable(data.taskOrder)) {
                task.taskOrder = data.taskOrder;
            }
            if (isNotNullable(data.kanbanOrder)) {
                task.kanbanOrder = data.kanbanOrder;
            }
        },

        // setTaskStatusId(data: TaskUpdateStatusIdArg) {

        //     if (data.taskId === this.selectedTask?.id) {
        //         this.selectedTask.statusId = data.statusId;
        //     }

        //     const task = this.tasks.find((tsk) => tsk.id === data.taskId);

        //     if (!task) return;

        //     task.statusId = data.statusId;
        //     this.updateSelectedTask(task);
        // },

        /** @deprecated */
        async updateOrders(data: TaskArgUpdate): Promise<Task | null> {
            const task = await $tvApi.tasks.updateTask(data).catch(logError);
            if (!task) return null;

            this.setTaskOrder(task);
            return task;
        },

        async addTask(taskArg: TaskArgAdd): Promise<false | Task> {
            if (taskArg.goalListId === ALL_TASKS_LIST_ID) {
                taskArg.goalListId = null;
            }

            const task = await $tvApi.tasks.createTask(taskArg).catch(logError);
            if (!task) return false;

            if (task.parentId) {
                let mainTask = this.tasks.find((t) => t.id === task.parentId);

                if (!mainTask && this.selectedTask?.id === task.parentId) {
                    mainTask = this.selectedTask
                }

                if (!mainTask) {
                    throw new Error('Main task not found for adding subtask');
                }

                if (mainTask) {
                    mainTask.subtasks.push(task);
                }

                if (this.selectedTask?.id === task.parentId) {
                    this.selectedTask.subtasks.push(task);
                }
            } else {
                this.tasks.unshift(task);
            }
            return task;
        },

        appendTasks(items: Task[]) {
            this.tasks = [...this.tasks, ...items];
        },

        async fetchAllTasks(goalId: number, showCompleted: 0 | 1 = 0, firstNew: 0 | 1 = 1) {
            this.loading = true;
            const searchParams = {
                showCompleted: +showCompleted as 0 | 1,
                goalId: +goalId,
                firstNew: +firstNew as 0 | 1,
                componentId: ALL_TASKS_LIST_ID,
                page: +this.fetchRules.currentPage,
                searchText: this.fetchRules.searchText,
                filters: this.fetchRules.filters,
                unlimited: true,
            };

            const tasks = await $tvApi.tasks
                .fetch(searchParams)
                .catch(logError)
                .finally(() => {
                    this.loading = false;
                });
            if (!tasks) return false;
            this.tasks = tasks;

            return false;
        },

        async fetchTasks(): Promise<boolean> {
            this.loading = true;

            const searchParams = {
                showCompleted: +this.fetchRules.showCompleted as 0 | 1,
                goalId: +this.fetchRules.goalId,
                firstNew: +this.fetchRules.firstNew as 0 | 1,
                componentId: +this.fetchRules.currentListId,
                page: +this.fetchRules.currentPage,
                searchText: this.fetchRules.searchText,
                filters: this.fetchRules.filters,
            };

            const tasks = await $tvApi.tasks
                .fetch(searchParams)
                .catch(logError)
                .finally(() => {
                    this.loading = false;
                });
            if (!tasks) return false;

            this.fetchRules.endOfTasks = tasks.length < 1;
            if (!this.fetchRules.endOfTasks) {
                this.fetchRules.currentPage++;
            }
            this.appendTasks(tasks);
            return true;
        },

        /**@todo rename to updateTaskComplete */
        async updateTaskCompleteStatus(
            data: TaskArgUpdate,
            deleteCompleted: boolean = true
        ): Promise<boolean | undefined> {
            this.loading = true;

            const taskResult = await $tvApi.tasks
                .updateTask(data)
                .catch(logError)
                .finally(() => {
                    this.loading = false;
                });

            if (!taskResult) return undefined;

            // this.setTaskStatusId({ taskId: taskResult.id, statusId: taskResult.statusId });

            const searchId = taskResult.parentId || taskResult.id;

            let parentTask: Task | undefined;

            parentTask = this.tasks.find((tsk: Task) => tsk.id === searchId);

            if (!parentTask && searchId === this.selectedTask?.id) {
                parentTask = this.selectedTask;
            }

            if (!parentTask) {
                return undefined;
            }

            //we updating subtasks
            if (taskResult.parentId) {
                const subTask = parentTask.subtasks.find((sub) => sub.id === +taskResult.id);
                if (subTask) {
                    subTask.complete = taskResult.complete;
                }
            } else {
                //we updating main task
                parentTask.complete = taskResult.complete;
                //we deleting task from list if deleteCompleted is true
                // and task complete is different from showCompleted rule for fetching
                if (deleteCompleted && !!this.fetchRules.showCompleted !== data.complete) {
                    //handle condition with showing tasks in diff mode (showCompleted)
                    await delay(500);
                    const taskIndex = this.tasks.findIndex((task) => task.id === taskResult.id);
                    if (taskIndex !== -1) {
                        this.tasks.splice(taskIndex, 1);
                    }
                }
            }

            this.updateSelectedTask(parentTask);

            return taskResult.complete;
        },

        async updateTaskDescription(data: TaskArgUpdate): Promise<boolean> {
            this.loading = true;
            const task = await $tvApi.tasks
                .updateTask(data)
                .catch(logError)
                .finally(() => {
                    this.loading = false;
                });
            if (!task) return false;

            const localTask = this.tasks.find(({ id }) => id === task.id);
            if (localTask) {
                Object.assign(localTask, task);
            }
            this.updateSelectedTask(task);
            return true;
        },

        async deleteTask(id: TaskArgDelete): Promise<boolean> {
            this.loading = true;

            const result = await $tvApi.tasks
                .deleteTask(id)
                .catch(logError)
                .finally(() => {
                    this.loading = false;
                });
            if (!result) return false;

            const taskIndex = this.tasks.findIndex((task) => task.id === id);

            if (taskIndex !== -1) {
                this.tasks.splice(taskIndex, 1);
            }

            if (this.selectedTask?.id === id) {
                this.selectedTask = null;
            }

            return true;
        },

        async updateTaskNote(data: TaskArgUpdate): Promise<boolean> {
            this.loading = true;

            const task = await $tvApi.tasks
                .updateTask(data)
                .catch(logError)
                .finally(() => {
                    this.loading = false;
                });

            if (!task) return false;

            const localTask = this.tasks.find(({ id }) => id === task.id);
            if (localTask) {
                Object.assign(localTask, task);
            }
            this.updateSelectedTask(task);

            return true;
        },

        //we do not fetch subtasks from server separately, we fetch all tasks with subtasks
        // async fetchSubtasks(taskId: TaskItem['id']): Promise<void> {
        //     this.loading = true;
        //     const subtasks = await $tvApi.tasks.fetch(taskId).catch(logError).finally(() => this.loading = false);
        //     // const result = await $api
        //     //     .get<AppResponse<TaskItem[]>>(`${this.urls.fetchSubtasks}?taskId=${taskId}`)
        //     //     .catch((err) => console.log(err));
        //     // this.loading = false;
        //     // if (result) {
        //     //     if (result.data.response.length > 0) {
        //     //         const task = this.tasks.find(({ id }) => id === +taskId);
        //     //         if (task) {
        //     //             task.subtasks = result.data.response;
        //     //             this.updateSelectedTask(task);
        //     //         } else {
        //     //             if (this.selectedTask && +this.selectedTask.id === +taskId) {
        //     //                 this.selectedTask.subtasks = result.data.response;
        //     //             }
        //     //         }
        //     //     }
        //     // }
        // },

        async toggleTagForTask(data: TagItemArgToggle) {
            const tagsStore = useTagsStore();
            const action = await tagsStore.toggleTag(data);

            if (!action) {
                return;
            }

            const task = this.tasks.find((tsk) => +tsk.id === +data.taskId);

            const toggleTag = (task: Task) => {
                if (action === 'delete') {
                    const tagIndex = task.tags.indexOf(data.tagId);
                    if (tagIndex !== -1) {
                        task.tags.splice(tagIndex, 1);
                    }
                } else {
                    task.tags.push(data.tagId);
                }
            };

            if (task) {
                toggleTag(task);
                this.updateSelectedTask(task);
            } else if (this.selectedTask?.id === data.taskId) {
                toggleTag(this.selectedTask);
            }
        },

        async udpatePriority(data: TaskArgUpdate): Promise<void> {
            this.loading = true;

            const task = await $tvApi.tasks
                .updateTask(data)
                .catch(logError)
                .finally(() => {
                    this.loading = false;
                });

            if (!task) return;

            const localTask = this.tasks.find(({ id }) => id === task.id);

            if (localTask) {
                Object.assign(localTask, task);
            }

            this.updateSelectedTask(task);
        },

        //TODO fixme consider refactoring to make one method for all updates
        async moveTaskToAnotherList(data: TaskArgUpdate) {
            this.loading = true;

            const task = await $tvApi.tasks
                .updateTask(data)
                .catch(logError)
                .finally(() => {
                    this.loading = false;
                });

            if (!task) return;

            const localTask = this.tasks.find(({ id }) => id === task.id);

            if (localTask) {
                Object.assign(localTask, task);
            }

            this.updateSelectedTask(task);
        },

        async saveDateForTask(data: TaskArgUpdate) {
            this.loading = true;

            const task = await $tvApi.tasks
                .updateTask(data)
                .catch(logError)
                .finally(() => {
                    this.loading = false;
                });

            if (!task) return;

            const localTask = this.tasks.find(({ id }) => id === task.id);

            if (localTask) {
                Object.assign(localTask, task);
            }

            this.updateSelectedTask(task);
        },

        async updateTaskAssignee(data: TaskArgToggleAssignee) {
            this.loading = true;

            const updateAssignee = await $tvApi.tasks
                .toggleTasksAssignee(data)
                .catch(logError)
                .finally(() => {
                    this.loading = false;
                });

            if (!updateAssignee) return;

            const task = this.tasks.find((tsk) => tsk.id === data.taskId);

            if (!task) return;

            task.assignedUsers = updateAssignee.userIds;
            this.updateSelectedTask(task);
        },

        // we do not fetch assigned users from server separately, we fetch all tasks with assigned users
        // async fetchTaskAssignedUsers(data: Pick<TaskUpdateAssigneeArg, 'taskId'>) {
        //     this.loading = true;
        //     const result = await $api
        //         .post<AppResponse<TaskUpdateAssigneeResp>>(this.urls.taskFetchAssignedUsers, data)
        //         .catch((err) => console.log(err));
        //     this.loading = false;

        //     if (result) {
        //         const task = this.tasks.find((tsk) => tsk.id === data.taskId);
        //         if (task) {
        //             task.assignedUsers = result.data.response.usersIds;
        //             this.updateSelectedTask(task);
        //         } else if (this.selectedTask?.id === data.taskId) {
        //             this.selectedTask.assignedUsers = result.data.response.usersIds;
        //         }
        //     }
        // },

        async updateTaskStatusId(data: TaskArgUpdate) {
            const task = await $tvApi.tasks
                .updateTask(data)
                .catch(logError)
                .finally(() => {
                    this.loading = false;
                });

            if (!task) return;

            const localTask = this.tasks.find(({ id }) => id === task.id);

            if (localTask) {
                Object.assign(localTask, task);
            }

            this.updateSelectedTask(task);
        },

        async updateTaskAmount(data: TaskArgUpdate) {
            this.loading = true;
            const task = await $tvApi.tasks
                .updateTask(data)
                .catch(logError)
                .finally(() => {
                    this.loading = false;
                });

            if (!task) return;

            const localTask = this.tasks.find(({ id }) => id === task.id);

            if (localTask) {
                Object.assign(localTask, task);
            }

            this.updateSelectedTask(task);
        },

        async updateTaskTransactionType(data: TaskArgUpdate) {
            this.loading = true;
            const task = await $tvApi.tasks
                .updateTask(data)
                .catch(logError)
                .finally(() => {
                    this.loading = false;
                });

            if (!task) return;

            const localTask = this.tasks.find(({ id }) => id === task.id);

            if (localTask) {
                Object.assign(localTask, task);
            }

            this.updateSelectedTask(task);
        },
    },
});
