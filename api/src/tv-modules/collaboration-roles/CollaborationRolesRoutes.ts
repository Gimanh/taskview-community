import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import { CollaborationRolesController } from './CollaborationRolesController';
import { CanAddCollaborationRoles } from './middlewares/CanAddCollaborationRoles';
import { CanDeleteCollaborationRoles } from './middlewares/CanDeleteCollaborationRoles';
import { CanFetchCollaborationRoles } from './middlewares/CanFetchCollaborationRoles';
import { CanFetchRolesPermissionsCollaborationRoles } from './middlewares/CanFetchRolesPermissionsCollaborationRoles';
import { CanToggleRolesPermissionsCollaborationRoles } from './middlewares/CanToggleRolesPermissionsCollaborationRoles';

export default class CollaborationRolesRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly controller: CollaborationRolesController;

    constructor() {
        this.router = Router();
        this.controller = new CollaborationRolesController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        // this.router.get('/fetchallpermissions', [IsLoggedIn], this.controller.fetchAllPermissions);//+
        // this.router.post('/addrole', [IsLoggedIn, CanAddCollaborationRoles], this.controller.addRole);//+
        // this.router.post('/deleterole', [IsLoggedIn, CanDeleteCollaborationRoles], this.controller.deleteRole); //+
        // this.router.get('/fetchroles/:goalId', [IsLoggedIn, CanFetchCollaborationRoles], this.controller.fetchRolesForGoal);//+
        // this.router.post('/fetchrolespermissions', [IsLoggedIn, CanFetchRolesPermissionsCollaborationRoles], this.controller.fetchAllRolesPermissionsForGoal);//+
        // this.router.post('/toggerolepermission', [IsLoggedIn, CanToggleRolesPermissionsCollaborationRoles], this.controller.togglePermissions);//+

        /**
         * Add new role to goal for collaboration
         */
        this.router.post('', [IsLoggedIn, CanAddCollaborationRoles], this.controller.addRoleToGoal);

        /**
         * Delete role from goal for collaboration
         */
        this.router.delete('', [IsLoggedIn, CanDeleteCollaborationRoles], this.controller.deleteRoleNew);

        /**
         * Fetch all permissions for goal for collaboration here we get all permissions which are available for the goal in TaskView
         */
        this.router.get('/all-permissions', [IsLoggedIn], this.controller.fetchAllPermissionsNew);

        /**
         * Fetch roles for goal for collaboration here we get all roles for the specific goal in TaskView
         */
        this.router.get('/:goalId', [IsLoggedIn, CanFetchCollaborationRoles], this.controller.fetchRolesForGoalNew);

        /**
         * Fetch role to permissions for goal for collaboration here we get all permissions for the specific role for the specific goal in TaskView
         * to know which permissions are assigned to the specific role
         */
        this.router.get(
            '/role-to-permissions/:goalId',
            [IsLoggedIn, CanFetchRolesPermissionsCollaborationRoles],
            this.controller.fetchRoleToPermissionsForGoalNew
        );

        /**
         * Toggle role permission for goal for collaboration
         */
        this.router.patch(
            '/role-permission',
            [IsLoggedIn, CanToggleRolesPermissionsCollaborationRoles],
            this.controller.togglePermissionsNew
        );
    }
}
