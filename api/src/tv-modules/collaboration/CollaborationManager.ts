import type { AppUser } from '../../core/AppUser';
import { GoalPermissions } from '../../types/auth.types';
import { CollaborationRepository } from './CollaborationRepository';
import type {
    CollaborationArgAddUser,
    CollaborationArgDeleteUser,
    CollaborationArgToggleUserRoles,
    CollaborationUserWithRoles,
} from './collaboration.server.types';
import type {
    AddUserArg,
    CollaborationUserInDb,
    DeleteUserArg,
    FetchGoalUsersArg,
    ToggleUserRolesArg,
} from './collaboration.types';

export class CollaborationManager {
    private readonly user: AppUser;
    public readonly repository: CollaborationRepository;

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new CollaborationRepository();
    }

    async fetchAllUsers(): Promise<CollaborationUserWithRoles[] | false> {
        const sharedGoals = await this.user.goalsManager.fetchSharedGoals();

        const goalIds = sharedGoals
            .filter((g) => g.hasPermissions(GoalPermissions.TASKS_CAN_WATCH_ASSIGNED_USERS))
            .map((g) => g.id);

        const ownGoals = await this.user.goalsManager.fetchAllOwnGoalsIds();

        goalIds.push(...ownGoals);

        if (goalIds.length === 0) {
            return [];
        }

        const users = await this.repository.fetchAllUsers(goalIds);

        if (!users) {
            return false;
        }

        const resultMap: Record<string, CollaborationUserWithRoles> = {};

        users.forEach((item) => {
            if (!resultMap[item.id]) {
                resultMap[item.id] = {
                    id: item.id,
                    email: item.email,
                    goal_id: item.goal_id,
                    goalId: item.goal_id,
                    invitation_date: item.invitation_date,
                    invitationDate: item.invitation_date,
                    roles: [],
                    goalOwner: false,
                };
            }

            if (item.role_id) {
                resultMap[item.id].roles.push(item.role_id);
            }
        });

        return Object.values(resultMap);
    }

    async fetchUsersForGoal(args: FetchGoalUsersArg): Promise<CollaborationUserWithRoles[] | false> {
        const users = await this.repository.fetchUsersForGoal(args.goalId);

        if (!users) {
            return false;
        }

        const ownerEmail = await this.repository.fetchGoalOwnerEmail(args.goalId);

        const resultMap: Record<string, CollaborationUserWithRoles> = {};

        users.forEach((item) => {
            if (!resultMap[item.id]) {
                resultMap[item.id] = {
                    id: item.id,
                    email: item.email,
                    goal_id: item.goal_id,
                    goalId: item.goal_id,
                    // @ts-expect-error
                    invitation_date: item.invitation_date,
                    invitationDate: item.invitation_date,
                    roles: [],
                    goalOwner: item.email === ownerEmail,
                };
            }

            if (item.role_id) {
                resultMap[item.id].roles.push(item.role_id);
            }
        });

        return Object.values(resultMap);
    }

    async toggleUserRoles(args: ToggleUserRolesArg): Promise<number[] | false> {
        return await this.repository.updateUserRoles(args.userId, args.roles);
    }

    async addUser(args: AddUserArg): Promise<CollaborationUserInDb | false> {
        const userId = await this.repository.addUserForCollaboration(args.goalId, args.email);
        if (!userId) {
            return false;
        }

        return await this.repository.fetchRecordById(userId);
    }

    async deleteUser(args: DeleteUserArg) {
        return await this.repository.deleteUser(args);
    }

    async addUserNew(args: CollaborationArgAddUser): Promise<CollaborationUserWithRoles | null> {
        const user = await this.repository.addUserForCollaborationNew(args);
        if (!user) return null;

        return {
            ...user,
            goalId: args.goalId,
            goal_id: args.goalId,
            invitation_date: user.invitationDate,
            roles: [],
            goalOwner: false,
        };
    }

    async deleteUserNew(args: CollaborationArgDeleteUser) {
        return await this.repository.deleteUserNew(args);
    }

    async toggleUserRolesNew(args: CollaborationArgToggleUserRoles): Promise<number[]> {
        return await this.repository.toggleUserRolesNew(args);
    }

    async fetchAllUsersNew(): Promise<CollaborationUserWithRoles[]> {
        
        const sharedGoals = await this.user.goalsManager.fetchSharedGoals();

        const goalIds = sharedGoals
            .filter((g) => g.hasPermissions(GoalPermissions.TASKS_CAN_WATCH_ASSIGNED_USERS))
            .map((g) => g.id);

        const ownGoals = await this.user.goalsManager.fetchAllOwnGoalsIds();

        goalIds.push(...ownGoals);

        if (goalIds.length === 0) {
            return [];
        }

        const users = await this.repository.fetchAllUsersNew(goalIds);

        if (!users) {
            return [];
        }

        
        const resultMap: Record<string, CollaborationUserWithRoles> = {};

        users.forEach((item) => {
            if (!resultMap[item.id]) {
                resultMap[item.id] = {
                    id: item.id,
                    email: item.email,
                    goal_id: item.goalId,
                    goalId: item.goalId,
                    invitation_date: item.invitationDate,
                    invitationDate: item.invitationDate,
                    roles: [],
                    goalOwner: false,
                };
            }

            if (item.roleId) {
                resultMap[item.id].roles.push(item.roleId);
            }
        });

        return Object.values(resultMap);
    }

    async fetchUsersForGoalNew(goalId: number): Promise<CollaborationUserWithRoles[]> {
        const users = await this.repository.fetchUsersForGoalNew(goalId);
        const ownerEmail = await this.repository.fetchGoalOwnerEmail(goalId);

        if (!users) {
            return [];
        }

        
        const resultMap: Record<string, CollaborationUserWithRoles> = {};

        users.forEach((item) => {
            if (!resultMap[item.id]) {
                resultMap[item.id] = {
                    id: item.id,
                    email: item.email,
                    goal_id: item.goalId,
                    goalId: item.goalId,
                    invitation_date: item.invitationDate,
                    invitationDate: item.invitationDate,
                    roles: [],
                    goalOwner: item.email === ownerEmail,
                };
            }

            if (item.roleId) {
                resultMap[item.id].roles.push(item.roleId);
            }
        });

        return Object.values(resultMap);
    }
}
