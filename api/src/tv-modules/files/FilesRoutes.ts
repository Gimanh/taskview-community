import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { GoalPermissions } from '../../types/auth.types';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import FilesController from './FilesController';
import { goalIdFromFile, goalIdFromParam, goalIdFromTask } from './middlewares/goal-id-resolvers';
import { requireFilePermission } from './middlewares/require-file-permission';

export default class FilesRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly controller: FilesController;

    constructor() {
        this.router = Router();
        this.controller = new FilesController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        // Whether attachments are enabled on this server (storage configured) and the upload size limit.
        this.router.get('/status', [IsLoggedIn], this.controller.status);

        // Project scope: upload (multipart, optional ?taskId= to link right away) and paginated listing.
        this.router.post('/goal/:goalId', [IsLoggedIn, requireFilePermission(GoalPermissions.FILE_CAN_MANAGE, goalIdFromParam)], this.controller.upload);
        this.router.get('/goal/:goalId', [IsLoggedIn, requireFilePermission(GoalPermissions.FILE_CAN_VIEW, goalIdFromParam)], this.controller.listForGoal);
        // Storage quota of the pool the project's files count against (its organization's own quota or the owner's pool).
        this.router.get('/goal/:goalId/quota', [IsLoggedIn, requireFilePermission(GoalPermissions.FILE_CAN_VIEW, goalIdFromParam)], this.controller.quota);

        // Task scope: files of a task, link existing project files, unlink (the file itself stays).
        this.router.get('/task/:taskId', [IsLoggedIn, requireFilePermission(GoalPermissions.FILE_CAN_VIEW, goalIdFromTask)], this.controller.listForTask);
        this.router.post('/task/:taskId/link', [IsLoggedIn, requireFilePermission(GoalPermissions.FILE_CAN_MANAGE, goalIdFromTask)], this.controller.link);
        this.router.delete('/task/:taskId/file/:fileId', [IsLoggedIn, requireFilePermission(GoalPermissions.FILE_CAN_MANAGE, goalIdFromTask)], this.controller.unlink);

        // Single file: metadata, rename, delete forever, short-lived download URL.
        this.router.get('/file/:fileId', [IsLoggedIn, requireFilePermission(GoalPermissions.FILE_CAN_VIEW, goalIdFromFile)], this.controller.getOne);
        this.router.patch('/file/:fileId', [IsLoggedIn, requireFilePermission(GoalPermissions.FILE_CAN_MANAGE, goalIdFromFile)], this.controller.rename);
        this.router.delete('/file/:fileId', [IsLoggedIn, requireFilePermission(GoalPermissions.FILE_CAN_MANAGE, goalIdFromFile)], this.controller.remove);
        this.router.post('/file/:fileId/download-url', [IsLoggedIn, requireFilePermission(GoalPermissions.FILE_CAN_VIEW, goalIdFromFile)], this.controller.downloadUrl);

        // Content is served by the signed token alone: browsers cannot attach the JWT to <img src> or <a download>.
        this.router.get('/content/:token', this.controller.content);
    }
}
