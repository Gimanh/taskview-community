import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import { CanAddTaskNew } from './middlewares/CanAddTaskNew';
// import { CanAddTask } from './middlewares/CanAddTask';
// import { CanUpdateTaskStatus } from './middlewares/CanUpdateTaskStatus';
import { CanDeleteTask } from './middlewares/CanDeleteTask';
// import { CanUpdateTaskAssignee } from './middlewares/CanUpdateTaskAssignee';
import { CanFetchTask } from './middlewares/CanFetchTask';
// import { CanUpdateTaskDescription } from './middlewares/CanUpdateTaskDescription';
// import { CanUpdateTaskNote } from './middlewares/CanUpdateTaskNote';
// import { CanUpdateTaskDeadline } from './middlewares/CanUpdateTaskDeadline';
// import { CanFetchSubtasks } from './middlewares/CanFetchSubtasks';
// import { CanUpdateTaskPriority } from './middlewares/CanUpdateTaskPriority';
// import { CanMoveTask } from './middlewares/CanMoveTask';
// import { CanSeeTaskAssignedUsers } from './middlewares/CanSeeTaskAssignedUsers';
import { CanFetchTaskHistory } from './middlewares/CanFetchTaskHistory';
import { CanFetchTasks } from './middlewares/CanFetchTasks';
import { CanRecoveryTaskHistory } from './middlewares/CanRecoveryTaskHistory';
import { CanUpdateTask } from './middlewares/CanUpdateTask';
import { CanUpdateTaskAssigneeNew } from './middlewares/CanUpdateTaskAssigneeNew';
import { TasksController } from './TasksController';
// import { MainCanCreateTaskAction } from './middlewares/MainCanCreateTaskAction';

export default class TasksRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly tasksController: TasksController;

    constructor() {
        this.router = Router();
        this.tasksController = new TasksController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        /**
         * Fetch tasks (pagination is working properly)
         */
        this.router.get('', [IsLoggedIn, CanFetchTasks], this.tasksController.fetchTasksNew);

        /**
         * Fetch task by id
         */
        this.router.get('/:taskId', [IsLoggedIn, CanFetchTask], this.tasksController.fetchTaskByIdNew);

        /**
         * Update task
         */
        this.router.patch('', [IsLoggedIn, CanUpdateTask], this.tasksController.updateTask);

        /**
         * Toggle user for task
         */
        this.router.patch(
            '/task-users',
            [IsLoggedIn, CanUpdateTaskAssigneeNew],
            this.tasksController.toggleUserRolesNew
        );

        /**
         * Add new task
         */
        this.router.post('', [IsLoggedIn, CanAddTaskNew], this.tasksController.addTaskNew);

        /**
         * Delete task
         */
        this.router.delete('', [IsLoggedIn, CanDeleteTask], this.tasksController.deleteTaskNew);

        /**
         * Fetch task history
         */
        this.router.get('/:taskId/history', [IsLoggedIn, CanFetchTaskHistory], this.tasksController.fetchTaskHistory);

        /**
         * Restore task from history
         */
        this.router.post(
            '/:taskId/restore/:historyId',
            [IsLoggedIn, CanRecoveryTaskHistory],
            this.tasksController.recoverTaskHistory
        );
    }
}
