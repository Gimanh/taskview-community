import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import { CollaborationController } from './CollaborationController';
import { CanAddUserCollaboration } from './middlewares/CanAddUserCollaboration';
import { CanDeleteUserCollaboration } from './middlewares/CanDeleteUserCollaboration';
// import { CanFetchUsersCollaboration } from './middlewares/CanFetchUsersCollaboration';
import { CanToggleRolesCollaboration } from './middlewares/CanToggleRolesCollaboration';

export default class CollaborationRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly collaborationController: CollaborationController;

    constructor() {
        this.router = Router();
        this.collaborationController = new CollaborationController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        // this.router.get('/fetchusers/:goalId', [IsLoggedIn, CanFetchUsersCollaboration], this.collaborationController.fetchUsersForGoals);//+
        // this.router.post('/toggleuserroles', [IsLoggedIn, CanToggleRolesCollaboration], this.collaborationController.toggleUserRoles);//+
        // this.router.post('/adduser', [IsLoggedIn, CanAddUserCollaboration], this.collaborationController.addUser);//+
        // this.router.post('/deleteuser', [IsLoggedIn, CanDeleteUserCollaboration], this.collaborationController.deleteUser);//+
        // this.router.get('/fetchallusers', [IsLoggedIn], this.collaborationController.fetchAllUsers);//+

        /**
         * Add new user to goal for collaboration
         */
        this.router.post('', [IsLoggedIn, CanAddUserCollaboration], this.collaborationController.addUserNew);

        /**
         * Delete user from goal for collaboration
         */
        this.router.delete('', [IsLoggedIn, CanDeleteUserCollaboration], this.collaborationController.deleteUserNew);

        /**
         * Toggle user roles for goal for collaboration
         */
        this.router.patch(
            '',
            [IsLoggedIn, CanToggleRolesCollaboration],
            this.collaborationController.toggleUserRolesNew
        );

        /**
         * Fetch all users for collaboration
         */
        this.router.get('', [IsLoggedIn], this.collaborationController.fetchAllUsersNew);

        /**
         * Fetch users for goal for collaboration
         */
        this.router.get('/:goalId', [IsLoggedIn], this.collaborationController.fetchUsersForGoalNew);
    }
}
